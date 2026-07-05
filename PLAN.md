# TerminalX — A Terminal-Style Static-Site **Framework**

## Goal
Build a **reusable framework** — think *Docusaurus, but the site is an interactive terminal* — that anyone can install, point at their own Markdown, configure via one file, and deploy as a static site. The deliverable is the **engine**, not any one site: the prototype's content (portfolio, blog, `trooteye@…`) is only a bundled **starter/example site** to develop and demo against.

Like Docusaurus: the consumer brings **content + config**, the framework supplies **the build pipeline + the terminal SPA**. Keep the live, type-a-command experience as a single static **SPA**, fed from the user's Markdown via a **build-time content pipeline** that emits static JSON. Deployable to **GitHub Pages** or any static host.

> **This is a framework, not a finished site.** Everything below is designed so the engine (`build/` + `shell/`) is generic and reusable, and a consumer's *actual* site lives entirely in their own `content/` + `terminal.config.ts` + `public/`. See **"Framework Boundary"** below for the exact split.

> **Architecture decision:** SPA + content pipeline (chosen over pre-rendering one HTML page per `cat`/`ls`/`tree` path). The prototype's whole appeal is *typing commands into a live terminal*. We preserve that. The build step's only job is to convert a user's `content/**/*.md` into data the SPA already knows how to consume.

---

## Framework Boundary (what's the engine vs. what the user brings)

| | Owned by | Reusable across sites? | Notes |
|---|---|---|---|
| `build/` (pipeline) | **Framework** | ✅ yes | Generic; never references specific content. |
| `shell/` (terminal SPA) | **Framework** | ✅ yes | Generic chrome + command engine; reads `manifest.json`. |
| `bin/` (CLI) | **Framework** | ✅ yes | `terminalx build` / `dev` / `new`. |
| `content/` | **User** | ❌ per-site | The user's Markdown — their actual site. |
| `terminal.config.ts` | **User** | ❌ per-site | The one knob file (branding, theme, prompt, commands). |
| `public/` | **User** | ❌ per-site | Favicon, robots, custom static assets. |

**Hard rule:** nothing in `build/` or `shell/` may hardcode content, paths, prompt text, colors, or titles — those come only from `content/` and `terminal.config.ts`. If the engine needs a value, it reads it from config (with a default). This is what makes it a framework and not "my site."

### Distribution model (Docusaurus-style)
- **Package:** publish the engine (`build/`, `shell/`, `bin/`) as an npm package (e.g. `terminalx`). Consumers `npm i -D terminalx`.
- **Scaffold:** `terminalx new my-site` (a "create" command) drops a minimal `content/`, `terminal.config.ts`, and `public/` into the user's repo — *not* the demo content.
- **Use:** `terminalx build` → `dist/`; `terminalx dev` → watch + serve.
- **This repo** keeps the bundled **starter/example site** under `content/` purely for engine development and the live demo — it ships as the `new` template's optional example, never as the framework's "real" content.

---

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| **Build** | Small **Node pipeline** (`build/`) | Pipeline only needs: walk files → render MD → emit JSON → copy shell. Split into focused modules (see below). 11ty/Astro are overkill and fight the SPA model. |
| **Markdown** | **markdown-it** (`default` preset, `linkify: true`) + **markdown-it-task-lists** + **gray-matter** | Replaces the prototype's fragile regex parser. Default preset = CommonMark + GFM tables + strikethrough; `linkify` autolinks bare URLs; task-lists plugin renders `- [ ]` (already used in blog content). |
| **Content** | **Markdown** (`.md`) on disk | Real files, edit + commit. Mirrors the prototype's inline `FS` content. |
| **Shell** | **Vanilla HTML/CSS/JS** (from prototype) | No framework. The terminal chrome and command loop already exist. |
| **Code highlight** | **Prism** (build-time, via markdown-it `highlight` hook) | Fenced code blocks highlighted *at build* → class-annotated HTML, no client highlight JS. Token classes map to the existing terminal palette (`--green/--cyan/--yellow/--red/--purple`) for theme consistency. |
| **Charts** | **Chart.js** (CDN, lazy-loaded) | Already wired in the prototype; configs baked into JSON at build time. |
| **Search** | **Static JSON index** | Built at compile time, filtered client-side. No server. |
| **Dev** | **chokidar** watch + tiny static server | Rebuild JSON on `.md` change; live preview. |
| **Deploy** | **GitHub Pages** via Actions | `npm run build` → `upload-pages-artifact(dist/)` → `deploy-pages`. Works for project pages. One method. |

