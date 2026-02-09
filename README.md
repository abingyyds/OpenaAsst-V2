<div align="center">

<img src="docs/logo.png" alt="OpenAsst Logo" width="180"/>

# OpenAsst V2

### AI-Powered Terminal Assistant for Natural Language System Operations

[![Website](https://img.shields.io/badge/Website-OpenAsst.Ai-blue?style=for-the-badge&logo=google-chrome&logoColor=white)](https://openasst.ai)
[![GitHub](https://img.shields.io/badge/GitHub-OpenAsst--V2-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/abingyyds/OpenaAsst-V2)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-V2-FFC131?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![Platform](https://img.shields.io/badge/Platform-macOS%20|%20Linux%20|%20Windows-lightgrey?style=flat-square)]()

<br/>

**Desktop App** &nbsp;|&nbsp; **CLI Tool** &nbsp;|&nbsp; **Web Dashboard**

</div>

<br/>

## Overview

> **OpenAsst V2** is a complete rewrite — a monorepo architecture with a native desktop app (Tauri V2), a powerful CLI, and a web dashboard. Manage servers, deploy projects, and execute system tasks using **natural language**.

<table>
<tr>
<td width="33%">

### Desktop App
Native cross-platform app built with Tauri V2
- AI Chat with artifact panel
- Server management GUI
- Knowledge base editor
- Robot store & deployment

</td>
<td width="33%">

### CLI Tool
Full-featured command-line interface
- Natural language task execution
- Multi-server cluster control
- API sharing with dev tools
- Auto deployment from Git/docs

</td>
<td width="33%">

### Web Dashboard
Browser-based interface at **[openasst.ai](https://openasst.ai)**
- All desktop features in browser
- Real-time terminal streaming
- Batch AI execution
- GitHub OAuth login

</td>
</tr>
</table>

---

## Quick Start

### Desktop App

Download the latest release for your platform:

| Platform | Download |
|:---------|:---------|
| **macOS** (.dmg) | [Download](https://github.com/abingyyds/OpenaAsst-V2/releases/latest) |
| **Windows** (.msi) | [Download](https://github.com/abingyyds/OpenaAsst-V2/releases/latest) |
| **Linux** (.AppImage) | [Download](https://github.com/abingyyds/OpenaAsst-V2/releases/latest) |

### CLI Installation

<table>
<tr>
<td><b>macOS / Linux</b></td>
<td>

```bash
curl -fsSL https://raw.githubusercontent.com/abingyyds/OpenAsst/main/install.sh | bash
```

</td>
</tr>
<tr>
<td><b>Windows (PowerShell)</b></td>
<td>

```powershell
iwr -useb https://raw.githubusercontent.com/abingyyds/OpenAsst/main/install.ps1 | iex
```

</td>
</tr>
<tr>
<td><b>Windows (CMD)</b></td>
<td>

```cmd
curl -fsSL https://raw.githubusercontent.com/abingyyds/OpenAsst/main/install.bat -o install.bat && install.bat
```

</td>
</tr>
</table>

### Configure & Use

```bash
# Configure your API key
openasst config

# Execute tasks with natural language
openasst do "install nginx and configure it for port 8080"

# Interactive assistant mode
openasst assistant
```

---

## Features

| Feature | Description |
|:--------|:------------|
| **Smart Task Engine** | Execute any system task using natural language |
| **Cluster Control** | Manage and execute on multiple servers simultaneously |
| **API Sharing** | Share AI API with Claude Code, Cursor, Aider |
| **Terminal Agent** | Deploy AI agent on remote servers via SSH |
| **Auto Recovery** | Intelligent error detection and auto-fixing |
| **Knowledge Base** | Build reusable knowledge, auto-sync to GitHub |
| **Auto Deployment** | Deploy from Git repos, documentation, or plain text |
| **Skill System** | Extensible skills for Git, Docker, System ops |
| **Scheduled Tasks** | Create timers and automated cron jobs |
| **Service Manager** | Start, stop, and monitor background services |
| **Robot Store** | Create and deploy custom AI bots to servers |
| **Multi-Provider** | Anthropic, OpenAI, DeepSeek, OpenRouter support |

---

## CLI Commands

```bash
# Core
openasst do <task>              # Execute task with natural language
openasst do <task> --all        # Execute on all cluster devices
openasst assistant              # Interactive smart assistant
openasst chat                   # Interactive deployment mode

# Deployment
openasst deploy <source>        # Deploy from documentation (URL/file)
openasst auto <git-url>         # Full auto deploy from Git
openasst quick [template]       # Quick deploy using templates

# Cluster Control
openasst devices add            # Add remote device
openasst devices list           # List all devices
openasst run <cmd> --all        # Execute command on all servers
openasst agent deploy --all     # Deploy agent to devices
openasst hub start              # Start WebSocket hub

# API Sharing
openasst api share [tool]       # Share API (claude-code/cursor/aider)
openasst api sync --all         # Sync API config to devices
openasst api export             # Export as environment variables

# Management
openasst config                 # Configure API key and settings
openasst skill list             # List installed skills
openasst schedule add           # Add scheduled task
openasst service start <name>   # Start background service
openasst monitor start          # Start project monitoring
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    OpenAsst V2 Monorepo                  │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ desktop  │ frontend │   api    │   cli    │   types     │
│ (Tauri)  │ (React)  │ (Hono)  │(Commander)│ (Shared TS) │
└──────────┴────┬─────┴────┬─────┴──────────┴─────────────┘
                │          │
                ▼          ▼
         ┌──────────┐  ┌──────────────────┐
         │ Browser  │  │  Claude / OpenAI  │
         └──────────┘  └──────────────────┘
```

### Project Structure

```
OpenaAsst-V2/
├── packages/
│   ├── desktop/        # Tauri V2 native desktop app
│   ├── frontend/       # Vite + React 19 SPA
│   ├── api/            # Hono backend API server
│   ├── cli/            # CLI tool (Commander.js)
│   └── types/          # Shared TypeScript types
├── pnpm-workspace.yaml
└── package.json
```

---

## Self-Hosted Setup

```bash
# Clone
git clone https://github.com/abingyyds/OpenaAsst-V2.git
cd OpenaAsst-V2

# Install dependencies
pnpm install

# Development
pnpm --filter @openasst/api dev       # API server (port 2026)
pnpm --filter @openasst/frontend dev   # Frontend (port 5173)
pnpm --filter @openasst/desktop dev    # Desktop app (Tauri)
```

---

## Configuration

**CLI:** `~/.openasst-cli/config.json`

```json
{
  "apiKey": "your-anthropic-api-key",
  "baseUrl": "https://api.anthropic.com",
  "model": "claude-sonnet-4-20250514"
}
```

**Environment Variables (optional):**

| Variable | Description |
|:---------|:------------|
| `GITHUB_TOKEN` | GitHub token for knowledge base sync |
| `GITHUB_REPO` | Target repo (default: `abingyyds/OpenAsst`) |
| `SUPABASE_URL` | Supabase project URL (for auth) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |

---

## Security

- Blocks dangerous commands (`rm -rf /`, `mkfs`, etc.)
- Warns about sudo operations
- Requires confirmation for destructive actions
- Passwords and tokens never logged or exposed in UI

---

## Contributing

Contributions welcome! Please submit issues and pull requests on [GitHub](https://github.com/abingyyds/OpenaAsst-V2).

## License

MIT License - see [LICENSE](LICENSE)

---

<div align="center">

**[OpenAsst.Ai](https://openasst.ai)** &nbsp;|&nbsp; **[GitHub](https://github.com/abingyyds/OpenaAsst-V2)** &nbsp;|&nbsp; **[Issues](https://github.com/abingyyds/OpenaAsst-V2/issues)**

Made by OpenAsst Team

</div>
