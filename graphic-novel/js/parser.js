window.GN = window.GN || {};

GN.parser = {
  /**
   * Validate and parse the export JSON.
   * Returns { workshop, exportedAt, dialogue[] } or throws.
   */
  parseExport(json) {
    if (!json || typeof json !== 'object') throw new Error('Export JSON is not a valid object');
    if (!json.dialogue || !Array.isArray(json.dialogue)) throw new Error('Export JSON missing "dialogue" array');
    if (json.dialogue.length === 0) throw new Error('Export JSON has empty dialogue');
    for (var i = 0; i < json.dialogue.length; i++) {
      var d = json.dialogue[i];
      if (d.type === 'system') continue;
      if (!d.speaker || !d.text) {
        throw new Error('Dialogue entry ' + i + ' missing speaker or text');
      }
    }
    return {
      workshop: json.workshop || 'Untitled Workshop',
      exportedAt: json.exportedAt || null,
      dialogue: json.dialogue,
    };
  },

  /**
   * Validate and parse the workshop config JSON.
   * Returns the config object or throws.
   */
  parseConfig(json) {
    if (!json || typeof json !== 'object') throw new Error('Config JSON is not a valid object');
    if (!json.facilitator) throw new Error('Config missing "facilitator"');
    if (!json.facilitator.name) throw new Error('Config facilitator missing "name"');
    return json;
  },

  /**
   * Build a CharacterRegistry from config + dialogue.
   * Map<name, { name, type, role, personality, colorIndex, silhouetteVariant }>
   */
  buildCharacterRegistry(config, dialogue) {
    var registry = new Map();
    var silhouetteIndex = 0;

    // Facilitator always gets index 0
    var fac = config.facilitator;
    registry.set(fac.name, {
      name: fac.name,
      type: 'facilitator',
      role: fac.personality || 'Facilitator',
      personality: fac.speech_style || '',
      colorIndex: 0,
      silhouetteVariant: silhouetteIndex++,
    });

    // Participants from config
    var participants = config.participants || [];
    for (var i = 0; i < participants.length; i++) {
      var p = participants[i];
      if (!registry.has(p.name)) {
        registry.set(p.name, {
          name: p.name,
          type: 'participant',
          role: p.role || 'Participant',
          personality: p.personality || '',
          colorIndex: (silhouetteIndex) % GN.colors.palette.length,
          silhouetteVariant: silhouetteIndex % 8,
        });
        silhouetteIndex++;
      }
    }

    // Scan dialogue for unknown speakers (player, or missing from config)
    for (var j = 0; j < dialogue.length; j++) {
      var d = dialogue[j];
      if (d.type === 'system') continue;
      if (!registry.has(d.speaker)) {
        var isPlayer = d.type === 'player' || d.speaker === 'You';
        registry.set(d.speaker, {
          name: d.speaker,
          type: isPlayer ? 'player' : 'participant',
          role: isPlayer ? 'Player' : 'Participant',
          personality: '',
          colorIndex: isPlayer ? -1 : (silhouetteIndex) % GN.colors.palette.length,
          silhouetteVariant: silhouetteIndex % 8,
        });
        silhouetteIndex++;
      }
    }

    return registry;
  },
};
