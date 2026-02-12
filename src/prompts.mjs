export function buildTransitionMessages(session, activity) {
  const workshop = session.getWorkshop();
  const facilitator = workshop.facilitator;
  const recentDialogue = session.getRecentDialogue(20);

  const transcript = recentDialogue
    .filter((d) => d.type !== "directive")
    .map((d) => `${d.speaker}: ${d.text}`)
    .join("\n");

  let activityDescription = "";
  if (activity.type === "prompt") {
    activityDescription = `The next activity is a discussion prompt with this focus: "${activity.goal}"`;
  } else if (activity.type === "madlib") {
    activityDescription = `The next activity is a structured fill-in exercise. Template: "${activity.template}" with blanks: ${activity.blanks.map((b) => `"${b}"`).join(", ")}`;
  }

  const system = `You are ${facilitator.name}, a workshop facilitator. Personality: ${facilitator.personality}. Speech style: ${facilitator.speech_style}.

You need to transition the group to the next activity. Write a single short facilitator statement (1-3 sentences) that:
1. Briefly acknowledges or summarizes what the group just discussed (if there's prior dialogue)
2. Naturally introduces the next activity

Guidance for what to introduce (paraphrase naturally, don't read it verbatim): "${activity.facilitator_says}"

Output valid JSON: {"transition": "Your facilitator statement here"}`;

  const user = `RECENT DIALOGUE:
${transcript || "(conversation just started)"}

${activityDescription}

Write the facilitator's transition statement.`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function buildMessages(session, { maxNewTurns = 3 } = {}) {
  const workshop = session.getWorkshop();
  const phase = session.getCurrentPhase();
  const activity = session.getCurrentActivity();
  const directives = session.getDirectives();
  const recentDialogue = session.getRecentDialogue(30);

  // Build character descriptions
  const facilitator = workshop.facilitator;
  const facilitatorDesc = `- ${facilitator.name} (Facilitator): personality: ${facilitator.personality}; speech style: ${facilitator.speech_style}.`;

  const participantDescs = workshop.participants
    .map(
      (p) =>
        `- ${p.name} (${p.role}): stance on topic: ${p.stance || "n/a"}; personality: ${p.personality || "n/a"}; speech style: ${p.speech_style || "n/a"}.`
    )
    .join("\n");

  // Build directives block
  let directiveBlock = "";
  if (directives.length > 0) {
    directiveBlock = `\n\nACTIVE DIRECTIVES FROM THE SESSION DIRECTOR:\n${directives.map((d, i) => `${i + 1}. ${d}`).join("\n")}\nYou MUST follow these directives. They take priority over default behavior.\n`;
  }

  // Build transcript
  const transcript = recentDialogue
    .filter((d) => d.type !== "directive")
    .map((d) => `${d.speaker}: ${d.text}`)
    .join("\n");

  const system = `You are simulating a live workshop titled "${workshop.title}" on the topic: "${workshop.topic}".

CHARACTERS:
${facilitatorDesc}
${participantDescs}

RULES:
- Stay in character. Each character must reflect their described personality, stance, and speech style.
- The facilitator should guide the discussion toward the current phase goal.
- Keep each line short and natural — sized for a single speech bubble in a graphic novel.
- Generate dialogue for BOTH the facilitator and participants as appropriate.
- Do NOT include narration or panel descriptions.
- Only generate in-character dialogue plus a brief action note per line if relevant.
- If the current phase goal has been substantially addressed and it feels like a natural transition point, set "phaseComplete" to true. Otherwise set it to false.
- Output MUST be valid JSON with this exact shape:

{
  "turns": [
    {
      "speaker": "Name of character",
      "utterance": "What they say, one speech bubble worth",
      "emotion": "brief emotion label (e.g., calm, concerned, excited)",
      "action": "optional short action description, or null"
    }
  ],
  "phaseComplete": false
}

- If the current activity is a "madlib" type, ALSO include a "madlibFills" object in your JSON response mapping each blank label to a proposed fill based on the discussion. Example: {"madlibFills": {"blank_label": "proposed fill"}}.
- Provide between 1 and ${maxNewTurns} new turns.${directiveBlock}`;

  // Build activity context
  let activityBlock = "";
  if (activity) {
    if (activity.type === "prompt") {
      activityBlock = `\nCURRENT ACTIVITY (prompt):
- Focus: ${activity.goal}
The facilitator has just directed discussion toward this focus. Guide the conversation to explore it specifically, while keeping the overall phase goal in mind.`;
    } else if (activity.type === "madlib") {
      activityBlock = `\nCURRENT ACTIVITY (madlib — structured fill-in):
- Template: "${activity.template}"
- Blanks to fill: ${activity.blanks.map((b) => `"${b}"`).join(", ")}
The facilitator has asked participants to discuss and propose fills for this template. Have them debate what should go in each blank. Include a "madlibFills" object in your JSON response mapping each blank label to the group's current best proposed fill.`;
    }
  }

  const user = `CURRENT WORKSHOP PHASE:
- Title: ${phase.title}
- Goal: ${phase.goal}
${activityBlock}
RECENT DIALOGUE:
${transcript || "(no dialogue yet)"}

Now continue the conversation with 1-${maxNewTurns} short speech turns that naturally follow.`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
