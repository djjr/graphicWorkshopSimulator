window.GN = window.GN || {};

GN.silhouettes = {
  /**
   * 8 distinct head-and-shoulders SVG path variants.
   * Each path is drawn in a 60x80 viewBox, head at top, shoulders at bottom.
   * Opaque fill, no internal detail.
   */
  variants: [
    // 0: Tall/narrow — slender build, slightly pointed head
    'M30 8 C22 8 17 14 17 22 C17 30 22 35 27 36 L24 40 L16 44 C10 47 8 54 8 60 L8 80 L52 80 L52 60 C52 54 50 47 44 44 L36 40 L33 36 C38 35 43 30 43 22 C43 14 38 8 30 8Z',

    // 1: Wide/round — rounder face, broader shoulders
    'M30 6 C20 6 14 13 14 23 C14 33 20 37 26 38 L23 42 L12 46 C6 49 4 56 4 62 L4 80 L56 80 L56 62 C56 56 54 49 48 46 L37 42 L34 38 C40 37 46 33 46 23 C46 13 40 6 30 6Z',

    // 2: Bun — hair bun on top
    'M30 4 C33 2 37 3 37 7 C37 9 35 10 33 10 C38 13 42 18 42 25 C42 33 37 37 32 38 L29 42 L14 46 C8 49 6 56 6 62 L6 80 L54 80 L54 62 C54 56 52 49 46 46 L35 42 L32 38 C26 37 18 33 18 25 C18 16 24 10 30 10 C28 10 26 8 27 5 C28 3 29 4 30 4Z',

    // 3: Stocky — thick neck, square shoulders
    'M30 10 C22 10 16 16 16 24 C16 32 22 36 27 37 L26 40 L14 43 C6 46 2 54 2 62 L2 80 L58 80 L58 62 C58 54 54 46 46 43 L34 40 L33 37 C38 36 44 32 44 24 C44 16 38 10 30 10Z',

    // 4: Angular — defined jawline, narrow shoulders
    'M30 8 C23 8 18 13 18 21 C18 27 21 32 25 35 L23 36 L22 40 L18 44 C12 47 10 54 10 60 L10 80 L50 80 L50 60 C50 54 48 47 42 44 L38 40 L37 36 L35 35 C39 32 42 27 42 21 C42 13 37 8 30 8Z',

    // 5: Afro — larger rounded hair silhouette
    'M30 3 C18 3 10 10 10 20 C10 26 14 31 18 34 L17 36 L16 40 L12 44 C6 47 4 54 4 62 L4 80 L56 80 L56 62 C56 54 54 47 48 44 L44 40 L43 36 L42 34 C46 31 50 26 50 20 C50 10 42 3 30 3Z',

    // 6: Slight — smaller, more petite build
    'M30 10 C24 10 20 15 20 22 C20 29 24 33 28 34 L26 38 L20 42 C14 44 12 50 12 56 L12 80 L48 80 L48 56 C48 50 46 44 40 42 L34 38 L32 34 C36 33 40 29 40 22 C40 15 36 10 30 10Z',

    // 7: Flat-top — flat top hairstyle
    'M18 16 L42 16 L42 18 C44 18 46 21 46 25 C46 33 40 37 34 38 L32 42 L16 46 C8 49 6 56 6 62 L6 80 L54 80 L54 62 C54 56 52 49 46 46 L34 42 L32 38 C26 37 18 33 18 25 C18 21 18 18 18 16Z',
  ],

  /**
   * Generate an SVG silhouette element for a character.
   * @param {object} charInfo - from CharacterRegistry
   * @param {number} height - desired render height in px
   * @param {boolean} facingLeft - flip horizontally
   * @returns {string} SVG markup
   */
  render(charInfo, height, facingLeft) {
    var variant = this.variants[charInfo.silhouetteVariant % this.variants.length];
    var color = GN.colors.forCharacter(charInfo);
    var width = Math.round(height * 0.75);
    var isPlayer = charInfo.type === 'player';

    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" width="' + width + '" height="' + height + '">';

    if (isPlayer) {
      // Player: dotted outline, no fill
      svg += '<path d="' + variant + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-dasharray="4,3"/>';
    } else {
      svg += '<path d="' + variant + '" fill="' + color + '" opacity="0.85"/>';
    }

    svg += '</svg>';
    return svg;
  },

  /**
   * Place silhouettes in a panel based on scene type and active speakers.
   * Returns an array of { speaker, html, x, height, facingLeft }
   */
  placeSilhouettes(sceneType, activeSpeakers, allSceneSpeakers, registry, panelWidth, panelHeight) {
    var speakers = Array.from(activeSpeakers);
    var maxShow = speakers.length > 4 ? 4 : speakers.length;
    var shown = speakers.slice(0, maxShow);
    var othersCount = speakers.length - maxShow;

    var placements = [];
    var baseH = Math.min(panelHeight * 0.55, 120);

    switch (sceneType) {
      case 'facilitator-presenting':
        placements = this._placeFacilitatorPresenting(shown, registry, panelWidth, panelHeight, baseH);
        break;
      case 'table-talk':
        placements = this._placeTableTalk(shown, registry, panelWidth, panelHeight, baseH);
        break;
      case 'in-the-round':
      default:
        placements = this._placeInTheRound(shown, registry, panelWidth, panelHeight, baseH);
        break;
    }

    return { placements: placements, othersCount: othersCount };
  },

  _placeFacilitatorPresenting(speakers, registry, pw, ph, baseH) {
    var placements = [];
    var facName = null;
    var others = [];

    for (var i = 0; i < speakers.length; i++) {
      var info = registry.get(speakers[i]);
      if (info && info.type === 'facilitator') {
        facName = speakers[i];
      } else {
        others.push(speakers[i]);
      }
    }

    // Large facilitator at left
    if (facName) {
      var facInfo = registry.get(facName);
      var facH = baseH * 1.4;
      placements.push({
        speaker: facName,
        html: this.render(facInfo, facH, false),
        x: pw * 0.08,
        height: facH,
        facingLeft: false,
      });
    }

    // Small audience at bottom-right
    var audienceH = baseH * 0.6;
    var startX = pw * 0.55;
    var spacing = Math.min(pw * 0.12, 50);
    for (var j = 0; j < others.length && j < 3; j++) {
      var pInfo = registry.get(others[j]);
      if (!pInfo) continue;
      placements.push({
        speaker: others[j],
        html: this.render(pInfo, audienceH, true),
        x: startX + j * spacing,
        height: audienceH,
        facingLeft: true,
      });
    }

    return placements;
  },

  _placeTableTalk(speakers, registry, pw, ph, baseH) {
    var placements = [];
    var count = speakers.length;
    var seatedH = baseH * 0.85;
    // Distribute around the center
    var cx = pw * 0.5;
    var spread = Math.min(pw * 0.35, count * 50);

    for (var i = 0; i < count; i++) {
      var info = registry.get(speakers[i]);
      if (!info) continue;
      var t = count === 1 ? 0.5 : i / (count - 1);
      var x = cx - spread / 2 + t * spread;
      var facingLeft = x > cx;
      placements.push({
        speaker: speakers[i],
        html: this.render(info, seatedH, facingLeft),
        x: x - seatedH * 0.375,
        height: seatedH,
        facingLeft: facingLeft,
      });
    }
    return placements;
  },

  _placeInTheRound(speakers, registry, pw, ph, baseH) {
    var placements = [];
    var count = speakers.length;
    var spacing = pw / (count + 1);

    for (var i = 0; i < count; i++) {
      var info = registry.get(speakers[i]);
      if (!info) continue;
      var x = spacing * (i + 1);
      var facingLeft = i % 2 === 1;
      placements.push({
        speaker: speakers[i],
        html: this.render(info, baseH, facingLeft),
        x: x - baseH * 0.375,
        height: baseH,
        facingLeft: facingLeft,
      });
    }
    return placements;
  },
};
