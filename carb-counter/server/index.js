import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { identifyFood, estimateCarbs } from "./claude.js";
import { initDb } from "./db.js";
import { signup, login, me, requireAuth } from "./auth.js";
import { createEntry, listEntries, deleteEntry, report } from "./entries.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "client", "dist");

const app = express();
app.use(express.json({ limit: "10mb" }));

// Wrap async handlers so rejected promises become 500s instead of crashing.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY) });
});

// --- Auth ---
app.post("/api/auth/signup", wrap(signup));
app.post("/api/auth/login", wrap(login));
app.get("/api/auth/me", requireAuth, me);

// --- Entries + report (all require auth) ---
app.post("/api/entries", requireAuth, wrap(createEntry));
app.get("/api/entries", requireAuth, wrap(listEntries));
app.delete("/api/entries/:id", requireAuth, wrap(deleteEntry));
app.get("/api/report", requireAuth, wrap(report));

// --- AI estimation ---
app.post("/api/identify", wrap(async (req, res) => {
  const { imageBase64, mediaType, description, weightGrams } = req.body || {};
  if (!imageBase64 && !description) {
    return res.status(400).json({ error: "Provide a photo or a description/weight." });
  }
  const result = await identifyFood({ imageBase64, mediaType, description, weightGrams });
  res.json(result);
}));

app.post("/api/estimate", wrap(async (req, res) => {
  const { imageBase64, mediaType, description, weightGrams, foodGuess, answers } = req.body || {};
  if (!imageBase64 && !description) {
    return res.status(400).json({ error: "Provide a photo or a description/weight." });
  }
  const result = await estimateCarbs({ imageBase64, mediaType, description, weightGrams, foodGuess, answers });
  res.json(result);
}));

// Static frontend + SPA fallback.
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// Central error handler.
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal server error." });
});

const port = process.env.PORT || 3001;

initDb()
  .catch((err) => console.error("Database init failed (continuing to start):", err.message))
  .finally(() => {
    app.listen(port, () => console.log(`Carb counter server listening on port ${port}`));
  });
