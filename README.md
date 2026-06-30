# TerminalFS — A Terminal-Style Static-Site **Framework**

## Goal

Build a **reusable framework** — think *Docusaurus, but the site is an interactive terminal* — that anyone can install, point at their own Markdown, configure via one file, and deploy as a static site.

## Architecture

- **Framework** (`bin/`, `build/`, `shell/`): Reusable engine
- **User site** (`content/`, `terminal.config.ts`, `public/`): Your content

## Quick Start

```bash
terminalfs new my-site
cd my-site
terminalfs dev
```

## Features

- Interactive terminal shell
- Markdown content with syntax highlighting
- Graph rendering from ` ```graph ` fences
- Static search index
- Hash-based deep linking
- Configurable via `terminal.config.ts`

## License

MIT
