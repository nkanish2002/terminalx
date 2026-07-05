/**
 * build/theme.js — Generate dist/css/theme.css from config.theme.
 * 
 * Emits CSS custom properties for terminal palette and typography.
 * Used by terminal.css and prism-terminal.css.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

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
  
  /* Typography */
  --font-family: ${t.fontFamily || "'JetBrains Mono', monospace"};
  --font-size: ${t.fontSize || 14}px;
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