### Why not a per-page SSG?
- Pre-rendering `/cat/:path`, `/ls/:path`, `/tree` as separate HTML pages turns a terminal into a doc site with terminal CSS — you lose typing, history, tab-completion, and in-session state.
- It also forces a combinatorial page explosion and the awkward dual hash/clean-URL routing the old plan had.
- The SPA approach sidesteps GitHub Pages' `pathPrefix` headaches: hash routes never hit the server, and assets load via relative paths.

> **Trade-off accepted:** no per-page server-rendered HTML, so weaker SEO and no-JS fallback. If that matters later, the same `fs.json` can additionally drive pre-rendered HTML pages as progressive enhancement (see Future Extensibility). Not needed for v1.

---

## Architecture

```
terminal-site/                # (this repo = engine + bundled starter/example site)
├── package.json              # exposes `terminalx` bin; engine deps
│
│  ## ───── FRAMEWORK (engine — reusable, publishable as `terminalx`) ─────
├── bin/
│   └── terminalx.js         # CLI: `build` | `dev` | `new` (scaffold)
├── build/                    # Content pipeline (one responsibility per module)
│   ├── index.js              # Orchestrator: wires the steps, writes outputs
│   ├── config.js             # Load + validate terminal.config.ts, merge defaults
│   ├── walk.js               # Recursive content walk -> tree map
│   ├── render.js             # gray-matter + markdown-it -> {title, html}
│   ├── graph.js              # Extract ```graph fences -> canvas + configs
│   ├── search.js             # Build search-index.json
│   └── theme.js              # Emit dist/css/theme.css (CSS vars) from config.theme
├── shell/                    # The static SPA template (generic chrome + command engine)
│   ├── index.html            # Terminal chrome (titlebar, output, input)
│   ├── css/
│   │   ├── terminal.css      # Layout/structure — references theme vars only
│   │   └── prism-terminal.css # Code-token colors mapped to terminal palette vars
│   └── js/
│       ├── app.js            # Command loop + dispatcher (ls/cat/cd/...), reads manifest/fs.json
│       ├── router.js         # Hash-route deep-linking (#/cat/docs/readme.md)
│       ├── search.js         # Client-side filtering of search-index.json
│       └── charts.js         # Chart.js loader + graph instantiation
│
│  ## ───── USER SITE (per-site — what a consumer edits / `new` scaffolds) ─────
├── terminal.config.ts        # ← USER-FACING CONFIG — single source of truth for the SPA
├── content/                  # SOURCE — user's Markdown (here: bundled STARTER/EXAMPLE only)
│   ├── docs/
│   │   ├── readme.md
│   │   ├── about.md
│   │   ├── setup.md
│   │   ├── projects.md
│   │   └── changelog.md
│   ├── projects/
│   │   ├── portfolio/overview.md     # contains ```graph blocks
│   │   ├── dashboard/overview.md
│   │   ├── dashboard/features.md
│   │   └── website/overview.md
│   ├── blog/
│   │   ├── 2024-01-15-fun-with-markdown.md
│   │   └── 2025-03-20-terminal-ui.md
│   └── config/
│       └── settings.json
├── public/                   # Static passthrough (robots.txt, favicon, 404.html)
│
└── dist/                     # BUILD OUTPUT — deploy this (gitignored)
    ├── index.html            # (copied from shell/)
    ├── css/  js/             # (copied from shell/; + GENERATED css/theme.css)
    ├── manifest.json         # GENERATED — config + tree + per-file sizes (always small, loaded at startup)
    ├── fs.json               # GENERATED — inlined content for small sites (below threshold)
    ├── content/<path>.json   # GENERATED — per-file content (large sites, fetched on `cat`)
    └── search-index.json     # GENERATED — [{path, title, text}]
