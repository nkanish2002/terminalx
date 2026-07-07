/**
 * shell/js/buttons.js — Command bar + argument picker UI.
 *
 * Renders a row of command buttons above the input line.
 * When a command is selected, shows contextual argument suggestions
 * based on currentDir and the file tree.
 *
 * Reads from: window.manifest, window.currentDir
 * Writes to: #cmd-input (populates command text)
 */

const COMMAND_BAR = 'command-bar';
const ARG_PICKER = 'argument-picker';

// Commands that take no arguments — auto-execute on click
const NO_ARG_COMMANDS = new Set(['clear', 'help', 'pwd', 'whoami', 'date']);

// Commands that take a file argument (non-directory)
const FILE_COMMANDS = new Set(['open', 'cat']);

// Commands that take a directory argument
const DIR_COMMANDS = new Set(['cd', 'tree']);

// Commands that take any child (dir or file)
const ANY_COMMANDS = new Set(['ls']);

let activeCommand = null;
let commandBarVisible = true;
let alwaysVisible = true;

/**
 * Initialize the command bar and argument picker.
 * Called after manifest is loaded.
 */
export function initButtons(manifest) {
  const cmdBar = document.getElementById(COMMAND_BAR);
  if (!cmdBar) return;

  const uiConfig = manifest.config.ui || {};
  const barConfig = uiConfig.commandBar || {};
  alwaysVisible = barConfig.alwaysVisible !== false; // default: true

  const enabled = manifest.config.commands.enabled || [];
  const picker = document.getElementById(ARG_PICKER);

  // Build command bar buttons
  for (const cmd of enabled) {
    const btn = document.createElement('button');
    btn.className = 'cmd-btn';
    btn.textContent = cmd;
    btn.addEventListener('click', () => onCommandClick(cmd));
    cmdBar.appendChild(btn);
  }

  // Show/hide command bar based on config
  if (alwaysVisible) {
    cmdBar.classList.remove('hidden');
  } else {
    // Hidden until input is focused
    cmdBar.classList.add('hidden');
  }

  // Listen for input focus/blur when alwaysVisible is false
  const input = document.getElementById('cmd-input');
  if (input) {
    input.addEventListener('input', () => {
      // If the input doesn't start with the active command + space, user is typing manually
      if (activeCommand && !input.value.startsWith(activeCommand + ' ')) {
        hidePicker();
        activeCommand = null;
      }
    });

    if (!alwaysVisible) {
      input.addEventListener('focus', () => {
        const bar = document.getElementById(COMMAND_BAR);
        if (bar) bar.classList.remove('hidden');
      });
      input.addEventListener('blur', () => {
        // Delay hide so clicking a button still works
        setTimeout(() => {
          if (document.activeElement !== input && !openModalIsActive()) {
            const bar = document.getElementById(COMMAND_BAR);
            if (bar) bar.classList.add('hidden');
            hidePicker();
          }
        }, 200);
      });
    }
  }

  // Expose update so app.js can refresh suggestions after cd
  window.updateArgumentPicker = () => {
    if (activeCommand) {
      renderPicker(activeCommand);
    }
  };

  // Expose toggle for keyboard shortcut
  window.toggleCommandBar = toggleCommandBar;
}

/**
 * Toggle command bar visibility (Ctrl+B shortcut).
 */
function toggleCommandBar() {
  const cmdBar = document.getElementById(COMMAND_BAR);
  if (!cmdBar) return;

  commandBarVisible = !commandBarVisible;
  if (commandBarVisible) {
    cmdBar.classList.remove('hidden');
    hidePicker();
  } else {
    cmdBar.classList.add('hidden');
    hidePicker();
  }
}

function openModalIsActive() {
  return window.openModalActive || false;
}

/**
 * Called when a command button is clicked.
 */
function onCommandClick(cmd) {
  const input = document.getElementById('cmd-input');
  if (!input) return;

  activeCommand = cmd;

  if (NO_ARG_COMMANDS.has(cmd)) {
    // Auto-execute commands that take no arguments
    input.value = cmd;
    hidePicker();
    // Trigger execution
    if (window.executeCommand) {
      window.executeCommand(cmd);
    }
    return;
  }

  // Populate input with command + trailing space
  input.value = cmd + ' ';
  input.focus();

  // Render contextual argument suggestions
  renderPicker(cmd);
}

/**
 * Render the argument picker for a given command.
 */
function renderPicker(cmd) {
  const picker = document.getElementById(ARG_PICKER);
  if (!picker) return;

  // Clear existing buttons
  picker.innerHTML = '';

  // Get suggestions from the tree
  const suggestions = getSuggestions(cmd);
  if (suggestions.length === 0) {
    hidePicker();
    return;
  }

  for (const item of suggestions) {
    const btn = document.createElement('button');
    btn.className = `arg-btn ${item.type === 'dir' ? 'arg-dir' : 'arg-file'}`;
    btn.textContent = item.label;
    btn.addEventListener('click', () => onArgumentClick(item.value));
    picker.appendChild(btn);
  }

  // Show picker
  picker.classList.remove('hidden');
}

/**
 * Called when an argument suggestion button is clicked.
 */
function onArgumentClick(value) {
  const input = document.getElementById('cmd-input');
  if (!input || !activeCommand) return;

  // Set input to "command <arg>"
  input.value = activeCommand + ' ' + value;
  input.focus();

  // Keep picker visible so user can switch arguments
  // (hide on execution instead)
}

/**
 * Get contextual suggestions for a command.
 */
function getSuggestions(cmd) {
  const manifest = window.manifest;
  const currentDir = window.currentDir;
  if (!manifest || !manifest.tree) return [];

  const node = manifest.tree[currentDir];
  if (!node || !node.children) {
    // Root edge case — try '/'
    const rootNode = manifest.tree['/'];
    if (!rootNode || !rootNode.children) return [];
    return buildSuggestions(rootNode.children, '/', cmd);
  }

  return buildSuggestions(node.children, currentDir, cmd);
}

/**
 * Build suggestion items from children list.
 */
function buildSuggestions(children, parentPath, cmd) {
  const manifest = window.manifest;
  const suggestions = [];

  // Add ".." for cd if not at root
  if (DIR_COMMANDS.has(cmd) && parentPath !== '/') {
    const parent = parentPath.split('/').slice(0, -1).join('/') || '/';
    suggestions.push({ label: '..', value: '..', type: 'dir' });
  }

  for (const child of children) {
    const childPath = parentPath === '/' ? `/${child}` : `${parentPath}/${child}`;
    const childNode = manifest.tree[childPath];
    const type = childNode ? childNode.type : 'file';

    // Filter by command type
    if (FILE_COMMANDS.has(cmd) && type === 'dir') continue;
    if (DIR_COMMANDS.has(cmd) && type === 'file') continue;

    const icon = type === 'dir' ? '📁' : '📄';
    const label = `${icon} ${child}${type === 'dir' ? '/' : ''}`;
    const value = type === 'dir' ? childPath : childPath;

    suggestions.push({ label, value, type });
  }

  return suggestions;
}

/**
 * Hide the argument picker.
 */
export function hidePicker() {
  const picker = document.getElementById(ARG_PICKER);
  if (picker) picker.classList.add('hidden');
  activeCommand = null;
}

/**
 * Reset both bars (called after command execution).
 */
export function resetBars() {
  hidePicker();
  activeCommand = null;
}
