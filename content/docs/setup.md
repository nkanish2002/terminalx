# Setup Guide

## Prerequisites

- Node.js >= 18
- npm or yarn

## Install

```bash
npm i -D terminalx
```

## Create Site

```bash
npx terminalx new my-site
cd my-site
```

## Configuration

Edit `terminal.config.ts`:

```ts
export default defineConfig({
  site: { title: "My Site", user: "dev" },
  theme: { bg: "#000", green: "#0f0" },
  content: { dir: "content", landing: "cat /docs/readme.md" }
});
```

## Build & Deploy

```bash
terminalx build
# Deploy dist/ to GitHub Pages, Netlify, etc.
```

## Development

```bash
terminalx dev
# Watch content/, rebuild on change, serve
```