```

### Loading strategy — bounded startup payload
Loading one giant `fs.json` doesn't scale to hundreds of files. The build decides per total size:
- **Small site (inlined content ≤ ~500 KB):** emit a single `fs.json` (tree + all content). One fetch, instant. Simplest path; covers the current prototype's ~13 files easily.
- **Large site (over threshold):** emit a lightweight **`manifest.json`** (tree + per-file `size`/`title` only) loaded at startup, and one **`content/<path>.json`** per file fetched lazily the first time it's `cat`-ed (then cached in memory).

The shell always loads `manifest.json` at startup, then branches on `manifest.inlined`: if `true` it fetches `fs.json` once and seeds the content cache; if `false` it fetches nothing more up front and pulls `content/<path>.json` lazily on first `cat`. Either way `cat` checks the in-memory cache first, so the two paths converge after load. The threshold is a single build constant, so the site can grow without a rewrite.

### Data contract — `manifest.json` (always emitted)
```jsonc
{
  "generatedAt": "2026-06-29T00:00:00Z",
  "inlined": true,                 // true => content is in fs.json; false => fetch content/<path>.json
  "config": {                      // runtime (behavior) slice of terminal.config.ts — see "Configuration"
    "title": "TerminalX",
    "prompt": { "user": "trooteye", "host": "terminal", "symbol": "→" },
    "landing": "cat /docs/readme.md",
    "home": "/",
    "commands": { "enabled": ["ls","cat","cd","pwd","tree","clear","help","whoami","date","search"],
                  "aliases": { "ll": "ls" } },
    "charts": { "defaultType": "line", "palette": ["green","cyan","yellow","red","purple"] }
  },
  "tree": {
    "/":              { "type": "dir",  "children": ["docs", "projects", "blog", "config"] },
    "/docs":          { "type": "dir",  "children": ["readme.md", "about.md", ...] },
    "/docs/readme.md":{ "type": "file", "title": "Welcome to TerminalX", "ext": "md", "size": 1234 },
    "/config/settings.json": { "type": "file", "title": "settings.json", "ext": "json", "size": 98 }
  }
}
```

### Data contract — content (in `fs.json` when inlined, else `content/<path>.json`)
```jsonc
{
  "/docs/readme.md": {
    "html": "<h1>Welcome…</h1>…",        // pre-rendered by markdown-it, graphs already swapped
    "graphs": [],                          // chart configs referenced by canvases in html
    "raw": "..."                           // raw text for `cat` of non-md (json) files
  },
  "/projects/portfolio/overview.md": {
    "html": "…<canvas data-graph-id=\"g_ab12\"></canvas>…",
    "graphs": [ { "id": "g_ab12", "type": "line", "title": "Portfolio Growth", "labels": [...], "datasets": [...] } ]
  }
}
```
(`content/<path>.json` holds a single such entry; `fs.json` holds the whole map.)

### Data contract — `search-index.json`
```jsonc
[
  { "path": "/projects/portfolio/overview.md", "title": "Portfolio Manager", "text": "cli portfolio tracking dca holdings …" }
]
```
Client tokenizes the query, scores `title`/`text` matches, and renders snippets with matched-term context. Results are clickable → set the hash → `cat` the file.

---

## Configuration Interface — `terminal.config.ts`

A single user-facing file is the **only** place anyone edits to re-skin or re-brand the terminal. Nothing in `shell/` or `build/` hardcodes the prompt, colors, title, or landing view. `build/config.js` loads it, validates it, and **deep-merges over documented defaults** — so an empty `terminal.config.ts` produces a working site, and partial overrides are fine.

The framework exports a typed `defineConfig()` helper (no-op at runtime, pure DX) so consumers get autocomplete and type-checking on every field — the Vite/Astro pattern.

```ts
// terminal.config.ts  — every field optional; defaults shown
import { defineConfig } from "terminalx";

