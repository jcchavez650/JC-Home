import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";

let client;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const IDENTIFY_TOOL = {
  name: "ask_clarifying_questions",
  description:
    "Record the identified food and up to 5 targeted clarifying questions needed to accurately estimate its carbohydrate content.",
  input_schema: {
    type: "object",
    properties: {
      food_guess: {
        type: "string",
        description: "Best guess at the name of the food or dish shown/described.",
      },
      questions: {
        type: "array",
        maxItems: 5,
        description:
          "Up to 5 questions, ordered by how much they'd improve estimate accuracy. Omit questions that don't apply to this food. Prefer 'choice' with concrete options over open 'text' when possible.",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Short stable slug, e.g. 'cooking_method'." },
            question: { type: "string" },
            type: { type: "string", enum: ["choice", "text"] },
            options: {
              type: "array",
              items: { type: "string" },
              description: "Only for type 'choice'. 2-5 concrete options.",
            },
          },
          required: ["id", "question", "type"],
        },
      },
    },
    required: ["food_guess", "questions"],
  },
};

const ESTIMATE_TOOL = {
  name: "record_nutrition_estimate",
  description:
    "Record the final nutrition estimate for the food item after considering the photo/weight and the user's answers.",
  input_schema: {
    type: "object",
    properties: {
      food_name: { type: "string" },
      serving_weight_g: { type: "number" },
      calories_kcal: { type: "number" },
      total_carbs_g: { type: "number" },
      fiber_g: { type: "number" },
      sugar_g: { type: "number" },
      net_carbs_g: { type: "number", description: "total_carbs_g minus fiber_g." },
      protein_g: { type: "number" },
      fat_g: { type: "number" },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      notes: {
        type: "string",
        description: "One short sentence on key assumptions made (e.g. portion size guessed).",
      },
    },
    required: [
      "food_name",
      "serving_weight_g",
      "calories_kcal",
      "total_carbs_g",
      "fiber_g",
      "sugar_g",
      "net_carbs_g",
      "protein_g",
      "fat_g",
      "confidence",
    ],
  },
};

const SYSTEM_PROMPT = `You are a meticulous nutrition estimation assistant embedded in a carb-counting app.
You reason like a registered dietitian using USDA-style nutrition knowledge.
Always account for how cooking method, added fats/sauces, and portion size change carb content.
Be concise. Never respond in prose — always respond by calling the provided tool.`;

function extractToolInput(message, toolName) {
  const block = message.content.find(
    (b) => b.type === "tool_use" && b.name === toolName
  );
  if (!block) {
    throw new Error(`Claude did not call the expected tool (${toolName})`);
  }
  return block.input;
}

function buildInputContent({ imageBase64, mediaType, description, weightGrams }) {
  const content = [];
  if (imageBase64) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 },
    });
  }
  const textParts = [];
  if (description) textParts.push(`Description: ${description}`);
  if (weightGrams) textParts.push(`Weight: ${weightGrams} grams`);
  content.push({
    type: "text",
    text: textParts.length ? textParts.join("\n") : "See attached photo.",
  });
  return content;
}

export async function identifyFood({ imageBase64, mediaType, description, weightGrams }) {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [IDENTIFY_TOOL],
    tool_choice: { type: "tool", name: IDENTIFY_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          ...buildInputContent({ imageBase64, mediaType, description, weightGrams }),
          {
            type: "text",
            text: "Identify this food and ask up to 5 clarifying questions that would most improve the accuracy of a carbohydrate estimate. Skip questions already answered by the description/weight given.",
          },
        ],
      },
    ],
  });
  return extractToolInput(message, IDENTIFY_TOOL.name);
}

export async function estimateCarbs({
  imageBase64,
  mediaType,
  description,
  weightGrams,
  foodGuess,
  answers,
}) {
  const anthropic = getClient();
  const answersText = (answers || [])
    .filter((a) => a.answer && String(a.answer).trim().length)
    .map((a) => `- ${a.question}: ${a.answer}`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [ESTIMATE_TOOL],
    tool_choice: { type: "tool", name: ESTIMATE_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          ...buildInputContent({ imageBase64, mediaType, description, weightGrams }),
          {
            type: "text",
            text: [
              `Initial food guess: ${foodGuess || "unknown"}`,
              answersText ? `Additional details from the user:\n${answersText}` : "No additional details provided.",
              "Using everything above, produce the most accurate possible nutrition estimate for the full serving shown/described.",
            ].join("\n\n"),
          },
        ],
      },
    ],
  });
  return extractToolInput(message, ESTIMATE_TOOL.name);
}
