/**
 * shell/js/app.js — Terminal command loop + dispatcher.
 * 
 * Fetches manifest.json at startup, then initializes command loop.
 * Commands are registered in config and dispatched dynamically.
 * Search and charts commands live in separate modules.
 */

import { cmdSearch } from './search.js';
import { initGraphs } from './charts.js';
import { initRouter, updateHash, setRouterReady } from './router.js';
import { initButtons, resetBars } from './buttons.js';

// ── Shared State ──────────────────────────────────────────────────────────
let manifest = null;
let contentCache = {};
let currentDir = '/';
let commandHistory = [];
let historyIndex = -1;
let currentTheme = localStorage.getItem('terminalx-theme') || 'dark';
const commands = {};
let openModalActive = false;
const activeCharts = [];

// ── Theme ─────────────────────────────────────────────────────────────────
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('terminalx-theme', currentTheme);
  
  if (currentTheme === 'light') {
    document.documentElement.classList.add('light-mode');
    document.documentElement.classList.remove('dark-mode');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#f5f5f5');
  } else {
    document.documentElement.classList.add('dark-mode');
    document.documentElement.classList.remove('light-mode');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0a0e14');
  }
}

// ── Initialization ────────────────────────────────────────────────────────
async function init() {
  try {
    // Fetch manifest
    const manifestRes = await fetch('./manifest.json');
    if (!manifestRes.ok) {
      throw new Error(`Failed to load manifest: ${manifestRes.status}`);
    }
    manifest = await manifestRes.json();
    
    // Set window title and prompt from config
    document.title = manifest.config.site.title;
    updatePrompt();
    
    // Set titlebar path
    const titlebarEl = document.getElementById('titlebar-path');
    if (titlebarEl) titlebarEl.textContent = '/';
    
    // Apply saved theme
    if (currentTheme === 'light') {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark-mode');
    } else {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.classList.remove('light-mode');
    }
    
    // Fetch content (inlined or lazy)
    if (manifest.inlined) {
      const fsRes = await fetch('./fs.json');
      if (fsRes.ok) {
        const fsData = await fsRes.json();
        contentCache = fsData.content || {};
      }
    }
    
    // Initialize commands (built-in + imported modules)
    initCommands();
    
    // Expose globals for router and external use
    window.executeCommand = executeCommand;
    window.manifest = manifest;
    window.commands = commands;
    window.currentDir = currentDir;
    window.addOutputLine = addOutputLine;
    window.escapeHtml = escapeHtml;
    window.activeCharts = activeCharts;
    
    // Initialize router (handles initial hash + hashchange + landing)
    initRouter();
    setRouterReady();
    
    // Initialize command bar buttons
    initButtons(manifest);
    
  } catch (err) {
    console.error('Initialization error:', err);
    addOutputLine(`Error: ${err.message}`, 'error');
  }
}

// ── Command Registry ──────────────────────────────────────────────────────
function initCommands() {
  const enabled = manifest.config.commands.enabled;
  
  // Register built-in commands
  const builtins = {
    ls: (args) => cmdLs(args),
    open: (args) => cmdOpen(args),
    cat: (args) => cmdOpen(args), // alias to open
    cd: (args) => cmdCd(args),
    pwd: () => addOutputLine(currentDir),
    tree: (args) => cmdTree(args),
    clear: () => {
      document.getElementById('output').innerHTML = '';
    },
    help: () => {
      addOutputLine('Available commands:');
      enabled.forEach(cmd => {
        addOutputLine(`  ${cmd.padEnd(10)} - Built-in`);
      });
    },
    whoami: () => addOutputLine(`${manifest.config.site.user}@${manifest.config.site.host}`),
    date: () => addOutputLine(new Date().toString()),
    search: cmdSearch,
  };
  
  // Register enabled commands
  for (const cmd of enabled) {
    if (builtins[cmd]) {
      commands[cmd] = builtins[cmd];
    }
  }
  
  // Register aliases
  const aliases = manifest.config.commands.aliases || {};
  for (const [alias, target] of Object.entries(aliases)) {
    commands[alias] = commands[target];
  }
}