export default defineConfig({
  site:    { title: "TerminalX", user: "trooteye", host: "terminal", promptSymbol: "→" },
  theme:   { bg: "#0a0e14", surface: "#111820", border: "#1e2a3a",
             green: "#00ff9c", cyan: "#56b6c2", yellow: "#f0db4f",
             red: "#e06c75", purple: "#c678dd", white: "#abb2bf",
             fontFamily: "'JetBrains Mono', monospace", fontSize: 14 },
  content: { dir: "content", landing: "cat /docs/readme.md", home: "/" },
  commands:{ enabled: ["ls","cat","cd","pwd","tree","clear","help","whoami","date","search"],
             aliases: { ll: "ls" } },
  search:  { snippetChars: 160, fields: ["title","text"] },
  charts:  { defaultType: "line", palette: ["green","cyan","yellow","red","purple"] },
  build:   { outDir: "dist", inlineThreshold: 512000, basePath: "./" },
});
```

> **Loading a `.ts` config:** `build/config.js` imports `terminal.config.ts` via a zero-config TS loader (**`jiti`**, or `tsx`/`esbuild`) — no separate `tsc` compile step, and the rest of `build/` can stay plain JS. The framework ships a `Config` type + `defineConfig` from its package entry. (If a consumer prefers, a plain `terminal.config.js`/`.mjs` is also accepted — the loader resolves either.)

**The config splits cleanly into two output channels** (so each concern lands where it belongs):

| Concern | Config keys | Channel | Consumed by |
|---|---|---|---|
| **Style** | `theme.*` | `build/theme.js` → generated `dist/css/theme.css` (`:root { --green: … }`) | CSS only — no flash, no JS needed for colors |
| **Behavior** | `site`, `content.landing/home`, `commands`, `charts` | embedded as `manifest.config` | `app.js` at runtime |
| **Build-only** | `content.dir`, `build.*`, `search.*` | never shipped | `build/` pipeline |

This keeps a clean separation: **`theme.*` is pure CSS variables** the rest of `terminal.css`/`prism-terminal.css` reference, while **behavior** rides along in the already-loaded `manifest.json` (no extra fetch). Adding a config knob = add a default in `build/config.js` + read it in exactly one place.

---

## Core Features

### 1. Terminal Shell (interactive — preserved)
Ported directly from the prototype:
- **Titlebar** with colored dots + live path display.
- **Output area** (scrollback) + **real input line** with a **config-driven** prompt (`config.prompt` → e.g. `trooteye@terminal→`; the example value, not a hardcoded one).
- **Commands:** `ls`, `cat`, `cd`, `pwd`, `tree`, `clear`, `help`, `whoami`, `date`, **`search`** (new) — gated by `config.commands.enabled`.
- **History** (↑/↓), **tab completion** (commands + paths), `/`-style path entry.
- The only change from the prototype: state comes from `manifest.json`/`fs.json` fetched at startup (not a hardcoded `FS`), and `cat` injects **pre-rendered HTML** instead of running the client-side regex parser.

### 2. Content Pipeline (`build/`)
Split into focused modules so no single file owns everything (`build/index.js` orchestrates):
1. **`walk.js`** — recursively walk `content/`, build the `tree` map (mirrors prototype `FS` shape).
2. **`render.js`** — for each `.md`: `gray-matter` strips frontmatter → `title`; `markdown-it` renders the body → `html`. For non-`.md` (e.g. `settings.json`): store `raw` for `cat` to pretty-print.
3. **`graph.js`** — **pre-processes the raw `.md` text**: strips each ```graph``` fence out, parses its JSON into a config, and substitutes a plain-text **sentinel token** (e.g. `@@GRAPH:g_ab12@@` on its own line) where the fence was. Returns `{ cleanedBody, graphs[] }`. `render.js` runs markdown-it on `cleanedBody` (so a graph block never reaches markdown-it as a code fence), then a post-render pass swaps each sentinel (markdown-it wraps it as `<p>@@GRAPH:id@@</p>`) for the `<canvas data-graph-id>`. Using a sentinel instead of injecting raw `<canvas>` HTML lets markdown-it stay `html: false` (no raw-HTML passthrough needed).
4. **`search.js`** — build `search-index.json` from rendered text.
5. **`index.js`** — decide inline-vs-split by total content size, emit `manifest.json` (+ `fs.json` or `content/<path>.json`), then copy `shell/` and `public/` into `dist/`.

### 3. Graph Rendering (build-time configs, client-time draw)
- Build extracts ```graph``` JSON into `content[path].graphs[]` and leaves a `<canvas data-graph-id="…">` placeholder in the HTML.
- After `cat` injects HTML, `charts.js` finds canvases, looks up the config, lazy-loads Chart.js from CDN (once), and instantiates — reusing the prototype's color-name mapping and themed options.
- No inline `<script>` per graph (cleaner, CSP-friendly).

### 4. Search
- `search <query>` command (and optional `/search` hash view) filters `search-index.json` client-side.
- Renders a result list: title + path + snippet with the matched term highlighted; selecting a result navigates (`#/cat/<path>`).

