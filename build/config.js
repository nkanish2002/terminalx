/**
 * build/config.js — Load terminal.config.ts via jiti, validate, deep-merge defaults.
 * 
 * Exports:
 *   - loadConfig(siteDir) — Returns resolved config
 *   - validateConfig(config) — Throws on structural errors
 *   - DEFAULTS — The documented default values
 */

import { createJiti } from 'jiti';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Default configuration values */
export const DEFAULTS = {
  site: {
    title: 'TerminalX',
    user: 'user',
    host: 'host',
    promptSymbol: '→',
  },
  theme: {
    bg: '#0a0e14',
    surface: '#111820',
    border: '#1e2a3a',
    green: '#00ff9c',
    cyan: '#56b6c2',
    yellow: '#f0db4f',
    red: '#e06c75',
    purple: '#c678dd',
    white: '#abb2bf',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 14,
  },
  content: {
    dir: 'content',
    landing: 'cat /docs/readme.md',
    home: '/',
  },
  commands: {
    enabled: [
      'ls', 'cat', 'cd', 'pwd', 'tree', 'clear',
      'help', 'whoami', 'date', 'search',
    ],
    aliases: {},
  },
  search: {
    snippetChars: 160,
    fields: ['title', 'text'],
  },
  charts: {
    defaultType: 'line',
    palette: ['green', 'cyan', 'yellow', 'red', 'purple'],
  },
  build: {
    outDir: 'dist',
    inlineThreshold: 512000, // 500KB
    basePath: './',
  },
  ui: {
    commandBar: {
      enabled: true,
      alwaysVisible: true,
    },
  },
};

/**
 * Deep merge two objects. Source overrides target.
 * Arrays and primitives are replaced, not merged.
 */
function deepMerge(target, source) {
  const out = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      out[key] = deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

/**
 * Load terminal.config.ts (or .js/.mjs) via jiti.
 * Returns resolved config (defaults + user overrides).
 */
export async function loadConfig(siteDir) {
  // Try .ts, .js, .mjs in order
  const extensions = ['terminal.config.ts', 'terminal.config.js', 'terminal.config.mjs'];
  let userConfig = {};
  let found = false;

  for (const ext of extensions) {
    const configPath = resolve(siteDir, ext);
    if (existsSync(configPath)) {
      try {
        const jiti = createJiti(siteDir);
        const mod = await jiti.import(configPath);
        userConfig = mod.default || mod;
        found = true;
        break;
      } catch (err) {
        console.warn(`Warning: Failed to load ${ext}: ${err.message}`);
      }
    }
  }

  // Deep merge with defaults
  const resolved = deepMerge(DEFAULTS, userConfig);

  // Validate
  validateConfig(resolved, siteDir);

  return resolved;
}

/**
 * Validate resolved config structure.
 */
export function validateConfig(config, siteDir) {
  const required = ['site', 'theme', 'content', 'commands', 'search', 'charts', 'build'];
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Config missing required section: "${key}"`);
    }
  }

  if (!Array.isArray(config.commands.enabled)) {
    throw new Error('config.commands.enabled must be an array');
  }

  if (!config.site.title || typeof config.site.title !== 'string') {
    throw new Error('config.site.title must be a non-empty string');
  }
}

export default loadConfig;
