const logEl = document.getElementById("log");
const phaseLabel = document.getElementById("phase-label");
const workshopTitle = document.getElementById("workshop-title");
const workshopSelect = document.getElementById("workshop-select");
const playerInput = document.getElementById("player-input");
const nextBtn = document.getElementById("next-btn");
const directiveInput = document.getElementById("directive-input");
const addDirectiveBtn = document.getElementById("add-directive-btn");
const clearDirectivesBtn = document.getElementById("clear-directives-btn");
const directivesList = document.getElementById("directives-list");
const facilitatorInput = document.getElementById("facilitator-input");
const facilitatorSendBtn = document.getElementById("facilitator-send-btn");
const phaseList = document.getElementById("phase-list");
const activityInfo = document.getElementById("activity-info");
const advanceActivityBtn = document.getElementById("advance-activity-btn");
const advancePhaseBtn = document.getElementById("advance-phase-btn");
const exportBtn = document.getElementById("export-btn");

let state = {
  workshop: null,
  dialogue: [],
  directives: [],
  currentPhaseIndex: 0,
  currentActivityIndex: -1,
};

// --- Rendering ---

function renderDialogue() {
  logEl.innerHTML = "";
  for (const d of state.dialogue) {
    const div = document.createElement("div");
    div.className = `line type-${d.type || "participant"}`;

    if (d.type === "system") {
      div.textContent = d.text;
    } else {
      const speaker = document.createElement("span");
      speaker.className = "speaker";
      speaker.textContent = `${d.speaker}: `;
      div.appendChild(speaker);

      const text = document.createElement("span");
      text.textContent = d.text;
      div.appendChild(text);

      if (d.meta) {
        const meta = document.createElement("span");
        meta.className = "meta";
        meta.textContent = ` (${d.meta})`;
        div.appendChild(meta);
      }
    }

    logEl.appendChild(div);
  }
  logEl.scrollTop = logEl.scrollHeight;
}

function renderPhaseLabel() {
  const phase = state.workshop?.phases?.[state.currentPhaseIndex];
  if (phase) {
    phaseLabel.innerHTML = `Phase ${state.currentPhaseIndex + 1}/${state.workshop.phases.length}: <span class="phase-name">${phase.title}</span>`;
  }
}

function renderPhaseList() {
  phaseList.innerHTML = "";
  const phases = state.workshop?.phases || [];
  for (let i = 0; i < phases.length; i++) {
    const div = document.createElement("div");
    div.className = "phase-item" + (i === state.currentPhaseIndex ? " current" : "");
    div.textContent = `${i + 1}. ${phases[i].title}`;
    phaseList.appendChild(div);
  }
}

function renderDirectives() {
  directivesList.innerHTML = "";
  for (let i = 0; i < state.directives.length; i++) {
    const div = document.createElement("div");
    div.className = "directive-item";

    const text = document.createElement("span");
    text.textContent = state.directives[i];
    div.appendChild(text);

    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "\u00d7";
    btn.onclick = () => removeDirective(i);
    div.appendChild(btn);

    directivesList.appendChild(div);
  }
}

function renderActivityInfo() {
  const phase = state.workshop?.phases?.[state.currentPhaseIndex];
  const activities = phase?.activities;
  const idx = state.currentActivityIndex;

  if (!activities || activities.length === 0) {
    activityInfo.innerHTML = '<span style="color:#666;">No activities for this phase</span>';
    advanceActivityBtn.disabled = true;
    return;
  }

  if (idx < 0) {
    activityInfo.innerHTML = `<span style="color:#666;">Activities available (${activities.length}) — click Next Activity to begin</span>`;
    advanceActivityBtn.disabled = false;
    return;
  }

  const activity = activities[idx];
  const progress = `${idx + 1}/${activities.length}`;

  if (!activity) {
    activityInfo.innerHTML = `<span style="color:#a6e3a1;">All ${activities.length} activities complete</span>`;
    advanceActivityBtn.disabled = true;
    return;
  }

  let html = `<div class="activity-label">Activity ${progress} — ${activity.type}</div>`;

  if (activity.type === "prompt") {
    html += `<div class="activity-goal">${activity.goal}</div>`;
  } else if (activity.type === "madlib") {
    html += `<div class="madlib-template">${activity.template}</div>`;
    html += `<div class="madlib-blanks">Blanks: ${activity.blanks.join(", ")}</div>`;
  }

  activityInfo.innerHTML = html;

  // Disable button if we're on the last activity
  advanceActivityBtn.disabled = idx >= activities.length - 1;
}

