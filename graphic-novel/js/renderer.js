window.GN = window.GN || {};

GN.renderer = {
  /**
   * Render the entire graphic novel into the container element.
   * @param {HTMLElement} container
   * @param {object[]} pages - from layout.layoutPages()
   * @param {Map} registry - character registry
   * @param {object} exportData - parsed export
   * @param {object} config - workshop config
   */
  render(container, pages, registry, exportData, config) {
    container.innerHTML = '';

    // Cover page
    container.appendChild(this._renderCover(config, registry));

    // Content pages
    for (var i = 0; i < pages.length; i++) {
      container.appendChild(this._renderPage(pages[i], registry));
    }
  },

  _renderCover(config, registry) {
    var cover = document.createElement('div');
    cover.className = 'gn-page gn-cover';

    var title = config.title || 'Untitled Workshop';
    var topic = config.topic || '';

    var html = '<div class="gn-cover-title">' + this._esc(title) + '</div>';

    if (topic) {
      // Truncate long topics
      var shortTopic = topic.length > 200 ? topic.substring(0, 200) + '...' : topic;
      html += '<div class="gn-cover-topic">' + this._esc(shortTopic) + '</div>';
    }

    html += '<div class="gn-cover-rule"></div>';

    // Cast list
    html += '<div class="gn-cover-cast">';

    // Facilitator first
    var facInfo = null;
    registry.forEach(function(info) {
      if (info.type === 'facilitator') facInfo = info;
    });

    if (facInfo) {
      html += '<div class="gn-cover-char gn-cover-facilitator">' +
        '<span class="gn-cover-char-dot" style="background:' + GN.colors.forCharacter(facInfo) + '"></span>' +
        '<span>' + this._esc(facInfo.name) + ' <span class="gn-cover-char-role">(Facilitator)</span></span>' +
        '</div>';
    }

    // Participants
    registry.forEach(function(info) {
      if (info.type === 'facilitator') return;
      var color = GN.colors.forCharacter(info);
      var roleLabel = info.type === 'player' ? 'You' : info.role;
      var borderStyle = info.type === 'player' ? 'border:2px dashed ' + color + ';background:transparent' : 'background:' + color;
      html += '<div class="gn-cover-char">' +
        '<span class="gn-cover-char-dot" style="' + borderStyle + '"></span>' +
        '<span>' + GN.renderer._esc(info.name) + ' <span class="gn-cover-char-role">(' + GN.renderer._esc(roleLabel) + ')</span></span>' +
        '</div>';
    });

    html += '</div>';

    cover.innerHTML = html;
    return cover;
  },

  _renderPage(page, registry) {
    var pageEl = document.createElement('div');
    pageEl.className = 'gn-page';

    var inner = document.createElement('div');
    inner.className = 'gn-page-inner';

    for (var i = 0; i < page.panels.length; i++) {
      var panel = page.panels[i];
      var panelEl = this._renderPanel(panel, registry);
      panelEl.style.gridArea = panel.gridArea;
      inner.appendChild(panelEl);
    }

    pageEl.appendChild(inner);

    // Page number
    var numEl = document.createElement('div');
    numEl.className = 'gn-page-number';
    numEl.textContent = page.pageNumber;
    pageEl.appendChild(numEl);

    return pageEl;
  },

  _renderPanel(panel, registry) {
    var el = document.createElement('div');
    el.className = 'gn-panel';

    // Title card
    if (panel.sceneType === 'title-card') {
      return this._renderTitleCard(panel);
    }

    // Apply scene tint
    var tint = GN.colors.sceneTints[panel.sceneType] || 'transparent';
    el.style.background = tint;

    // Reference dimensions for calculating proportional positions (converted to % for responsiveness)
    var pw = 400;
    var ph = 300;

    // Background SVG
    var bgHtml = GN.backgrounds.generate(panel.sceneType, pw, ph);
    if (bgHtml) {
      var bgDiv = document.createElement('div');
      bgDiv.className = 'gn-panel-bg';
      bgDiv.innerHTML = bgHtml;
      el.appendChild(bgDiv);
    }

    // Collect active speakers for this beat
    var activeSpeakers = new Set();
    var allSpeakers = new Set();
    var lines = panel.beat.lines;
    for (var i = 0; i < lines.length; i++) {
      activeSpeakers.add(lines[i].speaker);
      allSpeakers.add(lines[i].speaker);
    }

    // Silhouettes
    var silResult = GN.silhouettes.placeSilhouettes(
      panel.sceneType, activeSpeakers, allSpeakers, registry, pw, ph
    );

    var silDiv = document.createElement('div');
    silDiv.className = 'gn-silhouettes';
    for (var j = 0; j < silResult.placements.length; j++) {
      var sp = silResult.placements[j];
      var sEl = document.createElement('div');
      sEl.className = 'gn-silhouette' + (sp.facingLeft ? ' facing-left' : '');
      // Convert px position to percentage of panel width for responsiveness
      var leftPct = (sp.x / pw) * 100;
      sEl.style.left = Math.max(0, Math.min(85, leftPct)) + '%';
      sEl.style.bottom = '0';
      sEl.innerHTML = sp.html;
      silDiv.appendChild(sEl);
    }

    if (silResult.othersCount > 0) {
      var badge = document.createElement('div');
      badge.className = 'gn-others-badge';
      badge.textContent = '+' + silResult.othersCount + ' others';
      silDiv.appendChild(badge);
    }

    el.appendChild(silDiv);

    // Speech bubbles
    var bubblesHtml = GN.bubbles.renderBubblesLayer(
      lines, registry, silResult, pw, ph
    );
    var bubblesWrapper = document.createElement('div');
    bubblesWrapper.innerHTML = bubblesHtml;
    if (bubblesWrapper.firstChild) {
      el.appendChild(bubblesWrapper.firstChild);
    }

    return el;
  },

  _renderTitleCard(panel) {
    var el = document.createElement('div');
    el.className = 'gn-panel gn-title-card';

    var scene = panel.scene;
    var html = '';

    if (scene.phaseNumber) {
      html += '<div class="gn-title-card-phase-num">' + scene.phaseNumber + '</div>';
    }

    html += '<div class="gn-title-card-rule"></div>';
    html += '<div class="gn-title-card-title">' + this._esc(scene.phaseTitle || 'New Phase') + '</div>';
    html += '<div class="gn-title-card-rule"></div>';

    if (scene.phaseGoal) {
      var goal = scene.phaseGoal.length > 120 ? scene.phaseGoal.substring(0, 120) + '...' : scene.phaseGoal;
      html += '<div class="gn-title-card-subtitle">' + this._esc(goal) + '</div>';
    }

    el.innerHTML = html;
    return el;
  },

  _esc(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },
};
