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

  // Post-process: Add id attributes to headings for anchor targeting
  html = addHeadingIds(html);

  // Extract sections for search index
  const sections = extractSections(html);

  return {
    html,
    title: finalTitle,
    graphs,
    raw: content,
    sections,
  };
}

/**
 * Convert @@GRAPH:id@@ tokens to <canvas> elements.
 * @param {string} html - HTML content with @@GRAPH tokens
 * @returns {string} - HTML with canvas elements
 */
function convertGraphTokens(html) {
  return html.replace(/@@GRAPH:([^@]+)@@/g, (match, id) => {
    return `<canvas class="graph-canvas" data-graph-id="${id}"></canvas>`;
  });
}

/**
 * Extract first H1 heading from markdown content.
 */
function extractH1(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Slugify heading text for use as an HTML id.
 */
function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')       // strip any tags
    .replace(/[^a-z0-9\s-]/g, '')  // remove punctuation
    .replace(/\s+/g, '-')          // spaces to hyphens
    .replace(/-+/g, '-')           // collapse hyphens
    .replace(/^-|-$/g, '');        // trim leading/trailing hyphens
}

/**
 * Add id="slug" attributes to heading tags in HTML so sections are anchor-targetable.
 */
function addHeadingIds(html) {
  return html.replace(/<(h[1-6])([^>]*)>([^<]+)<\/h[1-6]>/g, (match, tag, attrs, text) => {
    if (attrs.includes(' id=')) return match; // already has an id
    const slug = slugifyHeading(text.trim());
    if (!slug) return match;
    return `<${tag}${attrs} id="${slug}">${text}</${tag}>`;
  });
}

/**
 * Extract sections from rendered HTML. Each section has a heading, an id, and content.
 * Returns an array of { id, heading, text } (text stripped of HTML tags).
 */
function extractSections(html) {
  const sections = [];
  const headingRegex = /<(h[1-6])[^>]*>([^<]+)<\/h[1-6]>/g;
  const tagRegex = /<[^>]*>/g;

  let matches = [];
  let m;
  while ((m = headingRegex.exec(html)) !== null) {
    matches.push({
      level: parseInt(m[1].charAt(1), 10),
      text: m[2].trim(),
      pos: m.index,
    });
  }

  if (matches.length === 0) return sections;

  let content = '';
  let i = 0;
  for (const heading of matches) {
    const slug = slugifyHeading(heading.text);
    sections.push({
      id: slug || `section-${i}`,
      heading: heading.text,
      text: content.replace(tagRegex, ' ').replace(/\s+/g, ' ').trim(),
    });
    content = html.slice(heading.pos, i + 1 < matches.length ? matches[i + 1].pos : html.length);
    i++;
  }

  return sections;
}

export default renderMarkdown;