function renderAll() {
  workshopTitle.textContent = state.workshop?.title || "Workshop Simulator";
  renderDialogue();
  renderPhaseLabel();
  renderPhaseList();
  renderActivityInfo();
  renderDirectives();
}

// --- API calls ---

async function loadWorkshopState() {
  const res = await fetch("/api/workshop");
  const data = await res.json();
  state = data;
  renderAll();
}

async function loadWorkshopList() {
  const res = await fetch("/api/workshops");
  const { workshops } = await res.json();
  workshopSelect.innerHTML = "";
  for (const f of workshops) {
    const opt = document.createElement("option");
    opt.value = f;
    opt.textContent = f.replace(".json", "");
    workshopSelect.appendChild(opt);
  }
  // Select current
  if (state.workshop) {
    const current = workshops.find(
      (f) => f.replace(".json", "") === state.workshop.title.toLowerCase().replace(/\s+/g, "-")
    );
    if (current) workshopSelect.value = current;
  }
}

async function switchWorkshop(filename) {
  const res = await fetch("/api/load-workshop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
  });
  const data = await res.json();
  if (res.ok) {
    state = data;
    renderAll();
  }
}

async function fetchNextTurn({ playerText, facilitatorText } = {}) {
  nextBtn.disabled = true;

  // Show loading indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "loading";
  loadingDiv.textContent = "Generating...";
  logEl.appendChild(loadingDiv);
  logEl.scrollTop = logEl.scrollHeight;

  try {
    const res = await fetch("/api/next-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerText: playerText || undefined,
        facilitatorText: facilitatorText || undefined,
        maxNewTurns: 3,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("API error:", data);
      alert("Error getting next turn. See console.");
      return;
    }

    // Update full state from server
    state.dialogue = data.dialogue;
    state.currentPhaseIndex = data.currentPhaseIndex;
    if (data.currentActivityIndex !== undefined) {
      state.currentActivityIndex = data.currentActivityIndex;
    }

    renderAll();
  } catch (err) {
    console.error(err);
    alert("Network error. See console.");
  } finally {
    loadingDiv.remove();
    nextBtn.disabled = false;
    playerInput.focus();
  }
}

async function addDirective() {
  const text = directiveInput.value.trim();
  if (!text) return;

  const res = await fetch("/api/directive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  state.directives = data.directives;
  directiveInput.value = "";
  renderDirectives();
}

async function removeDirective(index) {
  const res = await fetch(`/api/directive/${index}`, { method: "DELETE" });
  const data = await res.json();
  state.directives = data.directives;
  renderDirectives();
}

async function clearDirectives() {
  const res = await fetch("/api/clear-directives", { method: "POST" });
  state.directives = [];
  renderDirectives();
}

async function advanceActivity() {
  const res = await fetch("/api/advance-activity", { method: "POST" });
  const data = await res.json();
  state.dialogue = data.dialogue;
  if (data.currentActivityIndex !== undefined) {
    state.currentActivityIndex = data.currentActivityIndex;
  }
  renderAll();
}

async function advancePhase() {
  const res = await fetch("/api/advance-phase", { method: "POST" });
  const data = await res.json();
  state.dialogue = data.dialogue;
  state.currentPhaseIndex = data.currentPhaseIndex;
  state.currentActivityIndex = -1;
  renderAll();
}

// --- Event listeners ---

nextBtn.addEventListener("click", () => {
  const playerText = playerInput.value.trim();
  playerInput.value = "";
  fetchNextTurn({ playerText: playerText || undefined });
});

playerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    nextBtn.click();
  }
});

addDirectiveBtn.addEventListener("click", addDirective);

directiveInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    addDirective();
  }
});

clearDirectivesBtn.addEventListener("click", clearDirectives);

facilitatorSendBtn.addEventListener("click", () => {
  const text = facilitatorInput.value.trim();
  if (!text) return;
  facilitatorInput.value = "";
  fetchNextTurn({ facilitatorText: text });
});

facilitatorInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    facilitatorSendBtn.click();
  }
});

advanceActivityBtn.addEventListener("click", advanceActivity);
advancePhaseBtn.addEventListener("click", advancePhase);

exportBtn.addEventListener("click", () => {
  const payload = {
    workshop: state.workshop?.title || "unknown",
    exportedAt: new Date().toISOString(),
    dialogue: state.dialogue,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `workshop-dialogue-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

workshopSelect.addEventListener("change", () => {
  if (workshopSelect.value) {
    switchWorkshop(workshopSelect.value);
  }
});

// --- Init ---
(async () => {
  await loadWorkshopState();
  await loadWorkshopList();
})();
