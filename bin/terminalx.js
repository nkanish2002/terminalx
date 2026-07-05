#!/usr/bin/env node

/**
 * TerminalX CLI
 * 
 * Commands:
 *   build  - Build site to dist/
 *   dev    - Watch mode with live reload
 *   new <dir> - Scaffold new site
 */

import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.log(`
TerminalX v0.1.0 - Interactive Terminal Static Site Framework

Usage: terminalx <command>

Commands:
  build     Build site to dist/
  dev       Watch mode with live reload (localhost:3000)
  new <dir> Scaffold new TerminalX site
  help      Show this help
`);
  process.exit(0);
}

const siteDir = process.cwd();
const buildDir = resolve(__dirname, '..', 'build');

switch (command) {
  case 'build':
    execSync('node index.js', { 
      cwd: buildDir,
      stdio: 'inherit',
      env: { ...process.env, SITE_DIR: siteDir }
    });
    break;

  case 'dev':
    execSync('node dev.js', { 
      cwd: buildDir,
      stdio: 'inherit',
      env: { ...process.env, SITE_DIR: siteDir }
    });
    break;

  case 'new':
    if (!args[0]) {
      console.error('Usage: terminalx new <directory>');
      process.exit(1);
    }
    const newDir = resolve(process.cwd(), args[0]);
    execSync(`node scaffold.js "${newDir}"`, { 
      cwd: __dirname,
      stdio: 'inherit'
    });
    break;

  case 'help':
    console.log(`
TerminalX v0.1.0

Usage: terminalx <command>

Commands:
  build     Build site to dist/
  dev       Watch mode with live reload
  new <dir> Scaffold new TerminalX site
  help      Show this help
`);
    break;

  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
