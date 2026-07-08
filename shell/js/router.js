/**
 * shell/js/router.js — Hash-route deep-linking.
 * 
 * Parses hash routes like #/open/docs/readme.md and runs commands.
 * Handles initial load, hashchange, and "no hash" default landing.
 */

let hashChangePending = false;

/**
 * Set ready state after init() completes.
 * Called from app.js once executeCommand and manifest are available on window.
 */
export function setRouterReady() {
  // If there's a hash, handle it. Otherwise run the landing command.
  const hash = (window.location.hash || '').replace(/^#!?/, '').replace(/^\//, '');
  if (hash) {
    handleHash(hash);
  } else {
    runLanding();
  }
}

/**
 * Run the landing command from config.
 */
function runLanding() {
  const landing = window.manifest?.config?.content?.landing || 'open /docs/readme.md';
  const parts = landing.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);
  window.executeCommand(`${cmd} ${args.join(' ')}`);
}

/**
 * Handle a parsed hash string.
 */
function handleHash(hash) {
  const parts = hash.split('/').filter(Boolean);
  const cmd = parts[0];
  const args = parts.slice(1);
  
  if (window.commands && window.commands[cmd]) {
    window.executeCommand(`${cmd} ${args.join('/')}`);
  } else {
    // Unknown command — show terminal-styled not found
    const output = document.getElementById('output');
    if (output) {
      const errLine = document.createElement('div');
      errLine.className = 'output-line error';
      errLine.textContent = `command not found: ${cmd} ${args.join(' ')}`;
      output.appendChild(errLine);
      if (window.getShouldAutoScroll && window.getShouldAutoScroll()) {
        output.scrollTop = output.scrollHeight;
      }
    }
  }
}

/**
 * Initialize hash routing.
 * Sets up the hashchange listener only — initial hash is handled by setRouterReady().
 */
export function initRouter() {
  window.addEventListener('hashchange', () => {
    if (hashChangePending) {
      hashChangePending = false;
      return;
    }
    
    const hash = (window.location.hash || '').replace(/^#!?/, '').replace(/^\//, '');
    if (hash) {
      handleHash(hash);
    }
  });
}

/**
 * Commands whose first argument is a file/directory path
 * that needs to be resolved against the current working directory
 * before encoding into the hash for deep-linking.
 */
const PATH_COMMANDS = new Set(['open', 'cat', 'ls', 'cd', 'tree']);

/**
 * Update hash for deep linking.
 * @param {string} cmdName - Command name
 * @param {string[]} args - Command arguments
 * @param {string} currentDir - Current working directory
 */
export function updateHash(cmdName, args, currentDir) {
  if (cmdName && cmdName !== 'clear' && !hashChangePending) {
    // Resolve relative path args so the hash is always an absolute path
    const resolvedArgs = PATH_COMMANDS.has(cmdName) && args.length > 0
      ? [resolveArgPath(args[0], currentDir), ...args.slice(1)]
      : args;
    hashChangePending = true;
    window.location.hash = `/${cmdName}/${resolvedArgs.join('/')}`;
  }
}

/**
 * Resolve a single argument path against currentDir.
 * Absolute paths (starting with /) are returned as-is.
 */
function resolveArgPath(arg, currentDir) {
  if (arg.startsWith('/')) return arg;
  const base = currentDir === '/' ? '' : currentDir;
  return `${base}/${arg}`;
}
