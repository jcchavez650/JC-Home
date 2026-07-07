import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { identifyFood, estimateCarbs } from "./claude.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "client", "dist");

const app = express();
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY) });
});

app.post("/api/identify", async (req, res) => {
  try {
    const { imageBase64, mediaType, description, weightGrams } = req.body || {};
    if (!imageBase64 && !description) {
      return res.status(400).json({ error: "Provide a photo or a description/weight." });
    }
    const result = await identifyFood({ imageBase64, mediaType, description, weightGrams });
    res.json(result);
  } catch (err) {
    console.error("identify error:", err);
    res.status(500).json({ error: err.message || "Failed to identify food." });
  }
});

app.post("/api/estimate", async (req, res) => {
  try {
    const { imageBase64, mediaType, description, weightGrams, foodGuess, answers } = req.body || {};
    if (!imageBase64 && !description) {
      return res.status(400).json({ error: "Provide a photo or a description/weight." });
    }
    const result = await estimateCarbs({
      imageBase64,
      mediaType,
      description,
      weightGrams,
      foodGuess,
      answers,
    });
    res.json(result);
  } catch (err) {
    console.error("estimate error:", err);
    res.status(500).json({ error: err.message || "Failed to estimate nutrition." });
  }
});

app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Carb counter server listening on port ${port}`);
});
