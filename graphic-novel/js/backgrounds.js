window.GN = window.GN || {};

GN.backgrounds = {
  _uid: 0,
  /**
   * Generate an SVG background for a panel based on scene type.
   * Returns an SVG string.
   */
  generate(sceneType, width, height) {
    switch (sceneType) {
      case 'facilitator-presenting': return this.podium(width, height);
      case 'table-talk':             return this.table(width, height);
      case 'in-the-round':           return this.semicircle(width, height);
      default:                       return '';
    }
  },

  /**
   * Podium scene: lectern/podium at left, subtle audience seating at right.
   */
  podium(w, h) {
    var podiumX = w * 0.12;
    var podiumW = w * 0.08;
    var podiumH = h * 0.25;
    var podiumY = h * 0.65;
    var floorY = h * 0.92;

    var gradId = 'podiumGrad' + (this._uid++);

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#f5f3ef"/>' +
        '<stop offset="1" stop-color="#edeae4"/>' +
      '</linearGradient></defs>' +
      // Floor line
      '<line x1="0" y1="' + floorY + '" x2="' + w + '" y2="' + floorY + '" stroke="#e0ddd8" stroke-width="1"/>' +
      // Back wall subtle gradient
      '<rect x="0" y="0" width="' + w + '" height="' + floorY + '" fill="url(#' + gradId + ')"/>' +
      // Podium shape
      '<rect x="' + podiumX + '" y="' + podiumY + '" width="' + podiumW + '" height="' + podiumH + '" rx="2" fill="#d5cfc5" stroke="#c0b8aa" stroke-width="1"/>' +
      '<rect x="' + (podiumX - 2) + '" y="' + podiumY + '" width="' + (podiumW + 4) + '" height="4" rx="1" fill="#c0b8aa"/>' +
      // Audience row dots (right side)
      this._audienceDots(w * 0.55, floorY - 8, w * 0.4, 5) +
      '</svg>';
  },

  /**
   * Table scene: elliptical table in the center.
   */
  table(w, h) {
    var cx = w * 0.5;
    var cy = h * 0.55;
    var rx = w * 0.28;
    var ry = h * 0.12;
    var floorY = h * 0.92;

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#f8f6f2"/>' +
      '<line x1="0" y1="' + floorY + '" x2="' + w + '" y2="' + floorY + '" stroke="#e0ddd8" stroke-width="1"/>' +
      // Table shadow (rendered first, behind table)
      '<ellipse cx="' + cx + '" cy="' + (cy + 4) + '" rx="' + (rx + 4) + '" ry="' + (ry + 2) + '" fill="rgba(0,0,0,0.04)"/>' +
      // Table ellipse
      '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#d8d0c4" stroke="#c5bca8" stroke-width="1.5"/>' +
      '</svg>';
  },

  /**
   * Semicircle/arc scene: subtle curved floor marking.
   */
  semicircle(w, h) {
    var cx = w * 0.5;
    var floorY = h * 0.92;
    var arcR = w * 0.35;

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#f7f5f1"/>' +
      '<line x1="0" y1="' + floorY + '" x2="' + w + '" y2="' + floorY + '" stroke="#e0ddd8" stroke-width="1"/>' +
      // Arc on floor
      '<path d="M ' + (cx - arcR) + ' ' + floorY + ' A ' + arcR + ' ' + (arcR * 0.4) + ' 0 0 1 ' + (cx + arcR) + ' ' + floorY + '" fill="none" stroke="#ddd8ce" stroke-width="1.5" stroke-dasharray="6,4"/>' +
      '</svg>';
  },

  _audienceDots(startX, y, width, count) {
    var svg = '';
    for (var i = 0; i < count; i++) {
      var x = startX + (width / (count - 1)) * i;
      svg += '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#ddd8ce"/>';
    }
    return svg;
  },
};