### 5. Routing / Deep-linking (hash only)
- Single strategy: **hash routes** like `#/cat/docs/readme.md`, `#/ls/projects`, `#/tree`, `#/search/portfolio`.
- On load and on `hashchange`, the router parses the hash and runs the corresponding command programmatically (same code path as typing it).
- Successful commands push the hash so any view is shareable/bookmarkable.
- Hash routing needs **zero** GitHub Pages config and is immune to the `/terminal-site/` base-path problem.

---

## Implementation Phases & Tasks

### Phase 0 — Scaffold (~45 min)
- [ ] `npm init -y`; add deps: `markdown-it`, `markdown-it-task-lists`, `prismjs`, `gray-matter`, `chokidar`, `jiti` (load `terminal.config.ts` without a compile step); dev: a static server (`sirv-cli` or `serve`).
- [ ] Export the framework's public API from the package entry: `defineConfig()` (typed identity helper) + the `Config` type, so consumers' `terminal.config.ts` gets autocomplete.
- [ ] `bin/terminalx.js` (the framework CLI) with subcommands `build`, `dev` (watch `content/` + `shell/`, rebuild, serve `dist/`), `new <dir>` (scaffold a fresh user site: minimal `content/` + `terminal.config.ts` + `public/`). Wire `"bin": { "terminalx": "bin/terminalx.js" }` in `package.json`.
- [ ] npm scripts delegate to the CLI: `build` → `terminalx build`, `dev` → `terminalx dev`, `clean`.
- [ ] Create `content/`, `shell/`, `public/`, `.gitignore` (ignore `dist/`, `node_modules/`).
- [ ] **Framework discipline:** establish the rule that `build/` and `shell/` contain *zero* site-specific values (no content paths, prompt text, colors, titles). Add a check (lint/grep in CI or a build assertion) that flags hardcoded values that belong in `terminal.config.ts`.
- [ ] Create `terminal.config.ts` (the config interface) with the documented default values; keep it commented as the user-facing edit point.
- [ ] `build/config.js`: load `terminal.config.ts` via `jiti` (resolve `.ts`/`.js`/`.mjs`; tolerate a missing file), validate types, **deep-merge over built-in defaults** (so an absent/partial file still builds), and expose the resolved config to the rest of `build/`.
- [ ] Decide repo deploy target (project page `/terminal-site/` vs user page) — sets `build.basePath`; assets stay relative either way.

