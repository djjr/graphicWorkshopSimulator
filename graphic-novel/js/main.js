window.GN = window.GN || {};

GN.main = {
  exportData: null,
  configData: null,

  SAMPLE_TRANSCRIPT: 'sample/sampleTranscript.json',
  SAMPLE_WORKSHOP:   'sample/sampleWorkshop.json',

  init: function() {
    var self = this;
    var exportInput = document.getElementById('export-file');
    var configInput = document.getElementById('config-file');
    var generateBtn = document.getElementById('generate-btn');
    var sampleBtn = document.getElementById('sample-btn');

    exportInput.addEventListener('change', function(e) {
      self._readFile(e.target.files[0], 'export');
    });

    configInput.addEventListener('change', function(e) {
      self._readFile(e.target.files[0], 'config');
    });

    generateBtn.addEventListener('click', function() {
      self._generate();
    });

    sampleBtn.addEventListener('click', function() {
      self._loadSampleData();
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        self._navigatePage(1);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        self._navigatePage(-1);
        e.preventDefault();
      }
    });

    // Try loading sample data on startup
    this._loadSampleData();
  },

  _loadSampleData: function() {
    var self = this;
    var exportStatus = document.getElementById('export-status');
    var configStatus = document.getElementById('config-status');

    exportStatus.textContent = 'Loading sample transcript...';
    exportStatus.className = 'file-status';
    configStatus.textContent = 'Loading sample workshop...';
    configStatus.className = 'file-status';

    var loaded = 0;
    var failed = false;

    function checkDone() {
      loaded++;
      if (loaded === 2 && !failed) {
        self._updateGenerateButton();
      }
    }

    this._fetchJSON(this.SAMPLE_TRANSCRIPT, function(json) {
      try {
        self.exportData = GN.parser.parseExport(json);
        exportStatus.className = 'file-status ok';
        exportStatus.textContent = self.exportData.dialogue.length + ' dialogue lines (sample)';
      } catch (err) {
        exportStatus.className = 'file-status err';
        exportStatus.textContent = 'Sample transcript error: ' + err.message;
        failed = true;
      }
      checkDone();
    }, function() {
      exportStatus.className = 'file-status';
      exportStatus.textContent = '';
      failed = true;
      checkDone();
    });

    this._fetchJSON(this.SAMPLE_WORKSHOP, function(json) {
      try {
        self.configData = GN.parser.parseConfig(json);
        configStatus.className = 'file-status ok';
        configStatus.textContent = (self.configData.title || 'Config') + ' (sample)';
      } catch (err) {
        configStatus.className = 'file-status err';
        configStatus.textContent = 'Sample config error: ' + err.message;
        failed = true;
      }
      checkDone();
    }, function() {
      configStatus.className = 'file-status';
      configStatus.textContent = '';
      failed = true;
      checkDone();
    });
  },

  _fetchJSON: function(url, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function() {
      if (xhr.status === 200 || xhr.status === 0) {
        try {
          var json = JSON.parse(xhr.responseText);
          onSuccess(json);
        } catch (e) {
          onError(e);
        }
      } else {
        onError(new Error('HTTP ' + xhr.status));
      }
    };
    xhr.onerror = function() { onError(new Error('Network error')); };
    xhr.send();
  },

  _readFile: function(file, type) {
    if (!file) return;
    var self = this;
    var reader = new FileReader();
    var statusEl = document.getElementById(type === 'export' ? 'export-status' : 'config-status');

    reader.onload = function(e) {
      try {
        var json = JSON.parse(e.target.result);
        if (type === 'export') {
          self.exportData = GN.parser.parseExport(json);
          statusEl.className = 'file-status ok';
          statusEl.textContent = self.exportData.dialogue.length + ' dialogue lines loaded';
        } else {
          self.configData = GN.parser.parseConfig(json);
          statusEl.className = 'file-status ok';
          statusEl.textContent = (self.configData.title || 'Config') + ' loaded';
        }
        self._updateGenerateButton();
      } catch (err) {
        if (type === 'export') self.exportData = null;
        else self.configData = null;
        statusEl.className = 'file-status err';
        statusEl.textContent = err.message;
        self._updateGenerateButton();
      }
    };

    reader.onerror = function() {
      statusEl.className = 'file-status err';
      statusEl.textContent = 'Failed to read file';
    };

    reader.readAsText(file);
  },

  _updateGenerateButton: function() {
    var btn = document.getElementById('generate-btn');
    btn.disabled = !(this.exportData && this.configData);
  },

  _generate: function() {
    var errorDisplay = document.getElementById('error-display');
    var container = document.getElementById('novel-container');
    var loader = document.getElementById('loader');
    var navHint = document.getElementById('nav-hint');

    errorDisplay.textContent = '';

    try {
      console.log('[GN] Starting generation...');

      // Step 1: Build character registry
      var registry = GN.parser.buildCharacterRegistry(this.configData, this.exportData.dialogue);
      console.log('[GN] Character registry:', registry);

      // Step 2: Segment dialogue into scenes
      var scenes = GN.segmenter.segmentDialogue(this.exportData.dialogue, this.configData);
      console.log('[GN] Scenes:', scenes.length, scenes);

      // Step 3: Classify scene types
      scenes = GN.classifier.classifyScenes(scenes);
      console.log('[GN] Classified scenes:', scenes);

      // Step 4: Layout pages
      var pages = GN.layout.layoutPages(scenes, registry);
      console.log('[GN] Pages:', pages.length, pages);

      // Step 5: Render
      GN.renderer.render(container, pages, registry, this.exportData, this.configData);
      console.log('[GN] Render complete');

      // Hide loader, show novel
      loader.style.display = 'none';
      navHint.classList.remove('hidden');

      // Scroll to top of novel
      window.scrollTo(0, 0);

      // Store pages for keyboard navigation
      this._pages = container.querySelectorAll('.gn-page');
      this._currentPage = 0;

    } catch (err) {
      errorDisplay.textContent = 'Generation failed: ' + err.message;
      console.error('[GN] Generation error:', err);
    }
  },

  _navigatePage: function(direction) {
    if (!this._pages || this._pages.length === 0) return;

    this._currentPage = Math.max(0, Math.min(this._pages.length - 1, this._currentPage + direction));
    this._pages[this._currentPage].scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
};

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  GN.main.init();
});
