/**
 * build/theme.js — Generate dist/css/theme.css from config.theme.
 * 
 * Emits CSS custom properties for terminal palette and typography.
 * Used by terminal.css and prism-terminal.css.
 * Also emits .light-mode overrides derived from the dark palette.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Derive a light-mode text color from a bright terminal color.
 * Bright terminal greens/cyans need significant darkening to be readable on white.
 * @param {string} hex - hex color
 * @returns {string} darker hex color suitable for light background
 */
function adaptForLight(hex) {
  if (!hex || !hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Scale toward black for readability on light bg
  const factor = 0.25;
  const nr = Math.round(r * factor);
  const ng = Math.round(g * factor);
  const nb = Math.round(b * factor);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/**
 * Generate CSS custom properties from theme config.
 * @param {object} themeConfig - Theme configuration object
 * @returns {string} CSS text
 */
function generateThemeCSS(themeConfig) {
  const t = themeConfig;
  return `/* TerminalX Theme — Generated from terminal.config.ts */
:root {
  /* Background & surfaces */
  --bg: ${t.bg || '#0a0e14'};
  --surface: ${t.surface || '#111820'};
  --border: ${t.border || '#1e2a3a'};
  
  /* Terminal palette */
  --green: ${t.green || '#00ff9c'};
  --cyan: ${t.cyan || '#56b6c2'};
  --yellow: ${t.yellow || '#f0db4f'};
  --red: ${t.red || '#e06c75'};
  --purple: ${t.purple || '#c678dd'};
  --white: ${t.white || '#abb2bf'};
  --dim: ${t.dim || '#5a6370'};
  
  /* Typography */
  --font-family: ${t.fontFamily || "'JetBrains Mono', monospace"};
  --font-size: ${t.fontSize || 14}px;
}

/* ── Light mode overrides ─────────────────────────────────────────── */

.light-mode {
  --bg: #fafafa;
  --surface: #eee;
  --border: #ccc;
  --green: ${adaptForLight(t.green || '#00ff9c')};
  --cyan: ${adaptForLight(t.cyan || '#56b6c2')};
  --yellow: ${adaptForLight(t.yellow || '#f0db4f')};
  --red: ${adaptForLight(t.red || '#e06c75')};
  --purple: ${adaptForLight(t.purple || '#c678dd')};
  --white: #2c3138;
  --dim: #7a818c;
}
`;
}

/**
 * Run theme generation step.
 * @param {object} config - Terminal config
 * @param {string} outDir - dist/ directory path
 */
export function runTheme(config, outDir) {
  const themeCSS = generateThemeCSS(config.theme || {});
  
  const cssDir = join(outDir, 'css');
  if (!existsSync(cssDir)) {
    mkdirSync(cssDir, { recursive: true });
  }
  
  writeFileSync(join(cssDir, 'theme.css'), themeCSS);
}

export default runTheme;
