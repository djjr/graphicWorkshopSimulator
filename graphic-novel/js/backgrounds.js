window.GN = window.GN || {};

GN.backgrounds = {
  /**
   * Image paths and focal-point positions per scene type.
   * object-position keeps the important part of the image in frame
   * regardless of panel aspect ratio.
   */
  images: {
    'facilitator-presenting': { src: 'img/facilitator-presenting.jpg', position: 'center 60%' },
    'table-talk':             { src: 'img/table-talk.jpg',             position: 'center 50%' },
    'in-the-round':           { src: 'img/in-the-round.jpg',           position: 'center 40%' },
  },

  /**
   * Generate a background HTML string for a panel.
   * Returns an <img> tag with object-fit:cover, falling back to
   * the old SVG generators if the image fails to load.
   */
  generate(sceneType, width, height) {
    var entry = this.images[sceneType];
    if (!entry) return '';

    return '<img src="' + entry.src + '" alt="" style="' +
      'width:100%;height:100%;object-fit:cover;' +
      'object-position:' + entry.position + ';' +
      'display:block;" ' +
      'onerror="this.style.display=\'none\'">';
  },
};
