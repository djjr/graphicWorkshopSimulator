import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
// Serve static files from a "public" folder
app.use(express.static(path.join(__dirname, "public")));



app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Example static data for your POC: workshop + characters ---

// You can move these into separate files later:
const WORKSHOP_PLAN = [
  {
    id: "intro",
    title: "Welcome and framing",
    goal: "Set norms, explain purpose, and surface expectations.",
  },
  {
    id: "risk_brainstorm",
    title: "Brainstorm AI risks",
    goal: "Generate a diverse list of AI risks without judging them yet.",
  },
  {
    id: "alignment_debate",
    title: "Debate alignment strategies",
    goal: "Contrast different approaches to AI alignment and safety.",
  },
];

// Simple health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/**
 * POST /api/next-turn
 *
 * Expects JSON body like:
 * {
 *   "phaseId": "risk_brainstorm",
 *   "characters": [...],
 *   "recentDialogue": [...],
 *   "playerCharacterName": "You", // or null
 *   "maxNewBubbles": 3
 * }
 */
app.post("/api/next-turn", async (req, res) => {
  try {
    const {
      phaseId,
      characters,
      recentDialogue,
      playerCharacterName,
      maxNewBubbles = 3,
    } = req.body;

    const phase =
      WORKSHOP_PLAN.find((p) => p.id === phaseId) ?? WORKSHOP_PLAN[0];

    // 1. Describe the characters
    const characterDescriptions = (characters || [])
      .map((c) => {
        return `- ${c.name} (${c.role}): AI safety orientation: ${
          c.ai_safety_orientation || "n/a"
        }; personality: ${c.personality || "n/a"}; speech style: ${
          c.speech_style || "n/a"
        }.`;
      })
      .join("\n");

    // 2. Turn recent dialogue into a transcript
    const transcript = (recentDialogue || [])
      .map((d) => `${d.speaker}: ${d.text}`)
      .join("\n");

    // 3. Build prompts
    const systemPrompt = `
You are simulating a live AI safety workshop as a graphic novel script.

Rules:
- The scene features a facilitator and several participants.
- Always stay in character, using each character's described personality and stance.
- The facilitator should gently steer toward the current workshop phase goal:
  "${phase.goal}".
- Keep each line short and natural, sized for a single comic speech bubble.
- Do NOT generate dialogue for the player character ${
      playerCharacterName
        ? `named "${playerCharacterName}".`
        : "(there is currently no player character in this scene)."
    }
- Do NOT include narration or panel descriptions.
- Only generate in-character dialogue plus a brief action note per line if relevant.
- Output MUST be valid JSON with this exact shape:

{
  "turns": [
    {
      "speaker": "Name of character",
      "utterance": "What they say, one speech bubble worth",
      "emotion": "brief emotion label (e.g., calm, concerned, excited)",
      "action": "optional short action description, or null"
    }
  ]
}

- Provide between 1 and ${maxNewBubbles} new turns.
`;

    const userPrompt = `
WORKSHOP PHASE:
- ID: ${phase.id}
- Title: ${phase.title}
- Goal: ${phase.goal}

CHARACTERS:
${characterDescriptions || "(none provided)"}

RECENT DIALOGUE:
${transcript || "(no dialogue yet)"}

Now continue the conversation with 1-${maxNewBubbles} short speech turns that naturally follow.
`;

    // 4. Call OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini", // or "gpt-4.1" if you want more oomph
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 400,
    });

    const rawContent = completion.choices[0]?.message?.content;

    // 5. Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      console.error("Model JSON parse error:", e, rawContent);
      return res.status(502).json({
        error: "Model returned invalid JSON.",
        rawContent,
      });
    }

    let turns = Array.isArray(parsed.turns) ? parsed.turns : [];

    // 6. Enforce “don’t speak as the player character”
    if (playerCharacterName) {
      turns = turns.filter((t) => t.speaker !== playerCharacterName);
    }

    // 7. Normalize and return
    const sanitized = turns.map((t) => ({
      speaker: String(t.speaker || "").trim(),
      utterance: String(t.utterance || "").trim(),
      emotion: t.emotion ? String(t.emotion).trim() : null,
      action: t.action ? String(t.action).trim() : null,
    }));

    res.json({ turns: sanitized });
  } catch (err) {
    console.error("Error in /api/next-turn:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Workshop story engine listening on port ${PORT}`);
});
