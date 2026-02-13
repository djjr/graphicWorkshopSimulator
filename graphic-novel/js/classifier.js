window.GN = window.GN || {};

GN.classifier = {
  /**
   * Assign a scene type to each scene.
   * Types: 'title-card', 'facilitator-presenting', 'table-talk', 'in-the-round'
   */
  classifyScenes(scenes) {
    var prevWasTitleCard = false;

    for (var i = 0; i < scenes.length; i++) {
      var scene = scenes[i];

      if (scene.isTitleCard) {
        scene.sceneType = 'title-card';
        prevWasTitleCard = true;
        continue;
      }

      scene.sceneType = this._classifyScene(scene, prevWasTitleCard);
      prevWasTitleCard = false;
    }

    return scenes;
  },

  _classifyScene(scene, afterTitleCard) {
    var lines = scene.lines;
    var facLines = 0;
    var partLines = 0;
    var speakers = new Set();
    var facOnly = true;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      speakers.add(line.speaker);
      if (line.type === 'facilitator') {
        facLines++;
      } else {
        partLines++;
        facOnly = false;
      }
    }

    // Facilitator presenting: after title card, or facilitator-only, or facilitator >= 50%
    if (afterTitleCard) return 'facilitator-presenting';
    if (facOnly) return 'facilitator-presenting';
    if (facLines > 0 && facLines >= partLines) return 'facilitator-presenting';

    // Table talk: no facilitator lines (or one brief interjection), 2+ participant speakers
    var facBrief = true;
    var nonFacSpeakers = new Set();
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].type === 'facilitator') {
        if (lines[j].text.length >= 40) facBrief = false;
      } else {
        nonFacSpeakers.add(lines[j].speaker);
      }
    }

    if ((facLines === 0 || (facLines <= 1 && facBrief)) && nonFacSpeakers.size >= 2) {
      return 'table-talk';
    }

    // Default: in-the-round
    return 'in-the-round';
  },

  /**
   * Get the set of active speakers in a beat.
   */
  beatSpeakers(beat) {
    var speakers = new Set();
    for (var i = 0; i < beat.lines.length; i++) {
      speakers.add(beat.lines[i].speaker);
    }
    return speakers;
  },
};
