# AGENT.md — TerminalFS

## Project Identity

**TerminalFS** is a reusable static-site framework that produces interactive terminal-style SPAs from Markdown content. Think "Docusaurus, but the site is a terminal you type commands into."

- **This is a framework, not a finished site.** The content under `content/` is a bundled starter/example for development and demo purposes only.
- **Distribution model:** published as an npm package (`terminalfs`). Consumers run `terminalfs new my-site`, add Markdown, and build.
- **Hard rule:** `build/` and `shell/` must never hardcode content paths, prompt text, colors, or titles. All user-facing values come from `terminal.config.ts`.

## Repository Structure

```
terminal-site/
├── bin/                    # CLI entry points (framework)
│   ├── terminalfs.js       #  CLI: build | dev | new <dir>
│   └── scaffold.js         #  terminalfs new template generator
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
import { defineConfig } from 'terminalfs';

export default defineConfig({
  site: { title, user, host, promptSymbol },
  theme: { bg, surface, border, green, cyan, yellow, red, purple, white, fontFamily, fontSize },
  content: { dir, landing, home },
  commands: { enabled: string[], aliases: Record<string, string> },
  search: { snippetChars, fields },
  charts: { defaultType, palette },
  build: { outDir, inlineThreshold, basePath },
});
```

**Config flow:**
1. `build/config.js` loads via `jiti` (tries `.ts` → `.js` → `.mjs`)
2. Deep-merges over built-in `DEFAULTS` (partial configs are valid)
3. Validates required sections
4. **Style** (`theme.*`) → `build/theme.js` → generated `dist/css/theme.css` (CSS custom properties)
5. **Behavior** (`site`, `content.landing`, `commands`, `charts`) → embedded in `manifest.config` → read by `app.js` at runtime
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
  "config": { "site": {...}, "content": {...}, "commands": {...}, "charts": {...} },
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
- **Commands:** `ls`, `cat`, `cd`, `pwd`, `tree`, `clear`, `help`, `whoami`, `date`, `search` — gated by `config.commands.enabled`
- **cat flow:** resolve path → check cache → if not inlined, `fetch` per-file JSON → inject `html` → init graphs if present
- **Routing:** hash-based (`#/cat/docs/readme.md`). On load with no hash → run `config.content.landing` command
- **Tab completion:** commands + file paths from tree
- **History:** ↑/↓ arrows
- **Theme toggle:** dark/light via `localStorage` + CSS class swap

## Development Workflow

```bash
# Install dependencies
npm install

# Dev mode (watch + rebuild)
npm run dev        # or: node bin/terminalfs.js dev

# Production build
npm run build      # or: node bin/terminalfs.js build

# Scaffold a new site
node bin/terminalfs.js new <directory>

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
- [ ] `ls` shows directory tree, `cd` navigates, `cat` renders Markdown
- [ ] `search <query>` returns results with snippets
- [ ] Hash routing: `#/cat/docs/readme.md` loads content directly
- [ ] Graph rendering: `cat /projects/portfolio/overview.md` shows charts
- [ ] Tab completion works for commands and paths
- [ ] Theme toggle (dark/light) persists

## Common Pitfalls

- **Graph rendering fails:** Ensure `graph.js` sentinel tokens are properly swapped in `render.js` post-render. The HTML must contain `<canvas data-graph-id="...">` elements.
- **Build dev mode missing server:** `build/dev.js` watches and rebuilds but does not serve. Use `npx sirv dist` or `python -m http.server` separately.
- **Config not loading:** `jiti` needs the site directory as its working context. The `SITE_DIR` env var is passed by `bin/terminalfs.js`.
- **Theme variables not applied:** `theme.css` must load **before** `terminal.css` in `index.html`. Check the `<link>` order.
- **Prism languages missing:** `render.js` scans for languages per-file and loads components dynamically. If a language isn't in `LANG_REGISTRY`, it falls back to escaped plaintext.
- **Content not found on cat:** Check that `walk.js` paths match what `cat` resolves. Paths are normalized to `/prefix/file.md` format with no double slashes.
