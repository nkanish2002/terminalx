/**
 * shell/js/router.js — Hash-route deep-linking.
 * 
 * Hash format: #path|cmd|args
 *   - path: current working directory (always present, defaults to /)
 *   - cmd: command that opened content in the modal (only when modal is open)
 *   - args: arguments passed to that command (only when modal is open)
 * 
 * Examples:
 *   #/                  — root, nothing open (run landing)
 *   #/docs              — in /docs, nothing open (cd + run landing)
 *   #/docs|open|/docs/readme.md  — in /docs, readme.md open in modal
 * 
 * Handles initial load, hashchange, and "no hash" default landing.
 */

let hashChangePending = false;

/**
 * Set ready state after init() completes.
 * Called from app.js once executeCommand and manifest are available on window.
 */
export function setRouterReady() {
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
 * Handle a parsed hash string in the new three-section format.
 * Format: path|cmd|args  (cmd and args are optional)
 */
function handleHash(hash) {
  // Split on '|' to separate the three sections
  const pipeIndex = hash.indexOf('|');

  if (pipeIndex >= 0) {
    // Three-section format: path|cmd|args
    const path = hash.slice(0, pipeIndex);
    const remainder = hash.slice(pipeIndex + 1);
    const spaceIndex = remainder.indexOf(' ');
    const cmd = spaceIndex >= 0 ? remainder.slice(0, spaceIndex) : remainder;
    const args = spaceIndex >= 0 ? remainder.slice(spaceIndex + 1) : '';

    // Navigate to the path first (if different from current)
    if (path && path !== window.currentDir) {
      window.executeCommand(`cd ${path}`);
    }

    // Execute the command with args
    if (cmd && window.commands && window.commands[cmd]) {
      window.executeCommand(args ? `${cmd} ${args}` : cmd);
    } else if (cmd) {
      // Unknown command
      const output = document.getElementById('output');
      if (output) {
        const errLine = document.createElement('div');
        errLine.className = 'output-line error';
        errLine.textContent = `command not found: ${cmd}`;
        output.appendChild(errLine);
        if (window.getShouldAutoScroll && window.getShouldAutoScroll()) {
          output.scrollTop = output.scrollHeight;
        }
      }
    }
  } else {
    // Path-only format (no command/args) — navigate to path + run landing
    const path = hash;
    if (path && path !== window.currentDir) {
      window.executeCommand(`cd ${path}`);
    }
    runLanding();
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
 * Update hash for deep linking.
 * Uses three-section format: #path|cmd|args
 * 
 * When called from openFileModal with cmdName/args, writes the full
 * three-section hash.
 * When called from closeFileModal (no cmdName), writes path-only hash.
 * When called from executeCommand for non-modal commands while modal is
 * open, preserves the existing cmd|args from the current hash and only
 * updates the path (e.g. for cd while modal is visible).
 * 
 * @param {string} cmdName - Command name (set when modal opens, null when closed)
 * @param {string[]} args - Command arguments
 * @param {string} currentDir - Current working directory
 */
export function updateHash(cmdName, args, currentDir) {
  if (hashChangePending) return;

  // Skip hash update for 'clear' command
  if (cmdName === 'clear') return;

  hashChangePending = true;

  if (cmdName) {
    // Modal is opening — write full three-section hash
    const argsJoined = args.filter(Boolean).join(' ');
    window.location.hash = `/${currentDir}|${cmdName}|${argsJoined}`;
  } else if (window.openModalActive) {
    // Modal is open but no new cmdName — preserve existing cmd|args,
    // update only the path (e.g. cd while modal is visible)
    const currentHash = (window.location.hash || '').replace(/^#!?/, '').replace(/^\//, '');
    const pipeIndex = currentHash.indexOf('|');
    if (pipeIndex >= 0) {
      const remainder = currentHash.slice(pipeIndex);
      window.location.hash = `/${currentDir}${remainder}`;
    } else {
      window.location.hash = currentDir || '/';
    }
  } else {
    // Modal is not open — hash is path only
    window.location.hash = currentDir || '/';
  }
}