// ── Command Dispatch ──────────────────────────────────────────────────────

function executeCommand(input) {
  input = input.trim();
  if (!input) return;
  
  // Add to history
  commandHistory.push(input);
  historyIndex = commandHistory.length;
  
  // Add input line to output
  addOutputLine(`\n${getPrompt()} ${input}`);
  
  // Parse command and args
  const parts = input.split(/\s+/);
  const cmdName = parts[0].toLowerCase();
  const args = parts.slice(1);
  
  // Execute (async-safe)
  (async () => {
    if (commands[cmdName]) {
      try {
        const result = commands[cmdName](args);
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch (err) {
        addOutputLine(`Error: ${err.message}`, 'error');
      }
    } else {
      addOutputLine(`command not found: ${cmdName}`, 'error');
    }
    updateHash(cmdName, args);
    resetBars();
    // Refresh picker if active (e.g. after cd changes currentDir)
    if (window.updateArgumentPicker) window.updateArgumentPicker();
  })();
}

// ── Output & Prompt ───────────────────────────────────────────────────────
function addOutputLine(text, className = '') {
  const output = document.getElementById('output');
  const line = document.createElement('div');
  line.className = `output-line ${className}`;
  line.innerHTML = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function getPrompt() {
  const { user, host, promptSymbol } = manifest.config.site;
  return `<span class="user">${user}</span><span class="host">@${host}</span><span class="symbol">${promptSymbol}</span>`;
}

function updatePrompt() {
  document.getElementById('prompt').innerHTML = getPrompt();
}

// ── Command Implementations ───────────────────────────────────────────────

async function cmdLs(args) {
  const target = args[0] ? resolvePath(args[0]) : currentDir;
  const node = manifest.tree[target];
  
  if (!node) {
    addOutputLine(`No such file or directory: ${target}`, 'error');
    return;
  }
  
  if (node.type === 'dir') {
    if (target !== '/') {
      addOutputLine('..');
    }
    
    if (node.children) {
      for (const child of node.children) {
        const childPath = target === '/' ? `/${child}` : `${target}/${child}`;
        const childNode = manifest.tree[childPath];
        if (childNode) {
          const icon = childNode.type === 'dir' ? '📁' : '📄';
          addOutputLine(`${icon} ${child}${childNode.type === 'dir' ? '/' : ''}`);
        }
      }
    }
  } else {
    addOutputLine('Is a directory', 'error');
  }
}

async function cmdOpen(args) {
  if (!args[0]) {
    addOutputLine('usage: open <file> [@section]', 'warning');
    return;
  }

  const arg = args[0];
  const atIndex = arg.lastIndexOf('@');
  const filePath = atIndex >= 0 ? arg.slice(0, atIndex) : arg;
  const sectionId = atIndex >= 0 ? arg.slice(atIndex + 1) : null;

  const target = resolvePath(filePath);
  const node = manifest.tree[target];

  if (!node) {
    addOutputLine(`No such file or directory: ${target}`, 'error');
    return;
  }

  if (node.type === 'dir') {
    addOutputLine('Is a directory', 'error');
    return;
  }

  // Fetch content
  let content = contentCache[target];

  if (!content) {
    if (manifest.inlined) {
      addOutputLine('Error: content not found in manifest', 'error');
      return;
    }

    const fetchPath = target.replace(/^\/+/, '');
    addOutputLine('Loading...', 'info');
    try {
      const res = await fetch('./content/' + fetchPath + '.json');
      if (!res.ok) throw new Error('Failed to load: ' + res.status);
      content = await res.json();
      contentCache[target] = content;
    } catch (err) {
      addOutputLine('Error: ' + err.message, 'error');
      return;
    }
  }

  openFileModal(target, node, content, sectionId);
}

// ── File Open Modal ──────────────────────────────────────────────────────

function openFileModal(target, node, content, sectionId) {
  const overlay = document.getElementById('open-overlay');
  const titlePath = overlay.querySelector('.open-title-path');
  const body = overlay.querySelector('.open-body');

  // Close any existing charts to avoid duplicates
  destroyCharts();

  // Title bar
  const fileName = target.split('/').pop();
  titlePath.textContent = fileName;

  // File info line
  const ext = (node.ext || '').replace('.', '').toUpperCase();
  const size = node.size ? formatBytes(node.size) : '';
  const icon = ext === 'MD' ? '📝' : ext === 'JSON' ? '📋' : '📄';

  let infoHtml = `
    <div class="open-file-info">
      <span class="file-icon">${icon}</span>
      <span class="file-path">${escapeHtml(target)}</span>
      <span class="file-meta">${ext}${size ? ' · ' + size : ''}</span>
    </div>`;

  // Content
  let contentHtml = '';
  if (content.html) {
    contentHtml = content.html;
  } else if (content.raw) {
    contentHtml = `<pre class="open-raw">${escapeHtml(content.raw)}</pre>`;
  }

  body.innerHTML = infoHtml + contentHtml;

  // Show overlay
  overlay.classList.remove('hidden');
  openModalActive = true;

  // Scroll to section if specified
  if (sectionId) {
    requestAnimationFrame(() => {
      const target = body.querySelector(`#${CSS.escape(sectionId)}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        target.classList.add('search-target');
        setTimeout(() => target.classList.remove('search-target'), 1500);
      }
    });
  }

  // Initialize graphs after DOM update
  if (content.graphs && content.graphs.length > 0) {
    // Small delay to let the browser render the canvas elements
    requestAnimationFrame(() => {
      initGraphs(content.graphs);
    });
  }
}

function destroyCharts() {
  // Track charts manually since Chart.instances is deprecated in Chart.js 4
  activeCharts.forEach(chart => {
    try { chart.destroy(); } catch (e) { /* ignore */ }
  });
  activeCharts.length = 0;
}

function closeFileModal() {
  destroyCharts();

  const overlay = document.getElementById('open-overlay');
  overlay.classList.add('hidden');
  overlay.querySelector('.open-body').innerHTML = '';
  openModalActive = false;
}

function cmdCd(args) {
  if (!args[0] || args[0] === '~') {
    currentDir = '/';
  } else {
    const target = resolvePath(args[0]);
    const node = manifest.tree[target];
    
    if (!node) {
      addOutputLine(`No such file or directory: ${target}`, 'error');
      return;
    }
    
    if (node.type === 'file') {
      addOutputLine('Is not a directory', 'error');
      return;
    }
    
    currentDir = target;
  }
  
  const titlebarEl = document.getElementById('titlebar-path');
  if (titlebarEl) titlebarEl.textContent = currentDir;
}

function cmdTree(args) {
  const target = args[0] ? resolvePath(args[0]) : currentDir;
  renderTree(target, 0);
}

function renderTree(path, depth) {
  const node = manifest.tree[path];
  if (!node) return;
  
  const indent = '  '.repeat(depth);
  const icon = node.type === 'dir' ? '├── ' : '└── ';
  const name = path.split('/').pop() || '/';
  addOutputLine(`${indent}${depth === 0 ? '📂' : icon}${name}${node.type === 'dir' ? '/' : ''}`);
  
  if (node.type === 'dir' && node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childPath = path === '/' ? `/${child}` : `${path}/${child}`;
      renderTree(childPath, depth + 1);
    }
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────

function resolvePath(p) {
  let path = p;
  
  // Resolve relative paths by walking up/down
  if (!path.startsWith('/')) {
    path = `${currentDir}/${path}`;
  }
  
  // Normalize: collapse .. and . segments
  const parts = path.split('/').filter(Boolean);
  const normalized = [];
  for (const part of parts) {
    if (part === '..') {
      if (normalized.length > 0) normalized.pop();
    } else if (part !== '.') {
      normalized.push(part);
    }
  }
  
  return '/' + normalized.join('/');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ── Tab Completion ────────────────────────────────────────────────────────

let inputRef = null;

function completePath(parts, last) {
  // Check if the path starts with /
  const isAbsolutePath = last.startsWith('/');
  const segs = last.split('/').filter(Boolean);
  if (segs.length === 0) return;
  
  const prefix = segs[segs.length - 1];
  
  // Try to match against tree children of currentDir
  const currentDirNode = manifest.tree[currentDir];
  if (!currentDirNode || !currentDirNode.children) return;
  
  const matches = currentDirNode.children.filter(c => c.startsWith(prefix));
  
  if (matches.length === 1) {
    // Single match — complete this segment
    const replaced = prefix.replace(prefix, matches[0]);
    segs[segs.length - 1] = replaced;
    // If single match, check if it's a directory and append trailing /
    const completedPath = `${currentDir}/${segs[0]}`;
    if (manifest.tree[completedPath] && manifest.tree[completedPath].type === 'dir') {
      segs[segs.length - 1] = replaced + '/';
    }
    // Rebuild path preserving leading /
    const completedSegs = isAbsolutePath ? [''] : [];
    completedSegs.push(...segs);
    const completedPathStr = completedSegs.join('/');
    parts[parts.length - 1] = completedPathStr;
    if (inputRef) inputRef.value = parts.join(' ');
  } else if (matches.length > 1) {
    addOutputLine(`Available: ${matches.join(', ')}`);
  }
}

// ── Event Listeners ───────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('cmd-input');
  inputRef = input;
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeCommand(input.value);
      input.value = '';
    } else if (e.key === 'ArrowUp') {
      if (historyIndex > 0) {
        historyIndex--;
        input.value = commandHistory[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        input.value = commandHistory[historyIndex];
      } else {
        historyIndex = commandHistory.length;
        input.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (!manifest || !manifest.tree) return; // wait for manifest
      const parts = input.value.split(/\s+/);
      const last = parts[parts.length - 1] || '';
      
      if (last.includes('/')) {
        // Path completion — complete against tree
        completePath(parts, last);
      } else {
        // Command completion
        const matches = Object.keys(commands).filter(cmd => cmd.startsWith(last));
        if (matches.length === 1) {
          parts[parts.length - 1] = matches[0];
          input.value = parts.join(' ');
        } else if (matches.length > 1) {
          addOutputLine(`Available: ${matches.join(', ')}`);
        }
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      commands.clear();
    } else if (e.key === '/' && e.ctrlKey) {
      e.preventDefault();
      commands.help();
    } else if (e.key === 'b' && e.ctrlKey) {
      e.preventDefault();
      if (window.toggleCommandBar) window.toggleCommandBar();
    }
  });
  
  // Click to focus input
  // On touch devices, only tap the input line to focus — global click
  // handler interferes with scroll gestures and triggers the keyboard.
  // On desktop, clicking anywhere focuses the input for convenience.
  // Never focus input when the open modal is visible.
  if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) {
    document.addEventListener('click', (e) => {
      if (e.target.id !== 'cmd-input' && !openModalActive) {
        input.focus();
      }
    });
  } else {
    // Touch devices: only focus when tapping the input line itself
    document.getElementById('input-line').addEventListener('click', (e) => {
      if (e.target.id !== 'cmd-input') {
        input.focus();
      }
    });
  }

  // Global ESC key closes the open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openModalActive) {
      closeFileModal();
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // Open modal: close buttons
  const overlay = document.getElementById('open-overlay');
  if (overlay) {
    overlay.querySelector('.open-backdrop')?.addEventListener('click', closeFileModal);
    overlay.querySelector('.open-close-btn')?.addEventListener('click', closeFileModal);
    overlay.querySelector('.open-close-icon')?.addEventListener('click', closeFileModal);
  }
  
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTheme();
    });
  }
  
  // Initialize the app
  init();
});
