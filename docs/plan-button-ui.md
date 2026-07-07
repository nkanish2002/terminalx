# Plan: Button-Based Command UI for TerminalX

## Goal

Add an optional, non-intrusive button layer above the terminal input line so users can **click commands** and then **click arguments/paths** instead of typing everything manually. The text input and keyboard remain fully functional — buttons are a convenience layer, not a replacement.

---

## UX Flow

### Step 1 — Command Bar (always visible)

A compact horizontal bar of pill-style buttons sits above the `#input-line`, below `#output`. It shows every command from `config.commands.enabled`:

```
┌─────────────────────────────────────────────┐
│  ... terminal output                        │
├─────────────────────────────────────────────┤
│  [ ls ] [ cd ] [ open ] [ pwd ] [ tree ] ...│  ← command bar
├─────────────────────────────────────────────┤
│  user@host →                                │  ← input line (unchanged)
└─────────────────────────────────────────────┘
```

### Step 2 — Argument Picker (contextual, appears on command select)

When the user clicks a command button:
- The command name is inserted into `#cmd-input` (e.g., `cd `)
- A second bar appears below the command bar showing **contextual suggestions** based on the command:

| Command   | Suggestions shown                                        |
|-----------|----------------------------------------------------------|
| `cd`      | All directories at `currentDir` + `..` (if not root)     |
| `ls`      | All children at `currentDir` (dirs + files)              |
| `open`    | All files at `currentDir` (non-directories)              |
| `tree`    | All subdirectories at `currentDir`                       |
| `search`  | No suggestions (free-text query) — bar stays hidden      |
| `clear`, `pwd`, `help`, `whoami`, `date` | No args needed — auto-execute |

```
┌─────────────────────────────────────────────┐
│  ... terminal output                        │
├─────────────────────────────────────────────┤
│  [ ls ] [ cd ] [ open ] [ pwd ] [ tree ] ...│  ← command bar
├─────────────────────────────────────────────┤
│  [ /docs ] [ /projects ] [ /about ]         │  ← argument picker
├─────────────────────────────────────────────┤
│  user@host → cd                             │  ← input line
└─────────────────────────────────────────────┘
```

### Step 3 — Argument selection

When the user clicks a suggestion:
- The path is appended to the input (e.g., `cd /docs`)
- The argument picker stays visible so the user can change it
- User presses Enter to execute, or clicks a different command to reset

### Step 4 — Reset

The argument picker disappears when:
- User clears the input manually
- User types in the input (switching to manual mode)
- Command is executed (Enter pressed)
- User clicks `Escape`

---

## Architecture

### New Module: `shell/js/buttons.js`

A self-contained module that manages the button UI layer. It does **not** modify `app.js` core logic — it reads shared state and feeds back into the input element.

```js
// shell/js/buttons.js

export function initButtons(manifest) {
  // Build command bar DOM from manifest.config.commands.enabled
  // Attach click handlers → populate input + show argument picker
  // Expose: hidePicker(), updatePicker()
}

function buildCommandBar(enabledCommands) { ... }
function buildArgumentPicker(command, currentDir, tree) { ... }
function getSuggestions(command, currentDir, tree) { ... }
function insertIntoInput(text) { ... }
```

### Modified: `shell/index.html`

Two new container elements placed between `#output` and `#input-line`:

```html
<div id="output"></div>

<!-- NEW: Command bar -->
<div id="command-bar" class="button-bar hidden"></div>

<!-- NEW: Argument picker -->
<div id="argument-picker" class="button-bar hidden"></div>

<div id="input-line">
  <span id="prompt"></span>
  <input type="text" id="cmd-input" autocomplete="off" spellcheck="false" />
</div>
```

### Modified: `shell/css/terminal.css`

New styles for the button bars:

- `.button-bar` — flex row, scrollable horizontally on overflow, gap between pills
- `.cmd-btn` — pill-style button with terminal theming (border + hover glow)
- `.arg-btn` — similar to `.cmd-btn` but with a subtle visual distinction (e.g., different border color for dirs vs files)
- Mobile responsive: bars wrap to 2 rows on narrow screens

### Modified: `shell/js/app.js`

Minimal integration points:

