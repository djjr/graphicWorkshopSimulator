window.GN = window.GN || {};

GN.colors = {
  // 12 muted character colors — index 0 is always the facilitator
  palette: [
    '#6B8CAE', // 0: steel blue (facilitator)
    '#A0785A', // 1: warm brown
    '#7A9E7E', // 2: sage green
    '#8E7199', // 3: muted plum
    '#C2A968', // 4: sand
    '#5E9E9E', // 5: teal
    '#B07E8B', // 6: dusty rose
    '#8A8E5E', // 7: olive
    '#7A8899', // 8: slate
    '#A89E78', // 9: khaki
    '#9590A8', // 10: lavender-gray
    '#6EA89E', // 11: seafoam
  ],

  // Player accent color (green)
  player: '#7fff7f',

  // UI colors
  bg: '#1a1a1a',
  panelBg: '#fafafa',
  pageBg: '#111',
  titleWarm: '#ffd27f',

  // Background tints per scene type (subtle wash over panel)
  sceneTints: {
    'facilitator-presenting': 'rgba(107, 140, 174, 0.06)',
    'table-talk':            'rgba(122, 158, 126, 0.06)',
    'in-the-round':          'rgba(142, 113, 153, 0.06)',
    'title-card':            'transparent',
  },

  /** Get color for a character by colorIndex, with player override */
  forCharacter(charInfo) {
    if (charInfo.type === 'player') return this.player;
    return this.palette[charInfo.colorIndex % this.palette.length];
  }
};
