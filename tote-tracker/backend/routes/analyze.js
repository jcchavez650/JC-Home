import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import db from '../database.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '..', 'uploads');

router.post('/:toteId', async (req, res) => {
  const { toteId } = req.params;

  const tote = db.prepare('SELECT * FROM totes WHERE id = ?').get(toteId);
  if (!tote) return res.status(404).json({ error: 'Tote not found' });

  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const client = new Anthropic({ apiKey });
  const imageBuffer = readFileSync(req.file.path);
  const base64Image = imageBuffer.toString('base64');
  const mediaType = req.file.mimetype || 'image/jpeg';

  let aiResponse;
  let parsedItems = [];

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            {
              type: 'text',
              text: `You are analyzing the contents of a storage tote/bin. List every item you can see in the image.

Return ONLY a JSON array of objects with this exact format (no other text):
[
  { "name": "item name", "quantity": 1, "notes": "optional details like color, size, brand" },
  ...
]

Be specific and descriptive. If you see multiple of the same item, use the quantity field. If you cannot identify an item clearly, describe what you see.`,
            },
          ],
        },
      ],
    });

    aiResponse = message.content[0].text;

    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      parsedItems = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    return res.status(500).json({ error: 'AI analysis failed', details: err.message });
  }

  const photoId = uuidv4();
  db.prepare(`
    INSERT INTO photos (id, tote_id, filename, ai_raw_response) VALUES (?, ?, ?, ?)
  `).run(photoId, toteId, req.file.filename, aiResponse);

  const insertItem = db.prepare(`
    INSERT INTO items (id, tote_id, name, quantity, notes) VALUES (?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insertItem.run(uuidv4(), toteId, item.name, item.quantity || 1, item.notes || null);
    }
  });

  insertMany(parsedItems);

  db.prepare(`UPDATE totes SET updated_at = datetime('now') WHERE id = ?`).run(toteId);

  const updatedItems = db.prepare('SELECT * FROM items WHERE tote_id = ? ORDER BY name').all(toteId);
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(photoId);

  res.json({
    photo,
    items_added: parsedItems.length,
    items: updatedItems,
  });
});

export default router;
