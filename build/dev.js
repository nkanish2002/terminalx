/**
 * build/dev.js — Watch mode with live reload.
 * 
 * Watches content/ and shell/ for changes, rebuilds on modification.
 */

import { watch } from 'chokidar';
import { resolve } from 'path';
import { build } from './index.js';

async function dev() {
  console.log('Starting dev server...');
  
  // Initial build
  await build();
  
  // Resolve directories
  const siteDir = process.env.SITE_DIR || process.cwd();
  const contentDir = resolve(siteDir, 'content');
  const shellDir = resolve(siteDir, 'shell');
  
  // Watch for changes
  const watcher = watch([contentDir, shellDir], {
    persistent: true,
    ignoreInitial: true,
  });
  
  watcher.on('change', async (path) => {
    console.log(`Change detected: ${path}`);
    console.log('Rebuilding...');
    
    try {
      await build();
      console.log('Build complete');
    } catch (err) {
      console.error('Build failed:', err.message);
    }
  });
  
  watcher.on('unlink', async (path) => {
    console.log(`File removed: ${path}`);
    console.log('Rebuilding...');
    
    try {
      await build();
      console.log('Build complete');
    } catch (err) {
      console.error('Build failed:', err.message);
    }
  });
  
  console.log('Watching for changes...');
  console.log('Press Ctrl+C to stop');
}

dev().catch(err => {
  console.error('Dev server failed:', err.message);
  process.exit(1);
});
