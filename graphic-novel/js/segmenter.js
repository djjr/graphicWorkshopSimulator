window.GN = window.GN || {};

GN.segmenter = {
  MAX_SCENE_LINES: 8,

  /**
   * Segment flat dialogue array into scenes.
   * Each scene: { lines[], phaseTitle?, phaseNumber?, isTitleCard }
   */
  segmentDialogue(dialogue, config) {
    var scenes = [];
    var current = { lines: [], isTitleCard: false };
    var phaseNumber = 0;
    var phases = (config && config.phases) || [];

    for (var i = 0; i < dialogue.length; i++) {
      var d = dialogue[i];

      // Phase transition system message → title card scene
      if (d.type === 'system' && d.text && d.text.indexOf('Phase changed to:') === 0) {
        // Flush current scene
        if (current.lines.length > 0) {
          scenes.push(current);
        }
        phaseNumber++;
        var phaseTitle = d.text.replace('Phase changed to: ', '').trim();
        var phaseConfig = phases.find(function(p) { return p.title === phaseTitle; });

        scenes.push({
          lines: [d],
          isTitleCard: true,
          phaseTitle: phaseTitle,
          phaseNumber: phaseNumber,
          phaseGoal: phaseConfig ? phaseConfig.goal : '',
        });
        current = { lines: [], isTitleCard: false };
        continue;
      }

      // Skip other system messages
      if (d.type === 'system') continue;

      // Check if dominant speaker type shifts
      if (current.lines.length > 0 && this._shouldSplit(current, d)) {
        scenes.push(current);
        current = { lines: [], isTitleCard: false };
      }

      current.lines.push(d);

      // Force split at max scene lines
      if (current.lines.length >= this.MAX_SCENE_LINES) {
        scenes.push(current);
        current = { lines: [], isTitleCard: false };
      }
    }

    // Flush remaining
    if (current.lines.length > 0) {
      scenes.push(current);
    }

    return scenes;
  },

  /**
   * Decide if we should split before adding this line to the current scene.
   */
  _shouldSplit(current, nextLine) {
    if (current.lines.length < 3) return false;

    var facCount = 0;
    var partCount = 0;
    for (var i = 0; i < current.lines.length; i++) {
      if (current.lines[i].type === 'facilitator') facCount++;
      else partCount++;
    }

    var currentDominant = facCount >= partCount ? 'facilitator' : 'participant';
    var nextType = nextLine.type === 'facilitator' ? 'facilitator' : 'participant';

    // Split when dominant type shifts and we have enough lines
    if (currentDominant !== nextType && current.lines.length >= 4) {
      return true;
    }

    return false;
  },

  /**
   * Split a scene's lines into beats of 1–3 lines each.
   * - Long text (>120 chars) → solo beat
   * - Question + response → 2-line beat
   * - Short back-and-forth → 3-line beat
   */
  splitSceneIntoBeats(scene) {
    if (scene.isTitleCard) {
      return [{ lines: scene.lines, isTitleCard: true }];
    }

    var beats = [];
    var lines = scene.lines;
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      // Long text → solo beat
      if (line.text.length > 120) {
        beats.push({ lines: [line] });
        i++;
        continue;
      }

      // Question + response → 2-line beat
      if (i + 1 < lines.length && this._isQuestion(line.text)) {
        beats.push({ lines: [line, lines[i + 1]] });
        i += 2;
        continue;
      }

      // Try 3-line beat if we have enough lines and they're short
      if (i + 2 < lines.length &&
          line.text.length <= 80 &&
          lines[i + 1].text.length <= 80 &&
          lines[i + 2].text.length <= 80) {
        beats.push({ lines: [line, lines[i + 1], lines[i + 2]] });
        i += 3;
        continue;
      }

      // Try 2-line beat
      if (i + 1 < lines.length && line.text.length <= 100) {
        beats.push({ lines: [line, lines[i + 1]] });
        i += 2;
        continue;
      }

      // Default: solo beat
      beats.push({ lines: [line] });
      i++;
    }

    return beats;
  },

  _isQuestion(text) {
    return text.indexOf('?') !== -1;
  },
};
