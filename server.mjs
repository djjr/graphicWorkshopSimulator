import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { readdirSync } from "fs";

import { Session } from "./src/session.mjs";
import { chatCompletion, MODEL_OPTIONS, getActiveModel, setModel } from "./src/llm.mjs";
import { buildMessages } from "./src/prompts.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// --- Single session (no multi-user for now) ---
const session = new Session();

// Load default workshop on startup
const defaultWorkshop =
  process.env.WORKSHOP || path.join(__dirname, "workshops", "ai-safety.json");
session.loadWorkshop(defaultWorkshop);
console.log(`Loaded workshop: ${session.getWorkshop().title}`);

// --- Routes ---

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Model selection
app.get("/api/models", (_req, res) => {
  const available = {
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  };
  const models = MODEL_OPTIONS.map((m) => ({
    ...m,
    available: available[m.provider],
  }));
  res.json({ models, active: getActiveModel() });
});

app.post("/api/model", (req, res) => {
  const { modelId } = req.body;
  const result = setModel(modelId);
  if (!result) {
    return res.status(400).json({ error: "Unknown model", available: MODEL_OPTIONS });
  }
  console.log(`Model switched to: ${result.label} (${result.id})`);
  res.json({ active: result });
});

// Return current session state
app.get("/api/workshop", (_req, res) => {
  res.json(session.getState());
});

// List available workshop configs
app.get("/api/workshops", (_req, res) => {
  const dir = path.join(__dirname, "workshops");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  res.json({ workshops: files });
});

// Load a different workshop
app.post("/api/load-workshop", (req, res) => {
  const { filename } = req.body;
  if (!filename) return res.status(400).json({ error: "filename required" });

  const configPath = path.join(__dirname, "workshops", path.basename(filename));
  try {
    session.loadWorkshop(configPath);
    res.json(session.getState());
  } catch (err) {
    console.error("Failed to load workshop:", err);
    res.status(400).json({ error: "Failed to load workshop config" });
  }
});

// Generate next dialogue turns
app.post("/api/next-turn", async (req, res) => {
  try {
    const { playerText, facilitatorText, maxNewTurns = 3 } = req.body;

    // If user typed as a participant (player input)
    if (playerText) {
      session.addDialogue({
        speaker: "You",
        text: playerText,
        type: "player",
      });
    }

    // If user injected a facilitator line directly
    if (facilitatorText) {
      session.addDialogue({
        speaker: session.getWorkshop().facilitator.name,
        text: facilitatorText,
        type: "facilitator",
      });
    }

    // Build prompts and call LLM
    const messages = buildMessages(session, { maxNewTurns });
    const rawContent = await chatCompletion(messages, {
      temperature: 0.8,
      maxTokens: 600,
      json: true,
    });

    // Parse response
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      console.error("LLM JSON parse error:", e, rawContent);
      return res.status(502).json({ error: "LLM returned invalid JSON.", rawContent });
    }

    let turns = Array.isArray(parsed.turns) ? parsed.turns : [];

    // Normalize turns
    const sanitized = turns.map((t) => ({
      speaker: String(t.speaker || "").trim(),
      utterance: String(t.utterance || "").trim(),
      emotion: t.emotion ? String(t.emotion).trim() : null,
      action: t.action ? String(t.action).trim() : null,
    }));

    // Add to session dialogue
    for (const t of sanitized) {
      const isFacilitator =
        t.speaker === session.getWorkshop().facilitator.name;
      session.addDialogue({
        speaker: t.speaker,
        text: t.utterance,
        type: isFacilitator ? "facilitator" : "participant",
        meta: [t.emotion, t.action].filter(Boolean).join(" · ") || null,
      });
    }

    // Check if LLM signaled phase completion
    let phaseAdvanced = false;
    if (parsed.phaseComplete) {
      const nextPhase = session.advancePhase();
      if (nextPhase) phaseAdvanced = true;
    }

    res.json({
      turns: sanitized,
      currentPhase: session.getCurrentPhase(),
      currentPhaseIndex: session.getCurrentPhaseIndex(),
      currentActivityIndex: session.getState().currentActivityIndex,
      currentActivity: session.getCurrentActivity(),
      madlibFills: parsed.madlibFills || null,
      phaseAdvanced,
      dialogue: session.getDialogue(),
    });
  } catch (err) {
    console.error("Error in /api/next-turn:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add a god-mode directive
app.post("/api/directive", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });
  session.addDirective(text);
  res.json({ directives: session.getDirectives() });
});

// Remove a specific directive
app.delete("/api/directive/:index", (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index)) return res.status(400).json({ error: "invalid index" });
  session.removeDirective(index);
  res.json({ directives: session.getDirectives() });
});

// Clear all directives
app.post("/api/clear-directives", (_req, res) => {
  session.clearDirectives();
  res.json({ directives: [] });
});

// Advance to next activity within current phase
app.post("/api/advance-activity", (_req, res) => {
  const activity = session.advanceActivity();
  if (!activity) {
    return res.json({
      advanced: false,
      message: "No more activities in this phase.",
      currentActivityIndex: session.getState().currentActivityIndex,
      currentActivity: null,
      dialogue: session.getDialogue(),
    });
  }
  res.json({
    advanced: true,
    currentActivity: activity,
    currentActivityIndex: session.getState().currentActivityIndex,
    dialogue: session.getDialogue(),
  });
});

// Force phase advance
app.post("/api/advance-phase", (_req, res) => {
  const phase = session.advancePhase();
  if (!phase) {
    return res.json({
      advanced: false,
      message: "Already at the last phase.",
      currentPhase: session.getCurrentPhase(),
      currentPhaseIndex: session.getCurrentPhaseIndex(),
      dialogue: session.getDialogue(),
    });
  }
  res.json({
    advanced: true,
    currentPhase: phase,
    currentPhaseIndex: session.getCurrentPhaseIndex(),
    dialogue: session.getDialogue(),
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Workshop simulator listening on port ${PORT}`);
});
