# AGENT.md — TerminalX

## Project Identity

**TerminalX** is a reusable static-site framework that produces interactive terminal-style SPAs from Markdown content. Think "Docusaurus, but the site is a terminal you type commands into."

- **This is a framework, not a finished site.** The content under `content/` is a bundled starter/example for development and demo purposes only.
- **Distribution model:** published as an npm package (`terminalx`). Consumers run `terminalx new my-site`, add Markdown, and build.
- **Hard rule:** `build/` and `shell/` must never hardcode content paths, prompt text, colors, or titles. All user-facing values come from `terminal.config.ts`.

## Repository Structure

```
terminalx/
├── bin/                    # CLI entry points (framework)
│   ├── terminalx.js        #  CLI: build | dev | new <dir>
│   └── scaffold.js         #  terminalx new template generator
├── build/                  # Content pipeline modules (framework)
│   ├── index.js            #  Orchestrator: wires steps, emits outputs
│   ├── config.js           #  Load terminal.config.ts via jiti, validate, merge defaults
│   ├── walk.js             #  Recursive content/ walk → tree map
│   ├── render.js           #  gray-matter + markdown-it → {title, html, graphs}
│   ├── graph.js            #  Extract ```graph fences → sentinel tokens + configs
│   ├── theme.js            #  Generate dist/css/theme.css from config.theme
│   └── dev.js              #  chokidar watch mode
├── shell/                  # Terminal SPA template (framework)
│   ├── index.html          #  Terminal chrome (titlebar, output, input)
│   ├── css/
│   │   ├── terminal.css    #  Layout/structure (references theme CSS vars)
│   │   └── prism-terminal.css  # Prism token → terminal palette mapping
│   └── js/
│       ├── app.js          #  Command loop + dispatcher (ls/cat/cd/...)
│       ├── buttons.js      #  Command bar + argument picker UI
│       ├── router.js       #  Hash-route deep-linking
│       ├── search.js       #  Client-side search over search-index.json
│       └── charts.js       #  Chart.js lazy loader + graph renderer
├── index.js                # Public API: defineConfig() helper
├── terminal.config.ts      # User-facing config (starter example)
├── content/                # Starter/example Markdown content
├── public/                 # Static passthrough (404.html, etc.)
├── dist/                   # Build output (gitignored)
└── .github/workflows/deploy.yml  # GitHub Pages CI/CD
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Build runtime | Node.js (ESM) | Pipeline execution |
| Config loading | `jiti` | Load `.ts` config without compilation |
| Markdown parsing | `markdown-it` + `gray-matter` + `markdown-it-task-lists` | MD → HTML, frontmatter, task lists |
| Syntax highlighting | `prismjs` (build-time) | Fenced code blocks highlighted at build |
| File watching | `chokidar` | Dev mode rebuild on change |
| Charts | `chart.js` (CDN, lazy) | Graph rendering from ```graph fences |
| Shell | Vanilla HTML/CSS/JS | Terminal SPA, zero framework |
| Deploy | GitHub Actions → Pages | CI/CD via upload-pages-artifact |

## Configuration System

`terminal.config.ts` is the **single source of truth** for all user-customizable values:

```ts
import { defineConfig } from 'terminalx';

export default defineConfig({
  site: { title, user, host, promptSymbol },
  theme: { bg, surface, border, green, cyan, yellow, red, purple, white, fontFamily, fontSize },
  content: { dir, landing, home },
  commands: { enabled: string[], aliases: Record<string, string> },
  search: { snippetChars, fields },
  charts: { defaultType, palette },
  build: { outDir, inlineThreshold, basePath },
  ui: { commandBar: { enabled, alwaysVisible } },
});
```

**Config flow:**
1. `build/config.js` loads via `jiti` (tries `.ts` → `.js` → `.mjs`)
2. Deep-merges over built-in `DEFAULTS` (partial configs are valid)
3. Validates required sections
4. **Style** (`theme.*`) → `build/theme.js` → generated `dist/css/theme.css` (CSS custom properties)
5. **Behavior** (`site`, `content.landing`, `commands`, `charts`, `ui`) → embedded in `manifest.config` → read by `app.js` at runtime
6. **Build-only** (`content.dir`, `build.*`, `search.*`) → consumed by pipeline only, never shipped

## Build Pipeline

`build/index.js` orchestrates these steps in order:

1. **Load config** → `config.js`
2. **Walk content/** → `walk.js` produces `{ tree, files }`
3. **Render Markdown** → `render.js` per `.md` file:
   - `gray-matter` strips frontmatter → `title`
   - `graph.js` extracts ```graph fences → sentinel tokens + graph configs
   - `markdown-it` renders cleaned content → HTML (with Prism syntax highlighting)
   - Post-render: swap `@@GRAPH:id@@` tokens → `<canvas data-graph-id="id">`
   - Non-`.md` files: store `raw` content only