### Phase 1 — Content Pipeline (~2–3 h)
- [ ] Migrate prototype's inline `FS` strings into real files under `content/` as the **bundled starter/example site** (docs, projects, blog, config) — preserving paths so existing command behavior matches. This doubles as the `terminalx new` example template; the engine must not depend on any of it.
- [ ] `walk.js`: recursive walk of `config.content.dir` building the `tree` map (dir/file nodes, per-file `size`, same shape the shell expects).
- [ ] `build/theme.js`: generate `dist/css/theme.css` (`:root { --bg: …; --green: …; --font-size: … }`) from `config.theme`, so `terminal.css`/`prism-terminal.css` reference variables only.
- [ ] `render.js`: configure `markdown-it` — `default` preset (CommonMark + GFM tables + strikethrough), `linkify: true`, and `.use(taskLists)`; keep output classes/markup compatible with `terminal.css`. Parse frontmatter with `gray-matter`; derive `title` (frontmatter → first `# H1` → filename fallback).
- [ ] **Pass 1 — language scan:** before rendering, scan every `.md` for fenced code-block languages (the ` ```lang ` info strings) and collect the distinct set. Load only those Prism language components (plus their dependencies) for the build run. Keeps the highlighter lean and avoids registering Prism's full language catalog.
- [ ] **Pass 2 — render:** set markdown-it's `highlight` hook to run **Prism** at build time — emit fenced blocks as Prism class-annotated HTML using the languages loaded in pass 1; gracefully fall back to escaped plaintext for unknown/missing languages.
- [ ] Author `shell/css/prism-terminal.css`: map Prism token classes (`.token.keyword/.string/.comment/.function/…`) onto the existing palette variables; link it from `index.html`.
- [ ] Confirm core feature set renders against existing content: **headers (h1–h6)**, **lists (ordered/unordered/nested)**, **tables** (portfolio/blog), **fenced code blocks with language highlighting** (bash/json examples in setup/dashboard), task lists (`2025-03-20-terminal-ui.md`), strikethrough, bare-URL autolinking, and literal Unicode emoji (✅ ⚠️ 🔜).
- [ ] Document the renderer's supported feature set + how to extend it (one-plugin-away list: footnotes, anchors, containers, math, `:emoji:`) in a build-pipeline README note.
- [ ] **Verify gray-matter ↔ markdown-it handoff:** confirm frontmatter is stripped and the remaining body (incl. files with *no* frontmatter) renders cleanly; no leading `---` artifacts.
- [ ] Handle non-`.md` files (`settings.json`): store `raw` for pretty-printed `cat`.
- [ ] `index.js`: always emit `manifest.json` — include the runtime `config` slice (site/prompt, landing, home, commands, charts) from `build/config.js`. Compute total inlined content size; if ≤ `config.build.inlineThreshold` emit `fs.json` with `inlined: true`; else emit per-file `content/<path>.json` with `inlined: false`. Honor `config.build.outDir`.
- [ ] Copy `shell/` + `public/` → `dist/` (alongside generated `theme.css`).
- [ ] Verify: `npm run build` produces a valid `manifest.json` (+ fs/per-file content) covering every content file.

### Phase 2 — Terminal Shell SPA (~2–3 h)
- [ ] Extract prototype chrome → `shell/index.html` + `shell/css/terminal.css`; link generated `css/theme.css` first so `terminal.css` consumes its CSS variables (replace prototype's hardcoded `:root` colors).
- [ ] `app.js`: fetch `./manifest.json` at startup (relative path); store its `tree` and `config`. Branch on `manifest.inlined`: if `true`, fetch `./fs.json` once and seed the in-memory content cache from its `content` map; if `false`, fetch nothing further now (content is pulled per-file on demand). Then init the command loop.
- [ ] Drive the shell from `manifest.config` (no hardcoding): render the prompt from `config.prompt` (`user`/`host`/`symbol`), set the window/titlebar title from `config.title`.
- [ ] Port command dispatcher: `ls`, `cd`, `pwd`, `tree`, `clear`, `help`, `whoami`, `date` (read from loaded tree, not inline `FS`). Gate available commands by `config.commands.enabled` and resolve `config.commands.aliases` before dispatch.
- [ ] `cat`: resolve content from in-memory cache; if not inlined and not cached, `await` fetch of `content/<path>.json`, then cache it. Inject `html` directly (drop the client-side regex parser); pretty-print `raw` for `.json`. Show a brief loading line while fetching.
- [ ] Port input handling: Enter, history (↑/↓), Tab completion (commands + paths), `/`-path shortcut.
- [ ] Error states match prototype (`No such file or directory`, `Is a directory`, `command not found`).
- [ ] Verify: every prototype command behaves identically against real content.

### Phase 3 — Graph Rendering (~1–2 h)
- [ ] `build/graph.js`: pre-process raw `.md` text — strip each ```graph``` fence, parse JSON → config, substitute a plain-text sentinel token (`@@GRAPH:<id>@@`) where the fence was. Return `{ cleanedBody, graphs[] }`. `render.js` runs markdown-it on `cleanedBody`, then post-render swaps each `<p>@@GRAPH:id@@</p>` for `<canvas data-graph-id>` — keeping markdown-it `html: false`. Push configs to `content[path].graphs[]`.
- [ ] `charts.js`: after `cat` renders, scan for `[data-graph-id]`, match config, lazy-load Chart.js (once) from CDN, instantiate.
- [ ] Reuse prototype's color-name map + themed axis/legend/title options; honor `config.charts.defaultType` and `config.charts.palette`.
- [ ] Handle malformed graph JSON gracefully (error block, don't crash `cat`).
- [ ] Verify: `cat /projects/portfolio/overview.md` renders the line chart.

### Phase 4 — Search (~1–2 h)
- [ ] `build/search.js`: emit `dist/search-index.json` (`[{path, title, text}]`; `text` = stripped, lowercased body); index only `config.search.fields`.
- [ ] `search.js`: tokenize query, score title/text matches, build snippet (`config.search.snippetChars` of matched-term context) + highlight.
- [ ] `search <query>` command renders results; selecting one navigates to `#/cat/<path>`.
- [ ] (Optional) `/search` hash view with a persistent input.
- [ ] Verify: `search portfolio` surfaces the portfolio overview.

### Phase 5 — Routing & Deep-linking (~1–2 h)
- [ ] `router.js`: parse hash → `{command, args}`; run via the same dispatcher as typed input.
- [ ] Run router on initial load and on `hashchange`. With **no hash** on load, run `config.content.landing` (default landing command) instead.
- [ ] Successful navigations update the hash (shareable URLs) without re-triggering loops.
- [ ] Unknown path → terminal-styled "not found" output (no hard error).
- [ ] Verify: loading `#/cat/blog/2025-03-20-terminal-ui.md` directly renders that post.

### Phase 6 — Polish & Deploy (~2–3 h)
- [ ] GitHub Actions: `npm run build` → `actions/upload-pages-artifact` (path: `dist/`) → `actions/deploy-pages` (single deploy method; `upload-pages-artifact` works for a project page `username.github.io/terminal-site/`, not just root user/org repos).
- [ ] `public/404.html` styled as terminal "file not found" (covers GitHub Pages hard-404s for non-hash URLs).
- [ ] Keyboard shortcuts: Ctrl+L (clear), Ctrl+/ (help).
- [ ] Responsive: font scaling, horizontal overflow for tables/wide output on mobile.
- [ ] Confirm all asset references are **relative** so the `/terminal-site/` base path works.
- [ ] Lighthouse pass; defer/lazy Chart.js; ensure `fs.json` is reasonably sized (split per-file fetch only if it grows large).
- [ ] **Framework acceptance test:** `terminalx new /tmp/test-site` → add one trivial `.md` + near-empty `terminal.config.ts` → `terminalx build` → confirm a working terminal with *none* of the example content. Proves the engine is content-independent.
- [ ] README: document install, `new`/`build`/`dev`, and the full `terminal.config.ts` reference.

**Estimated total:** ~11–15 h.

---

## What This Achieves

| Prototype (single HTML file) | This (reusable framework) |
|------------------------------|----------------------------|
| One bespoke site | **Engine + many sites** — `terminalx new`, bring your own content |
| Content hardcoded in JS `FS` | Real `.md` files in the user's `content/` |
| Branding baked into code | One `terminal.config.ts` (prompt, theme, commands, landing) |
| Fragile regex markdown parser | markdown-it (tables, frontmatter, code highlight) |
| Graphs parsed client-side each `cat` | Graph configs baked into JSON at build |
| No search | Static search index, instant client filter |
| No deep-linking | Hash routes — shareable `#/cat/...` URLs |
| Edit code to change content | Edit `.md` / `terminal.config.ts`, push to GitHub |
| **Interactive terminal** | **Interactive terminal (preserved)** |

---

## Future Extensibility
- **Optional pre-rendered HTML pages** from the same `fs.json` for SEO / no-JS fallback (progressive enhancement, not v1).
- **More chart types / mermaid:** extend the fenced-block transformer.
- **Themes:** CSS variables already centralize colors (`--green`, `--cyan`, …) — add a theme switcher.
- **Plugin transformers:** generalize the ```graph``` handler into a registry of fenced-block transformers (user-registerable via `terminal.config.ts`).
- **Custom commands:** let `terminal.config.ts` register extra commands beyond the built-ins, so consumers can extend the terminal without forking the engine.
- **Theme/preset packages:** distribute named themes (palette + font) as installable presets a site can reference by name.

*(Per-file lazy loading is already in v1 — see "Loading strategy".)*
