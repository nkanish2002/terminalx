# Welcome to TerminalX

A terminal-style static-site **framework** — think *Docusaurus*, but the site is an interactive terminal.

## Features

- Interactive terminal shell with `ls`, `cat`, `cd`, `tree`, `help`, `search`
- Markdown content in real `.md` files
- Configurable via single `terminal.config.ts`
- Graph rendering from ` ```graph ` fences (Chart.js)
- Static search index
- Hash-based deep linking

## Quick Start

```bash
terminalx new my-site
cd my-site
terminalx dev
```

## Example

Type `help` for available commands, `tree` to see file structure.

### Demo

```graph
{
  "type": "bar",
  "title": "TerminalX Performance",
  "labels": ["Build", "Bundle", "Render", "Search"],
  "datasets": [{
    "label": "Score",
    "data": [95, 92, 88, 85],
    "backgroundColor": "rgba(100, 255, 218, 0.6)",
    "borderColor": "rgba(100, 255, 218, 1)",
    "borderWidth": 1
  }]
}
```

---

*Built with TerminalX framework*
