/**
 * build/index.js — Orchestrator: wires the build pipeline, emits outputs.
 * 
 * Steps:
 * 1. Load config
 * 2. Walk content directory
 * 3. Render markdown files
 * 4. Generate manifest.json
 * 5. Generate fs.json (or per-file content)
 * 6. Generate search-index.json
 * 7. Generate theme.css
 * 8. Copy shell/ and public/ to dist/
 */

import { resolve, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, copyFileSync, readdirSync, statSync, readFileSync } from 'fs';
import { loadConfig } from './config.js';
import { walkDirectory } from './walk.js';
import { renderMarkdown } from './render.js';
import { runTheme } from './theme.js';

async function build() {
  const siteDir = process.env.SITE_DIR || process.cwd();
  const config = await loadConfig(siteDir);
  
  console.log(`Building site: ${config.site.title}`);
  console.log(`Content dir: ${config.content.dir}`);
  console.log(`Output dir: ${config.build.outDir}`);
  
  // Resolve content directory
  const contentDir = resolve(siteDir, config.content.dir);
  if (!existsSync(contentDir)) {
    throw new Error(`Content directory not found: ${contentDir}`);
  }
  
  // Walk content directory
  const { tree, files } = walkDirectory(contentDir);
  console.log(`Found ${files.length} files`);
  
  // Render all markdown files
  const contentMap = {};
  for (const file of files) {
    if (file.ext === '.md') {
      const rawContent = readFileSync(file.fullPath, 'utf-8');
      const { html, title, graphs, raw } = await renderMarkdown(rawContent, file.title);
      contentMap[file.path] = { html, title, graphs, raw };
    } else {
      // Non-markdown files (e.g., .json) — store raw
      const raw = readFileSync(file.fullPath, 'utf-8');
      contentMap[file.path] = { raw };
    }
  }
  
  // Calculate total content size
  let totalSize = 0;
  for (const [path, data] of Object.entries(contentMap)) {
    if (data.html) totalSize += data.html.length;
    if (data.raw) totalSize += data.raw.length;
  }
  
  // Generate manifest.json
  const manifest = {
    generatedAt: new Date().toISOString(),
    inlined: totalSize <= config.build.inlineThreshold,
    config: {
      site: config.site,
      content: {
        landing: config.content.landing,
        home: config.content.home,
      },
      commands: config.commands,
      charts: config.charts,
    },
    tree,
  };
  
  // Generate fs.json if inlined, else per-file content
  const outDir = resolve(siteDir, config.build.outDir);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  
  writeFileSync(
    resolve(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  if (manifest.inlined) {
    writeFileSync(
      resolve(outDir, 'fs.json'),
      JSON.stringify({ content: contentMap }, null, 2)
    );
  } else {
    // Generate per-file content (strip leading slash to avoid double-slash paths)
    const contentOutDir = resolve(outDir, 'content');
    if (!existsSync(contentOutDir)) {
      mkdirSync(contentOutDir, { recursive: true });
    }
    
    for (const [path, data] of Object.entries(contentMap)) {
      const safePath = path.replace(/^\/+/, '');
      const outPath = resolve(contentOutDir, safePath + '.json');
      mkdirSync(resolve(outPath, '..'), { recursive: true });
      writeFileSync(outPath, JSON.stringify(data, null, 2));
    }
  }
  
  // Generate search-index.json (use stripped HTML for readable snippets)
  const searchIndex = files
    .filter(f => f.ext === '.md')
    .map(f => {
      const content = contentMap[f.path];
      const html = content?.html || '';
      // Strip HTML tags, replacing with spaces to preserve word boundaries
      const text = html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/[\u200b-\u200f\u2028-\u202f\ufeff]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim();
      return {
        path: f.path,
        title: content?.title || f.title,
        text: text,
      };
    });
  
  writeFileSync(
    resolve(outDir, 'search-index.json'),
    JSON.stringify(searchIndex, null, 2)
  );
  
  // Generate theme.css
  runTheme(config, outDir);
  
  // Copy shell/ to dist/
  const shellDir = resolve(siteDir, 'shell');
  if (existsSync(shellDir)) {
    copyRecursive(shellDir, outDir);
  }
  
  // Copy public/ to dist/
  const publicDir = resolve(siteDir, 'public');
  if (existsSync(publicDir)) {
    copyRecursive(publicDir, outDir);
  }
  
  console.log(`Build complete: ${outDir}`);
  console.log(`Manifest: ${manifest.inlined ? 'inlined' : 'split'}`);
  console.log(`Total size: ${totalSize} bytes`);
}

/**
 * Recursively copy directory.
 */
function copyRecursive(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  
  const entries = readdirSync(src);
  
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      // Copy all files including README.md (inert bug — no README exists in shell/ dir)
      copyFileSync(srcPath, destPath);
    }
  }
}

build().catch(err => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
