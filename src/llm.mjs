import OpenAI from "openai";

let openaiClient = null;
let anthropicClient = null;

// Runtime-overridable model selection
let runtimeModel = null;  // null means "use env/default"

export const MODEL_OPTIONS = [
  { id: "gpt-4.1-mini",                 label: "GPT-4.1 Mini (cheap)",     provider: "openai" },
  { id: "gpt-4.1",                      label: "GPT-4.1 (expensive)",      provider: "openai" },
  { id: "claude-haiku-4-5-20251001",    label: "Haiku 4.5 (cheap)",        provider: "anthropic" },
  { id: "claude-sonnet-4-5-20250929",   label: "Sonnet 4.5 (mid)",         provider: "anthropic" },
];

export function setModel(modelId) {
  const match = MODEL_OPTIONS.find((m) => m.id === modelId);
  if (!match) return null;
  runtimeModel = match;
  return match;
}

export function getActiveModel() {
  if (runtimeModel) return runtimeModel;
  const provider = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  if (provider === "anthropic") {
    const id = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
    return MODEL_OPTIONS.find((m) => m.id === id) || { id, label: id, provider: "anthropic" };
  }
  const id = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  return MODEL_OPTIONS.find((m) => m.id === id) || { id, label: id, provider: "openai" };
}

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

async function getAnthropicClient() {
  if (!anthropicClient) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

async function openaiCompletion(messages, { temperature, maxTokens, json, model }) {
  const client = getOpenAIClient();
  const completion = await client.chat.completions.create({
    model: model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  });
  return completion.choices[0]?.message?.content || "";
}

async function anthropicCompletion(messages, { temperature, maxTokens, json, model }) {
  const client = await getAnthropicClient();

  // Separate system message from the rest
  const systemMsg = messages.find((m) => m.role === "system");
  const otherMsgs = messages.filter((m) => m.role !== "system");

  // Map to Anthropic format
  const anthropicMessages = otherMsgs.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  // If requesting JSON, add a prefill hint
  if (json) {
    anthropicMessages.push({ role: "assistant", content: "{" });
  }

  const response = await client.messages.create({
    model: model || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
    max_tokens: maxTokens || 1024,
    temperature,
    ...(systemMsg ? { system: systemMsg.content } : {}),
    messages: anthropicMessages,
  });

  let text = response.content[0]?.text || "";

  // If we prefilled with "{", prepend it back
  if (json) {
    text = "{" + text;
  }

  return text;
}

export async function chatCompletion(
  messages,
  { temperature = 0.8, maxTokens = 600, json = false } = {}
) {
  const active = getActiveModel();
  const opts = { temperature, maxTokens, json, model: active.id };

  if (active.provider === "anthropic") {
    return anthropicCompletion(messages, opts);
  }
  return openaiCompletion(messages, opts);
}
