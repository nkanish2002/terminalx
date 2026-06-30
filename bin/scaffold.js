/**
 * bin/scaffold.js — Scaffold a new TerminalFS site.
 * 
 * Creates: content/, terminal.config.ts, public/, .gitignore
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function scaffold(newDir) {
  console.log(`Scaffolding new TerminalFS site in: ${newDir}`);
  
  // Create directories
  mkdirSync(resolve(newDir, 'content'), { recursive: true });
  mkdirSync(resolve(newDir, 'public'), { recursive: true });
  
  // Create terminal.config.ts
  const configContent = `// terminal.config.ts
// Single source of truth for terminal appearance and behavior
// All fields optional — missing fields use documented defaults

import { defineConfig } from 'terminalfs';

export default defineConfig({
  // Site identity
  site: {
    title: 'My TerminalFS Site',
    user: 'user',
    host: 'localhost',
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
`;
  writeFileSync(resolve(newDir, 'terminal.config.ts'), configContent);
  
  // Create example content
  const readmeContent = `# Welcome to TerminalFS

A terminal-style static-site framework. Interactive, type-a-command experience powered by Markdown.

## Getting Started

Edit this file, run \`terminalfs dev\`, and see your changes live.

## Features

- Terminal shell with \`ls\`, \`cat\`, \`cd\`, \`tree\`, \`help\`, \`search\`
- Markdown content in real .md files
- Configurable via single \`terminal.config.ts\`
- Graphs via \` \`\`\`graph \`\`\` \` code fences
- Search with static JSON index
- Deep linking via hash routes

---

*Built with TerminalFS framework*
`;
  mkdirSync(resolve(newDir, 'content', 'docs'), { recursive: true });
  writeFileSync(resolve(newDir, 'content', 'docs', 'readme.md'), readmeContent);
  
  // Create .gitignore
  const gitignoreContent = `node_modules/
dist/
*.log
.DS_Store
`;
  writeFileSync(resolve(newDir, '.gitignore'), gitignoreContent);
  
  // Create package.json
  const packageContent = {
    name: 'my-terminalfs-site',
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'terminalfs dev',
      build: 'terminalfs build',
    },
    devDependencies: {
      terminalfs: '*',
    },
  };
  writeFileSync(
    resolve(newDir, 'package.json'),
    JSON.stringify(packageContent, null, 2)
  );
  
  // Create README
  const readmeFile = `# My TerminalFS Site

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Configuration

Edit \`terminal.config.ts\` to customize your site.

## Content

Add Markdown files to \`content/\` directory.

## Build

\`\`\`bash
npm run build
\`\`\`

Deploy the \`dist/\` directory to GitHub Pages, Netlify, etc.
`;
  writeFileSync(resolve(newDir, 'README.md'), readmeFile);
  
  console.log('Site scaffolded successfully!');
  console.log('Next steps:');
  console.log('  1. cd to your new site');
  console.log('  2. npm install');
  console.log('  3. npm run dev');
}

const newDir = process.argv[2];
if (!newDir) {
  console.error('Usage: node scaffold.js <directory>');
  process.exit(1);
}

scaffold(resolve(newDir));
