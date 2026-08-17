# Obsidian Visual Automation Plugin

A visual automation plugin for Obsidian that integrates with Canvas to create drag-and-drop workflows.

## Overview

Build no-code automations using nodes for triggers, conditions, and actions — all within Obsidian's native Canvas interface.

## Core Features

- Drag-and-drop node editor on Canvas
- Pre-built nodes: Trigger, Condition, Action
- Real-time execution of workflows
- Integration with Dataview, Tasks, Templater
- AI-assisted workflow suggestions via MCP
- Export/import workflows as JSON

## Architecture

- Built on Obsidian Plugin API (TypeScript)
- Backend: Local REST API with MCP
- Frontend: Canvas-based UI with custom node rendering
- Storage: Workflow definitions saved in `.obsidian/plugins/visual-automation/workflows/`

## API Integration

- `GET /vault/{path}` – Read note
- `PUT /vault/{path}` – Update note
- `POST /commands/{id}` – Run Obsidian command
- `GET /search/` – Full-text search
- `POST /mcp/` – Send AI prompts, receive actions

## Example Workflow

1. Trigger: Daily note created
2. Condition: Tag includes `#meeting`
3. Action: Extract action items → Add to `Tasks` plugin
4. Action: Post summary to linked project dashboard

## Development

```bash
# Clone and install
git clone https://github.com/frostmute/obsidian-visual-automation-plugin.git
cd obsidian-visual-automation-plugin
npm install

# Build (optional)
npm run build
```

## Prerequisites

- Obsidian v1.13.0+
- Local REST API plugin (for external control)
- MCP support (for AI suggestions)

## Resources

- [Obsidian API Docs](https://docs.obsidian.md)
- [Local REST API Plugin](https://github.com/obsidian-community/local-rest-api)
- [MCP Specification](https://github.com/obsidianmd/mcp)

## Licensing

MIT License - see [LICENSE](LICENSE) for details.