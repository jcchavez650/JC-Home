import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import db from '../database.js';

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = process.env.UPLOADS_DIR || join(__dirname, '..', 'uploads');

// Validate/normalize an array of items coming from the AI or the client
function sanitizeItems(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      name: typeof item.name === 'string' ? item.name.trim().slice(0, 200) : null,
      quantity: Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 9999
        ? item.quantity : 1,
      notes: typeof item.notes === 'string' ? item.notes.trim().slice(0, 1000) : null,
    }))
    .filter(item => item.name);
}

// Analyze a photo and RETURN the detected items WITHOUT saving them.
// The user reviews/removes items in the UI, then calls /confirm to persist.
router.post('/:toteId', async (req, res) => {
  // Everything is wrapped so the handler ALWAYS responds with JSON — a thrown
  // error here (file read, SDK) would otherwise hang until a gateway timeout,
  // which the browser reports as an opaque "Unknown" error.
  try {
    const { toteId } = req.params;

    const tote = db.prepare('SELECT id FROM totes WHERE id = ?').get(toteId);
    if (!tote) return res.status(404).json({ error: 'Tote not found' });

    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI is not configured — set ANTHROPIC_API_KEY on the server' });

    const client = new Anthropic({ apiKey });
    const imageBuffer = readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    const mediaType = req.file.mimetype || 'image/jpeg';

    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
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

    const aiResponse = message.content[0].text;
    let items = [];
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) items = sanitizeItems(JSON.parse(jsonMatch[0]));

    // Return detected items + the stored photo filename; nothing is saved yet.
    return res.json({ items, photo_filename: req.file.filename });
  } catch (err) {
    console.error('AI analysis error:', err?.status, err?.name, err?.message);
    let msg = 'AI analysis failed — please try again';
    if (err?.status === 401) msg = 'AI request rejected — the ANTHROPIC_API_KEY is invalid or revoked';
    else if (err?.status === 403) msg = 'AI request forbidden — check the API key permissions';
    else if (err?.status === 404) msg = 'AI model unavailable — check the configured model name';
    else if (err?.status === 429) msg = 'AI is rate-limited or out of credit — try again shortly';
    else if (err?.status >= 500) msg = 'AI service is temporarily unavailable — try again shortly';
    else if (err?.status === 400) msg = 'AI could not read this image — it may be too large or an unsupported format';
    else if (err?.message) msg = `AI analysis failed: ${String(err.message).slice(0, 120)}`;
    return res.status(502).json({ error: msg });
  }
});

// Save the (possibly edited) items the user confirmed from a scan.
router.post('/:toteId/confirm', (req, res) => {
  try {
    const { toteId } = req.params;

    const tote = db.prepare('SELECT id FROM totes WHERE id = ?').get(toteId);
    if (!tote) return res.status(404).json({ error: 'Tote not found' });

    const items = sanitizeItems(req.body.items);

    // Record the scan photo if the filename is real (basename guards traversal)
    if (typeof req.body.photo_filename === 'string' && req.body.photo_filename) {
      const safe = basename(req.body.photo_filename);
      if (existsSync(join(uploadsDir, safe))) {
        db.prepare('INSERT INTO photos (id, tote_id, filename, ai_raw_response) VALUES (?, ?, ?, ?)')
          .run(uuidv4(), toteId, safe, null);
      }
    }

    const existingItems = db.prepare('SELECT * FROM items WHERE tote_id = ?').all(toteId);
    const insertItem = db.prepare('INSERT INTO items (id, tote_id, name, quantity, notes) VALUES (?, ?, ?, ?, ?)');
    const updateQty = db.prepare('UPDATE items SET quantity = quantity + ? WHERE id = ?');

    const insertMany = db.transaction((list) => {
      for (const item of list) {
        const existing = existingItems.find(e =>
          e.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        );
        if (existing) {
          updateQty.run(item.quantity || 1, existing.id);
        } else {
          insertItem.run(uuidv4(), toteId, item.name, item.quantity || 1, item.notes || null);
        }
      }
    });

    insertMany(items);
    db.prepare("UPDATE totes SET updated_at = datetime('now') WHERE id = ?").run(toteId);

    const updatedItems = db.prepare('SELECT * FROM items WHERE tote_id = ? ORDER BY name').all(toteId);
    return res.json({ items_added: items.length, items: updatedItems });
  } catch (err) {
    console.error('Confirm scan error:', err?.message);
    return res.status(500).json({ error: 'Could not save the items' });
  }
});

export default router;