4. **Emit manifest.json** → always generated (config + tree + metadata)
5. **Emit content** → `fs.json` if total size ≤ `inlineThreshold`; else per-file `content/<path>.json`
6. **Emit search-index.json** → `[{path, title, text}]` for client-side search
7. **Generate theme.css** → `theme.js`
8. **Copy shell/** + **public/** → `dist/`

### Data Contracts

**manifest.json** (always emitted, loaded at SPA startup):
```json
{
  "generatedAt": "...",
  "inlined": true,
  "config": { "site": {...}, "content": {...}, "commands": {...}, "charts": {...}, "ui": {...} },
  "tree": { "/": { "type": "dir", "children": [...] }, ... }
}
```

**fs.json** (when inlined):
```json
{ "content": { "/path.md": { "html": "...", "graphs": [...], "raw": "..." }, ... } }
```

**search-index.json**:
```json
[{ "path": "/docs/readme.md", "title": "Welcome", "text": "stripped body text..." }]
```

## Shell SPA

The SPA (`shell/index.html` + `shell/js/`) runs entirely client-side after build:

- **Startup:** fetch `manifest.json` → config + tree; if `inlined: true`, fetch `fs.json` to seed content cache
- **Commands:** `ls`, `open`, `cd`, `pwd`, `tree`, `clear`, `help`, `whoami`, `date`, `search` — gated by `config.commands.enabled`
- **`open` flow:** resolve path → check cache → if not inlined, `fetch` per-file JSON → open scrollable modal overlay with file content → init graphs if present
- **Modal:** `#open-overlay` is a fixed-position overlay with its own scrollable body. Desktop: 720px centered island. Mobile: full-screen. Close via ESC, backdrop tap, or titlebar buttons.
- **Routing:** hash-based (`#/open/docs/readme.md`). On load with no hash → run `config.content.landing` command
- **Tab completion:** commands + file paths from tree
- **Command bar + argument picker:** optional button layer above input line. Command bar shows pill buttons for all enabled commands. Clicking a command inserts it into the input and (for commands that take arguments) shows contextual path suggestions from the file tree. Zero-arg commands (`clear`, `pwd`, `whoami`, `date`, `help`) auto-execute on click. Controlled by `config.ui.commandBar`. Manual typing hides the picker. Toggle with `Ctrl+B`.
- **History:** ↑/↓ arrows
- **Theme toggle:** dark/light via `localStorage` + CSS class swap
- **`cat`**: kept as an alias to `open` for backward compatibility

## Development Workflow

```bash
# Install dependencies
npm install

# Dev mode (watch + rebuild)
npm run dev        # or: node bin/terminalx.js dev

# Production build
npm run build      # or: node bin/terminalx.js build

# Scaffold a new site
node bin/terminalx.js new <directory>

# Clean
npm run clean      # rm -rf dist/
```

**Dev mode:** `build/dev.js` runs an initial build, then watches `content/` and `shell/` for changes and rebuilds. Note: there is currently no integrated static server in dev mode — serve `dist/` manually or use `npx sirv dist`.

## Key Conventions

1. **Framework boundary is sacred.** Nothing in `build/` or `shell/` references specific content. If you find a hardcoded path, color, or title in the engine, it's a bug.
2. **Build-time over runtime.** Markdown is rendered to HTML at build time. The shell injects pre-rendered HTML — it does not parse Markdown.
3. **Hash routing only.** No clean URLs, no server-side routing. Hash routes are shareable and immune to base-path issues on GitHub Pages.
4. **Graph fences use sentinel tokens.** `graph.js` extracts ```graph blocks → `@@GRAPH:id@@` placeholders → markdown-it renders these as text → post-render swaps for `<canvas>` elements. This keeps markdown-it's `html: false` setting intact.
5. **Prism is build-time only.** Languages are scanned from content, only needed Prism components are loaded. No client-side syntax highlighting.
6. **CSS variables drive theming.** `terminal.css` references `var(--green)`, etc. The actual values come from generated `theme.css`. Never hardcode colors in `terminal.css`.
7. **ES modules throughout.** All JS uses `import`/`export`. `package.json` has `"type": "module"`.

## Testing Checklist

When making changes, verify:

- [ ] `npm run build` completes without errors
- [ ] `dist/manifest.json` is valid JSON with expected structure
- [ ] Open `dist/index.html` in a browser — terminal loads, prompt renders
- [ ] `ls` shows directory tree, `cd` navigates, `open` renders Markdown in modal
- [ ] `search <query>` returns results with snippets, clicking results opens files
- [ ] Hash routing: `#/open/docs/readme.md` loads content directly in modal
- [ ] Graph rendering: `open /projects/portfolio/overview.md` shows charts in modal
- [ ] Modal closes on ESC, backdrop click, or titlebar buttons
- [ ] Tab completion works for commands and paths
- [ ] Theme toggle (dark/light) persists
- [ ] Command bar renders all enabled commands from config
- [ ] Clicking a command button inserts it into input
- [ ] Argument picker shows correct suggestions per command type (dirs for cd, files for open, all for ls)
- [ ] Zero-arg commands auto-execute on button click
- [ ] `Ctrl+B` toggles bar visibility
- [ ] `ui.commandBar.alwaysVisible: false` hides bar until input focused

## Changelog / Resolved Issues

### 2026-07-07 — Command bar + argument picker button UI
- **New `shell/js/buttons.js`**: Self-contained module rendering a command bar (pill buttons for all enabled commands) and a contextual argument picker above the input line. Zero-arg commands (`clear`, `pwd`, `whoami`, `date`, `help`) auto-execute on click. Directory suggestions shown in `--cyan`, file suggestions in `--yellow`.
- **`Ctrl+B` keyboard shortcut** (`shell/js/app.js`): Toggles command bar visibility.
- **Smooth show/hide animations** (`shell/css/terminal.css`): Fade + slide via CSS transitions on `opacity` and `max-height`.
- **`ui.commandBar` config option** (`build/config.js`, `terminal.config.ts`): `enabled` (default `true`) and `alwaysVisible` (default `true`; set `false` to hide until input focused). Flows through `manifest.config.ui` to `buttons.js` at runtime.
- **Mobile responsive** (`shell/css/terminal.css`): Bars wrap to multiple rows on narrow screens; minimum 44px tap targets.
- **Manifest now ships `ui` config** (`build/index.js`): Added `ui` section to emitted `manifest.json`.

### 2026-07-07 — cat → open modal viewer
- **`cat` output was unscrollable** (`shell/js/app.js`, `shell/css/terminal.css`): Content dumped into `#output` could not scroll on mobile due to `overflow: hidden` on `html`/`body`. Replaced `cat` with `open` command that shows a centered scrollable modal overlay. Desktop: 720px island with backdrop blur. Mobile: full-screen overlay. `cat` kept as alias.
- **`ls` silently changed directory** (`shell/js/app.js`): `ls /some/dir` changed `currentDir` as a side effect. Removed — only `cd` changes directory now.
- **`search` results opened with stale `cat`** (`shell/js/search.js`): Click handlers called `executeCommand('cat ' + path)` but `cat` was replaced with `open`. Updated to use `open`.
- **Desktop click-to-focus fired inside modal** (`shell/js/app.js`): Global click handler focused the input even when the open modal was visible, interfering with backdrop close. Added `!openModalActive` guard.
- **`executeCommand` didn't await async commands**: `cmdOpen` is async but dispatch was fire-and-forget. Wrapped in async IIFE with proper await.
- **Duplicate `window.*` assignments in `init()`**: Global state was set twice. Removed the duplicate block.
- **Duplicate ESC keydown listeners**: Two separate listeners on `input` and `document`. Consolidated into one global handler.
- **`Chart.instances` deprecated in Chart.js 4** (`shell/js/charts.js`, `shell/js/app.js`): Manual `activeCharts` array tracks chart instances for cleanup. `closeFileModal()` destroys tracked charts.
- **`terminal.config.ts` landing updated**: Changed from `cat /docs/readme.md` to `open /docs/readme.md`.

### 2026-07-07 — Graph rendering reference bug + mobile scroll fix
- **Graph rendering silently failed** (`shell/js/charts.js`): In `renderAll()`, `const graphs = pendingGraphs` was a reference assignment, not a copy. The next line `pendingGraphs.length = 0` emptied both arrays simultaneously, so the `for...of` loop iterated over an empty array — graphs were never rendered. Fixed by replacing with `pendingGraphs.splice(0)` which returns a copy and clears the original atomically.
- **Mobile scroll blocked by keyboard** (`shell/js/app.js`): The global click-to-focus handler triggered on every tap outside the input, including touch-scroll gestures on `#output`. After a scroll, the subsequent click event opened the mobile keyboard, preventing further scrolling. Fixed with `touchstart`/`touchmove` listeners that track scroll intent (>5px movement); the click handler now skips focusing the input when a scroll is detected.
- **Mobile viewport height mismatch** (`shell/css/terminal.css`): `html` used `height: 100%` while `body` used `100dvh`, causing a height mismatch on iOS Safari with its dynamic address bar. Both now use `100dvh`. Added `touch-action: pan-y` on `#output` in the mobile media query for explicit vertical scroll gesture handling.

### 2026-07-06 — Chart.js race + config import fixes
- **Chart.js double-load race** (`shell/js/charts.js`): `chartJsReady = true` was set before the CDN script finished loading, causing `initGraphs()` calls during the load window to skip `ensureChartJs()` and render with `Chart` undefined — graphs failed silently. Fixed by adding a `chartJsLoading` dedup flag; `ensureChartJs()` now waits for in-flight loads, and `renderAll()` re-queues graphs if `Chart` is still undefined.
- **Config import resolution** (`terminal.config.ts`): bare specifier `from 'terminalx'` couldn't be resolved by jiti, so the user's overrides silently fell back to defaults. Changed to `from './index.js'`.
- **Proxy/spread issue**: `JSON.parse(JSON.stringify(graphs))` clone guard added to `initGraphs()` to avoid spreading Proxy objects from `fs.json`.

### 2026-07-06 — Chart rendering test suite
- Added `test/charts.test.js`: 67 tests covering the full chart pipeline (build extraction → HTML canvas → data structure → canvas-graph pairing → bundled output → source module exports). Run with `node test/charts.test.js`.

---

## Common Pitfalls

- **Graph rendering fails:** Ensure `graph.js` sentinel tokens are properly swapped in `render.js` post-render. The HTML must contain `<canvas data-graph-id="...">` elements. The `initGraphs()` call in `app.js` must be awaited (commands are dispatched through async IIFE in `executeCommand`), and `charts.js` deduplicates Chart.js loads via a `chartJsLoading` flag to prevent double-load races. Graph configs from `fs.json` are cloned via `JSON.parse(JSON.stringify())` before spreading to avoid Proxy issues. **Critical:** `renderAll()` must use `pendingGraphs.splice(0)` (not `pendingGraphs` + `length = 0`) to avoid the reference-emptying bug. Chart instances are tracked in `window.activeCharts` for manual cleanup — `Chart.instances` is deprecated in Chart.js 4.
- **Mobile scroll fails:** The click-to-focus handler in `app.js` must not activate on touch devices outside the input line. On desktop, the handler must check `!openModalActive` to avoid interfering with the open modal. Set `touch-action: pan-y` on `#output` for explicit vertical scroll on mobile. The `open` modal has its own scrollable body separate from the terminal output.
- **Build dev mode missing server:** `build/dev.js` watches and rebuilds but does not serve. Use `npx sirv dist` or `python -m http.server` separately.
- **Config not loading:** `jiti` needs the site directory as its working context. The `SITE_DIR` env var is passed by `bin/terminalx.js`.
- **Theme variables not applied:** `theme.css` must load **before** `terminal.css` in `index.html`. Check the `<link>` order.
- **Prism languages missing:** `render.js` scans for languages per-file and loads components dynamically. If a language isn't in `LANG_REGISTRY`, it falls back to escaped plaintext.
- **Content not found on open:** Check that `walk.js` paths match what `open` resolves. Paths are normalized to `/prefix/file.md` format with no double slashes. Note: `ls` no longer changes `currentDir` — use `cd` to navigate, then `open` files.
