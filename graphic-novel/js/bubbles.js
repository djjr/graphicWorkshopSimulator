window.GN = window.GN || {};

GN.bubbles = {
  /**
   * Create speech bubbles for a beat's dialogue lines within a panel.
   * Uses percentage-based positioning for responsive layout.
   */
  createBubbles(lines, registry, silhouettePlacements, panelWidth, panelHeight) {
    var bubbles = [];
    var placements = silhouettePlacements.placements;
    var count = lines.length;

    // Vertical distribution: evenly space bubbles in top portion of panel
    var topPct = 3;   // % from top
    var usablePct = count === 1 ? 30 : (count === 2 ? 50 : 65);
    var slotPct = count > 0 ? usablePct / count : usablePct;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var charInfo = registry.get(line.speaker);
      var color = charInfo ? GN.colors.forCharacter(charInfo) : '#888';
      var isPlayer = charInfo && charInfo.type === 'player';

      // Find this speaker's silhouette to determine which side
      var silPlacement = this._findSpeakerPlacement(line.speaker, placements);
      var speakerOnLeft = silPlacement ? (silPlacement.x < panelWidth * 0.5) : (i % 2 === 0);

      var tailSide = speakerOnLeft ? 'left' : 'right';

      // Position as percentages: alternate left/right
      var leftPct = speakerOnLeft ? 2 : 42;
      var topPosPct = topPct + i * slotPct;

      bubbles.push({
        speaker: line.speaker,
        text: line.text,
        meta: line.meta || null,
        color: color,
        isPlayer: isPlayer,
        tailSide: tailSide,
        leftPct: leftPct,
        topPct: topPosPct,
      });
    }

    return bubbles;
  },

  /**
   * Render a bubble as an HTML string.
   */
  renderBubble(bubble) {
    var classes = 'gn-bubble tail-' + bubble.tailSide;
    if (bubble.isPlayer) classes += ' player-bubble';

    var style = 'left:' + bubble.leftPct + '%;' +
                'top:' + bubble.topPct + '%;' +
                'border-color:' + bubble.color + ';' +
                '--bubble-color:' + bubble.color + ';';

    var html = '<div class="' + classes + '" style="' + style + '">';
    html += '<div class="gn-bubble-speaker" style="color:' + bubble.color + '">' + this._esc(bubble.speaker) + '</div>';
    html += '<div class="gn-bubble-text">' + this._esc(bubble.text) + '</div>';
    if (bubble.meta) {
      html += '<div class="gn-bubble-meta">' + this._esc(bubble.meta) + '</div>';
    }
    html += '</div>';

    return html;
  },

  /**
   * Build the full bubbles layer HTML for a panel.
   */
  renderBubblesLayer(lines, registry, silhouettePlacements, panelWidth, panelHeight) {
    var bubbles = this.createBubbles(lines, registry, silhouettePlacements, panelWidth, panelHeight);
    var html = '<div class="gn-bubbles">';
    for (var i = 0; i < bubbles.length; i++) {
      html += this.renderBubble(bubbles[i]);
    }
    html += '</div>';
    return html;
  },

  _findSpeakerPlacement(speaker, placements) {
    for (var i = 0; i < placements.length; i++) {
      if (placements[i].speaker === speaker) return placements[i];
    }
    return null;
  },

  _esc(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
