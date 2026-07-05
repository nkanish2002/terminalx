# Terminal UI Design

How we built the interactive terminal experience in TerminalX.

## Architecture

- **SPA + Content Pipeline**: Interactive terminal (not per-page SSG)
- **Build-time rendering**: Markdown → HTML at build, no client parser
- **Hash routing**: Shareable URLs, no server config needed
- **Config-driven**: Prompt, theme, commands all from `terminal.config.ts`

## Command System

Commands are registered in config and dispatched by the shell:

```javascript
const commands = {
  ls: { handler, description: "List directory contents" },
  cat: { handler, description: "Display file content" },
  // ...
};
```

## Input Handling

- Enter to execute
- ↑/↓ for history
- Tab for completion
- `/` for path entry

## Error States

Match prototype behavior:
- `No such file or directory`
- `Is a directory`
- `command not found`

---

*Published: 2025-03-20*
