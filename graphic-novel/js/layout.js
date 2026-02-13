window.GN = window.GN || {};

GN.layout = {
  /**
   * Template library: 15+ CSS Grid area definitions.
   * Each template is an array of panel grid-area strings (grid-row / grid-column).
   * Grid is 12 columns x 6 rows.
   */
  templates: {
    // === 1-panel (title cards, full-width) ===
    full: [
      '1 / 1 / 7 / 13', // full page
    ],

    // === 2-panel layouts ===
    '2-equal-h': [
      '1 / 1 / 4 / 13', // top half
      '4 / 1 / 7 / 13', // bottom half
    ],
    '2-equal-v': [
      '1 / 1 / 7 / 7',  // left half
      '1 / 7 / 7 / 13', // right half
    ],
    '2-wide-narrow': [
      '1 / 1 / 7 / 8',  // wide left
      '1 / 8 / 7 / 13', // narrow right
    ],
    '2-narrow-wide': [
      '1 / 1 / 7 / 6',  // narrow left
      '1 / 6 / 7 / 13', // wide right
    ],

    // === 3-panel layouts ===
    '3-top-split': [
      '1 / 1 / 4 / 7',  // top left
      '1 / 7 / 4 / 13', // top right
      '4 / 1 / 7 / 13', // bottom full
    ],
    '3-bottom-split': [
      '1 / 1 / 4 / 13', // top full
      '4 / 1 / 7 / 7',  // bottom left
      '4 / 7 / 7 / 13', // bottom right
    ],
    '3-left-feature': [
      '1 / 1 / 7 / 7',  // left tall
      '1 / 7 / 4 / 13', // top right
      '4 / 7 / 7 / 13', // bottom right
    ],
    '3-right-feature': [
      '1 / 1 / 4 / 7',  // top left
      '4 / 1 / 7 / 7',  // bottom left
      '1 / 7 / 7 / 13', // right tall
    ],
    '3-equal-h': [
      '1 / 1 / 3 / 13', // top
      '3 / 1 / 5 / 13', // middle
      '5 / 1 / 7 / 13', // bottom
    ],

    // === 4-panel layouts ===
    '4-grid': [
      '1 / 1 / 4 / 7',  // top left
      '1 / 7 / 4 / 13', // top right
      '4 / 1 / 7 / 7',  // bottom left
      '4 / 7 / 7 / 13', // bottom right
    ],
    '4-feature-left': [
      '1 / 1 / 7 / 6',  // left tall feature
      '1 / 6 / 3 / 13', // top right
      '3 / 6 / 5 / 13', // mid right
      '5 / 6 / 7 / 13', // bottom right
    ],
    '4-feature-top': [
      '1 / 1 / 3 / 13', // top wide
      '3 / 1 / 7 / 5',  // bottom left
      '3 / 5 / 7 / 9',  // bottom center
      '3 / 9 / 7 / 13', // bottom right
    ],
    '4-stagger': [
      '1 / 1 / 3 / 8',  // top left wide
      '1 / 8 / 3 / 13', // top right narrow
      '3 / 1 / 7 / 6',  // bottom left narrow
      '3 / 6 / 7 / 13', // bottom right wide
    ],

    // === 5-panel layouts ===
    '5-mixed': [
      '1 / 1 / 3 / 7',  // top left
      '1 / 7 / 3 / 13', // top right
      '3 / 1 / 5 / 13', // middle wide
      '5 / 1 / 7 / 7',  // bottom left
      '5 / 7 / 7 / 13', // bottom right
    ],
    '5-feature-center': [
      '1 / 1 / 3 / 7',  // top left
      '1 / 7 / 3 / 13', // top right
      '3 / 1 / 5 / 5',  // mid left
      '3 / 5 / 5 / 13', // mid right wide
      '5 / 1 / 7 / 13', // bottom wide
    ],
    '5-mosaic': [
      '1 / 1 / 4 / 5',  // left tall
      '1 / 5 / 2 / 13', // top right wide
      '2 / 5 / 4 / 9',  // mid center
      '2 / 9 / 4 / 13', // mid right
      '4 / 1 / 7 / 13', // bottom wide
    ],
  },

  /**
   * Select templates for a given beat count, avoiding repeating the previous template.
   */
  _templatesByBeatCount: {
    1: ['full'],
    2: ['2-equal-h', '2-equal-v', '2-wide-narrow', '2-narrow-wide'],
    3: ['3-top-split', '3-bottom-split', '3-left-feature', '3-right-feature', '3-equal-h'],
    4: ['4-grid', '4-feature-left', '4-feature-top', '4-stagger'],
    5: ['5-mixed', '5-feature-center', '5-mosaic'],
  },

  /**
   * Pick a template for `beatCount` panels, avoiding `lastTemplate`.
   */
  pickTemplate(beatCount, lastTemplate) {
    var count = Math.min(Math.max(beatCount, 1), 5);
    var options = this._templatesByBeatCount[count];

    // Filter out the last-used template to avoid consecutive repeats
    if (lastTemplate && options.length > 1) {
      var filtered = options.filter(function(t) { return t !== lastTemplate; });
      if (filtered.length > 0) options = filtered;
    }

    return options[Math.floor(Math.random() * options.length)];
  },

  /**
   * Given classified scenes with beats, produce an array of pages.
   * Each page: { panels[], templateName, pageNumber }
   * Each panel: { beat, gridArea, sceneType, sceneContext }
   */
  layoutPages(scenes, registry) {
    var pages = [];
    var pageNum = 1;
    var lastTemplate = null;

    // Flatten scenes into a work queue of (beat, sceneType, sceneContext)
    var queue = [];
    for (var i = 0; i < scenes.length; i++) {
      var scene = scenes[i];
      var beats = GN.segmenter.splitSceneIntoBeats(scene);
      for (var j = 0; j < beats.length; j++) {
        queue.push({
          beat: beats[j],
          sceneType: scene.sceneType,
          scene: scene,
        });
      }
    }

    // Title cards always get their own full page
    var idx = 0;
    while (idx < queue.length) {
      var item = queue[idx];

      if (item.beat.isTitleCard) {
        pages.push({
          panels: [{
            beat: item.beat,
            gridArea: this.templates.full[0],
            sceneType: 'title-card',
            scene: item.scene,
          }],
          templateName: 'full',
          pageNumber: pageNum++,
        });
        lastTemplate = 'full';
        idx++;
        continue;
      }

      // Collect beats for this page (2–5 panels per page)
      var pageBeatItems = [item];
      idx++;

      while (idx < queue.length && pageBeatItems.length < 5) {
        var next = queue[idx];
        // Don't merge title cards into regular pages
        if (next.beat.isTitleCard) break;
        pageBeatItems.push(next);
        idx++;
      }

      var beatCount = pageBeatItems.length;
      var templateName = this.pickTemplate(beatCount, lastTemplate);
      var areas = this.templates[templateName];

      var panels = [];
      for (var p = 0; p < pageBeatItems.length; p++) {
        panels.push({
          beat: pageBeatItems[p].beat,
          gridArea: areas[p] || areas[areas.length - 1],
          sceneType: pageBeatItems[p].sceneType,
          scene: pageBeatItems[p].scene,
        });
      }

      pages.push({
        panels: panels,
        templateName: templateName,
        pageNumber: pageNum++,
      });
      lastTemplate = templateName;
    }

    return pages;
  },
};
