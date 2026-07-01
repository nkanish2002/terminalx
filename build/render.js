/**
 * build/render.js — Render markdown files to HTML using markdown-it + gray-matter.
 * 
 * Features:
 * - gray-matter frontmatter parsing
 * - markdown-it with task-lists plugin
 * - Prism syntax highlighting (build-time, pass 1 scan for languages)
 * - Graph fence extraction
 */

import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import Prism from 'prismjs';
import { extractGraphs } from './graph.js';

// Language registry — maps language name to Prism component
const LANG_REGISTRY = {
  bash: 'prismjs/components/prism-bash.js',
  shell: 'prismjs/components/prism-bash.js',
  sh: 'prismjs/components/prism-bash.js',
  json: 'prismjs/components/prism-json.js',
  javascript: 'prismjs/components/prism-javascript.js',
  js: 'prismjs/components/prism-javascript.js',
  typescript: 'prismjs/components/prism-typescript.js',
  ts: 'prismjs/components/prism-typescript.js',
  python: 'prismjs/components/prism-python.js',
  py: 'prismjs/components/prism-python.js',
  css: 'prismjs/components/prism-css.js',
  html: 'prismjs/components/prism-markup.js',
  xml: 'prismjs/components/prism-markup.js',
  yaml: 'prismjs/components/prism-yaml.js',
  yml: 'prismjs/components/prism-yaml.js',
  markdown: 'prismjs/components/prism-markdown.js',
  md: 'prismjs/components/prism-markdown.js',
};

/**
 * Scan content for fenced code block languages.
 * Returns Set of language names found.
 */
export function scanLanguages(content) {
  const langs = new Set();
  const fenceRegex = /```(\w+)/g;
  let match;
  
  while ((match = fenceRegex.exec(content)) !== null) {
    langs.add(match[1]);
  }
  
  return langs;
}

/**
 * Dynamically load only the Prism languages that are used.
 * @param {Set<string>} langs - Set of language names to load
 */
export async function loadPrismLanguages(langs) {
  const toLoad = [];
  
  for (const lang of langs) {
    if (Prism.languages[lang]) continue; // Already loaded
    
    const component = LANG_REGISTRY[lang];
    if (component) {
      toLoad.push(component);
    }
  }
  
  // Load in parallel
  const imports = await Promise.allSettled(
    toLoad.map(path => import(path))
  );
  
  for (const result of imports) {
    if (result.status === 'rejected') {
      console.warn(`Warning: Failed to load Prism language:`, result.reason);
    }
  }
}

/** Initialize markdown-it with plugins */
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  highlight: function(str, lang) {
    if (lang && Prism.languages[lang]) {
      return `<pre class="language-${lang}"><code class="language-${lang}">${Prism.highlight(str, Prism.languages[lang], lang)}</code></pre>`;
    }
    return `<pre><code class="language-none">${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

md.use(taskLists);

/**
 * Render markdown file content to HTML.
 * @param {string} rawContent — Raw file content
 * @param {string} title — File title
 * @returns {{ html: string, title: string, graphs: array }}
 */
export async function renderMarkdown(rawContent, title) {
  const { data, content } = matter(rawContent);
  
  // Derive title from frontmatter or content
  const finalTitle = data.title || extractH1(content) || title;
  
  // Pass 1: Scan for languages and load Prism components
  const langs = scanLanguages(content);
  await loadPrismLanguages(langs);
  
  // Extract graph fences
  const { cleanedContent, graphs } = extractGraphs(content);
  
  // Render markdown to HTML
  let html = md.render(cleanedContent);
  
  // Post-process: Convert @@GRAPH:id@@ tokens to <canvas> elements
  html = convertGraphTokens(html);
  
  return {
    html,
    title: finalTitle,
    graphs,
    raw: content,
  };
}

/**
 * Convert @@GRAPH:id@@ tokens to <canvas> elements.
 * @param {string} html - HTML content with @@GRAPH tokens
 * @returns {string} - HTML with canvas elements
 */
function convertGraphTokens(html) {
  return html.replace(/@@GRAPH:([^@]+)@@/g, (match, id) => {
    return `<canvas data-graph-id="${id}" width="100%" height="200"></canvas>`;
  });
}

/**
 * Extract first H1 heading from markdown content.
 */
function extractH1(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

export default renderMarkdown;
