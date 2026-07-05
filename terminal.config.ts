// terminal.config.ts
// Single source of truth for terminal appearance and behavior
// All fields optional — missing fields use documented defaults

import { defineConfig } from './index.js';

export default defineConfig({
  // Site identity
  site: {
    title: 'TerminalX',
    user: 'user',
    host: 'terminal',
    promptSymbol: '→',
  },

  // Theme — CSS variables generated at build
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

  // Content + landing view
  content: {
    dir: 'content',
    landing: 'cat /docs/readme.md',
    home: '/',
  },

  // Enabled commands + aliases
  commands: {
    enabled: [
      'ls', 'cat', 'cd', 'pwd', 'tree', 'clear',
      'help', 'whoami', 'date', 'search',
    ],
    aliases: {
      ll: 'ls',
    },
  },

  // Search index options
  search: {
    snippetChars: 160,
    fields: ['title', 'text'],
  },

  // Chart defaults
  charts: {
    defaultType: 'line',
    palette: ['green', 'cyan', 'yellow', 'red', 'purple'],
  },

  // Build settings
  build: {
    outDir: 'dist',
    inlineThreshold: 512000, // 500KB
    basePath: './',
  },
});