1. **Import `initButtons`** and call it after manifest is loaded in `init()`
2. **Listen for `#cmd-input` changes** — if user types manually, hide the argument picker (they've taken over)
3. **On command execution** — hide the argument picker and reset the command bar state

---

## Config Integration

Add an optional config section so users can enable/disable the button bar:

```ts
// terminal.config.ts (new optional section)
export default defineConfig({
  // ...
  ui: {
    commandBar: {
      enabled: true,        // default: true
      alwaysVisible: true,  // show bar on load, or only on focus
    },
  },
});
```

This section flows through `manifest.config.ui` → consumed by `buttons.js` at init time.

---

## Key Design Decisions

### 1. Buttons augment, never replace keyboard

The `#cmd-input` is always present and functional. Buttons just populate it. Tab completion, history (↑/↓), and direct typing all continue to work.

### 2. Argument picker is contextual, not a full file browser

We don't build a nested file tree UI. The picker shows **one level** of suggestions based on `currentDir`. If the user wants to navigate deeper, they execute `cd` then re-click the command. This keeps the UI lightweight.

### 3. No framework dependencies

Consistent with TerminalX's vanilla JS philosophy. Buttons are plain `<button>` elements with CSS styling — no virtual DOM, no component libraries.

### 4. Framework boundary preserved

`buttons.js` reads only from `manifest` (config + tree) and `window.currentDir`. It never hardcodes paths, colors, or command names. All values come from the manifest/config contract.

---

## Implementation Order

### Phase 1 — Command Bar (MVP)
- [ ] Add `#command-bar` HTML container to `shell/index.html`
- [ ] Create `shell/js/buttons.js` with `initButtons()` 
- [ ] Build command buttons from `manifest.config.commands.enabled`
- [ ] Clicking a button inserts the command name into `#cmd-input`
- [ ] Style buttons in `shell/css/terminal.css` (pill design, terminal theme)
- [ ] Wire into `app.js` `init()` after manifest load
- [ ] Add `ui.commandBar` config option with defaults

### Phase 2 — Argument Picker
- [ ] Add `#argument-picker` HTML container
- [ ] Implement `getSuggestions(command, currentDir, tree)` for each command type
- [ ] Clicking a command button now also shows contextual suggestions
- [ ] Clicking a suggestion appends path to `#cmd-input`
- [ ] Auto-execute for zero-arg commands (clear, pwd, etc.)
- [ ] Hide picker on manual input, command execution, ESC

### Phase 3 — Polish
- [ ] Mobile responsive: wrap bars, touch-friendly tap targets (min 44px)
- [ ] Keyboard shortcut: `Ctrl+B` toggles bar visibility
- [ ] Visual distinction between dir suggestions (📁) and file suggestions (📄)
- [ ] Smooth show/hide animations (CSS transitions)
- [ ] Config option `alwaysVisible: false` — bar hides until input focused

### Phase 4 — Extended Commands (future)
- [ ] Support `search` button showing recent/popular search terms
- [ ] Custom button labels from config (e.g., `{ label: 'Browse', cmd: 'ls' }`)
- [ ] Multi-arg commands: `open` with path + optional `#heading` anchor

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Bars clutter the terminal aesthetic | Make them collapsible; `alwaysVisible: false` option |
| Mobile screens too narrow for all buttons | Horizontal scroll + wrap; `overflow-x: auto` |
| Buttons slow down for large file trees | Picker shows only `currentDir` children (one level), uses existing tree data |
| Interference with existing tab completion | Manual typing hides the picker; tab completion continues to work independently |

---

## Testing Checklist (additions to existing)

- [ ] Command bar renders all enabled commands from config
- [ ] Clicking a command button inserts command into input
- [ ] Argument picker shows correct suggestions per command type
- [ ] Clicking a suggestion appends to input correctly
- [ ] Auto-execute works for zero-arg commands
- [ ] Picker hides on manual input / ESC / command execution
- [ ] Tab completion still works alongside buttons
- [ ] Mobile: bars wrap or scroll, tap targets are ≥44px
- [ ] `ui.commandBar.enabled: false` hides bars completely
- [ ] `Ctrl+B` toggles bar visibility
