/**
 * build/walk.js — Recursively walk content/ directory, build tree map.
 * 
 * Returns:
 *   { tree, files } — tree map + list of all files with metadata
 */

import { readdirSync, statSync } from 'fs';
import { resolve, basename, extname } from 'path';

/**
 * Walk content directory and build tree map.
 * @param {string} contentDir — Absolute path to content/
 * @returns {{ tree: object, files: array }}
 */
export function walkDirectory(contentDir) {
  const tree = {};
  const files = [];

  // Create root directory entry
  tree['/'] = { type: 'dir', children: [] };

  function walk(dir, parentPath = '') {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      
      const fullPath = resolve(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        const dirKey = parentPath ? `${parentPath}/${entry}` : `/${entry}`;
        tree[dirKey] = { type: 'dir', children: [] };
        walk(fullPath, dirKey);
      } else {
        const fileKey = parentPath ? `${parentPath}/${entry}` : `/${entry}`;
        tree[fileKey] = {
          type: 'file',
          title: basename(entry, extname(entry)),
          ext: extname(entry),
          size: stat.size,
        };
        
        files.push({
          path: fileKey,
          fullPath,
          size: stat.size,
          ext: extname(entry),
          title: basename(entry, extname(entry)),
        });
      }
    }
  }

  walk(contentDir);

  // Populate children arrays for all directories
  for (const [path, node] of Object.entries(tree)) {
    if (node.type !== 'dir') continue;
    
    node.children = Object.keys(tree)
      .filter(p => p !== path)
      .map(p => {
        if (path === '/') {
          // Root: direct child means path after leading /
          const rel = p.slice(1);
          return rel.split('/')[0];
        } else {
          // Nested: check if p starts with {path}/
          const prefix = `${path}/`;
          if (!p.startsWith(prefix)) return null;
          const rel = p.slice(prefix.length);
          return rel.split('/')[0];
        }
      })
      .filter(v => v !== null)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }

  return { tree, files };
}

export default walkDirectory;
