import { readFileSync } from "fs";

export class Session {
  constructor() {
    this.workshop = null;
    this.currentPhaseIndex = 0;
    this.currentActivityIndex = -1;
    this.dialogue = [];
    this.directives = [];
  }

  loadWorkshop(configPath) {
    const raw = readFileSync(configPath, "utf-8");
    this.workshop = JSON.parse(raw);
    this.currentPhaseIndex = 0;
    this.currentActivityIndex = -1;
    this.dialogue = [];
    this.directives = [];

    // Add facilitator opening line for the first phase
    const phase = this.workshop.phases[0];
    if (phase?.facilitator_opens) {
      this.dialogue.push({
        speaker: this.workshop.facilitator.name,
        text: phase.facilitator_opens,
        type: "facilitator",
      });
    }
  }

  getWorkshop() {
    return this.workshop;
  }

  getCurrentPhase() {
    if (!this.workshop) return null;
    return this.workshop.phases[this.currentPhaseIndex] || null;
  }

  getCurrentPhaseIndex() {
    return this.currentPhaseIndex;
  }

  getPhases() {
    return this.workshop?.phases || [];
  }

  advancePhase() {
    if (!this.workshop) return null;
    const next = this.currentPhaseIndex + 1;
    if (next >= this.workshop.phases.length) return null;

    this.currentPhaseIndex = next;
    this.currentActivityIndex = -1;
    const phase = this.workshop.phases[next];

    // Add system note about phase transition
    this.dialogue.push({
      speaker: "System",
      text: `Phase changed to: ${phase.title}`,
      type: "system",
    });

    // Add facilitator opening for new phase
    if (phase.facilitator_opens) {
      this.dialogue.push({
        speaker: this.workshop.facilitator.name,
        text: phase.facilitator_opens,
        type: "facilitator",
      });
    }

    return phase;
  }

  getCurrentActivity() {
    const phase = this.getCurrentPhase();
    if (!phase?.activities || this.currentActivityIndex < 0) return null;
    return phase.activities[this.currentActivityIndex] || null;
  }

  advanceActivity() {
    const phase = this.getCurrentPhase();
    if (!phase?.activities || phase.activities.length === 0) return null;

    const next = this.currentActivityIndex + 1;
    if (next >= phase.activities.length) return null;

    this.currentActivityIndex = next;
    return phase.activities[next];
  }

  addDialogue(entry) {
    this.dialogue.push(entry);
  }

  getDialogue() {
    return this.dialogue;
  }

  getRecentDialogue(n = 30) {
    return this.dialogue.slice(-n);
  }

  addDirective(text) {
    this.directives.push(text);
  }

  removeDirective(index) {
    this.directives.splice(index, 1);
  }

  clearDirectives() {
    this.directives = [];
  }

  getDirectives() {
    return this.directives;
  }

  getState() {
    return {
      workshop: this.workshop,
      currentPhaseIndex: this.currentPhaseIndex,
      currentPhase: this.getCurrentPhase(),
      currentActivityIndex: this.currentActivityIndex,
      currentActivity: this.getCurrentActivity(),
      dialogue: this.dialogue,
      directives: this.directives,
    };
  }
}
