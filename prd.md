# Product Requirements Document
## Insomniac — Orchestrative Developer Console
**Version:** 0.4
**Status:** Draft
**Author:** Court Ash-Dale
**Last updated:** March 2026

---

## 1. Vision

Insomniac is an open-source, model-agnostic orchestrative developer console for AI-native developers. It replaces the IDE as the primary development environment — not by being a better code editor, but by being something fundamentally different: a web-based surface for directing AI agents, managing pipelines, and overseeing multiple projects simultaneously.

The developer's job in Insomniac is to describe intent. Insomniac translates that into action — assigning agents automatically, executing pipelines autonomously, and surfacing only the decisions that require human judgment.

Code remains accessible. It is no longer the primary interface.

---

## 2. Problem Statement

AI-native developers today operate across a fragmented environment: multiple IDE windows, terminal sessions, browser tabs, chat interfaces, and communication tools — all running simultaneously, all demanding context. The cognitive overhead is severe and growing.

Existing tools address parts of this problem in isolation. None rethink the environment itself. Insomniac is built for the developer AI has actually created: someone whose primary output is intent, judgment, and direction — not implementation.

---

## 3. Terminology

| Term | Definition |
|---|---|
| **Abilities** | Canonical term for all installable extensions: skills, plugins, and MCP servers. Everything that extends what an agent or the orchestrator can do is an Ability. |
| **Agent** | An AI model instance assigned a role, a set of Abilities, and a task within a pipeline. |
| **Orchestrator** | The Insomniac backend engine that manages agents, executes pipelines, and consults the capability catalogue. |
| **Pipeline** | An ordered sequence of stages, each assigned to an agent. Can be sequential or parallel. |
| **Backseat Driver** | A passive monitoring agent that continuously reviews the active project's codebase and surfaces improvement recommendations. |
| **Marketplace** | The community store for discovering and installing Abilities, templates, and agent configurations. |
| **Dev Browser** | The embedded Lightpanda-backed browser used for autonomous agent testing and real-time developer inspection of running dev servers. |

---

## 4. Target Users

**Primary:** AI-native developers — engineers already using Claude Code, Cursor, or similar tools daily, running multi-agent workflows, frustrated with cognitive overhead.

**Secondary:** Solo founders and indie hackers building multiple projects simultaneously who want to ship fast without managing infrastructure manually.

**Non-target (v1):** Traditional developers who want AI autocomplete inside an editor. Enterprise teams with compliance requirements. Non-technical users.

---

## 5. Core Principles

1. **Intent over implementation.** The developer describes what to build. Insomniac decides how.
2. **Autonomous by default, interruptible always.** Agents run without supervision. The developer can redirect, pause, or override at any point.
3. **Model-agnostic.** Insomniac does not prefer or bundle any AI provider. Every agent works with Claude, OpenAI, Gemini, OpenRouter, Ollama, or any OpenAI-compatible endpoint.
4. **Zero mandatory configuration.** The capability catalogue activates intelligently.
5. **Decisions surface, noise does not.** Only choices requiring human judgment interrupt the developer.
6. **Open and composable.** Abilities, workflows, and templates are shareable, installable, and forkable.
7. **Workspace is yours.** Layout, theme, shortcuts, and sidebar arrangement are fully customisable.

---

## 6. Platform & Stack

### 6.1 Deployment Modes

**Self-hosted (local):**
```bash
npx insomniac
```
Starts the backend on `localhost:4321`. All agent processes, file edits, and browser automation run locally. No data leaves the machine. Agents edit files directly on the local filesystem.

**Self-hosted (remote):** Deploy to any VPS or cloud provider. Useful for long-running headless pipelines.

**Hosted (`app.insomniac.dev`):** Agents run in Firecracker microVM sandboxes. File edits are committed to GitHub repositories rather than the local filesystem. Developers connect a repo; the hosted version works entirely through git.

| Mode | File access | Agent execution | Auth |
|---|---|---|---|
| Local self-hosted | Direct filesystem | Local process | None (localhost) |
| Remote self-hosted | Direct filesystem | Remote process | Basic auth / OAuth |
| Hosted | GitHub via git commits | Firecracker microVM | GitHub OAuth |

### 6.2 Technology Stack

**Frontend:** React 19 + TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, WebSockets
**Agent graph editor:** ReactFlow (`@xyflow/react`) — fully MIT licensed including all Pro Platform features
**Backend:** Node.js + TypeScript (Fastify)
**Database:** SQLite via Drizzle ORM — schema includes `workspace_id` on all relevant tables for future multi-user support
**Browser automation:** Lightpanda (primary) with Playwright/Puppeteer API compatibility fallback (see 8.7)
**Real-time:** WebSockets for pipeline status, agent logs, decision queue, cost counters
**Hosted sandbox:** Firecracker microVMs for isolated, secure agent execution on `app.insomniac.dev`
**Registry:** GitHub-backed Marketplace (`insomniac-dev/store`)

### 6.3 MCP & Agent Communication

Insomniac backend acts as an MCP host. Claude Code runs as a first-class agent via `claude --mcp-server`. All other agent integrations expose MCP servers.

**stdio fallback interface:** In the event that Claude Code's MCP server mode has a breaking change, Insomniac falls back to a defined stdio interface:
- Spawn `claude` as a child process with `--dangerously-skip-permissions`
- Communicate via structured JSON lines over stdin/stdout
- Message schema: `{ id, type: "tool_call" | "tool_result" | "message", payload }`
- The fallback adapter implements the same `AgentAdapter` interface as the MCP adapter, so the pipeline engine is agnostic to which transport is in use
- A config flag `claude_code.transport: "mcp" | "stdio" | "auto"` lets operators pin or auto-detect

### 6.4 WSL Support

**US-19: Connect Insomniac to WSL**

On Windows, `npx insomniac` detects if it is running inside WSL and:
- Exposes the backend on `localhost:4321` accessible from the Windows host browser via WSL's automatic port forwarding
- Resolves filesystem paths using WSL path conventions (`/mnt/c/...`)
- Dev server processes (localhost runner) and agent processes run inside the WSL environment
- `Open in VS Code` (see 8.1) invokes `code.exe` from WSL via `$(command -v code.exe)` or the `code` shim
- Installation docs include a dedicated WSL setup section

---

## 7. Layout & Shell

The Insomniac shell is a five-region layout. All regions are movable and collapsible (US-16).

```
┌──────┬──────────────┬──────────────────────────┬───────────────┐
│ Left │ Left         │ Main View                │ Right Sidebar │
│ Tool │ Sidebar      │ (Pipeline / Graph /       │ (Timeline,    │
│ bar  │ (context)    │  Ability / Marketplace /  │  Decisions,   │
│      │              │  Dev Browser)             │  Agents)      │
├──────┴──────────────┴──────────────────────────┴───────────────┤
│ Bottom Panel  (Terminal / Usage Graphs / Health / Browser)      │
├─────────────────────────────────────────────────────────────────┤
│ Status Bar  (session timer · CPU · RAM · token count · cost)    │
└─────────────────────────────────────────────────────────────────┘
```

Collapsed state, panel widths, and bottom panel height persist per user in SQLite.

---

## 8. Feature Specification (v1.0)

---

### 8.1 Project Manager

Left sidebar — Projects view.

- List all projects with status dot: indigo pulse (running), amber (needs-attention), green (complete), gray (idle), red (error)
- Click to switch active project
- Create new project: from prompt, from template, or from GitHub repo
- Archive projects

**US-20: Project context menu (right-click)**
Right-clicking a project in the sidebar opens a context menu with:
- **Rename** — inline edit of the project name
- **Remove from list** — hides the project from the sidebar (does not delete files; project remains in SQLite and can be restored from Settings → Projects)
- **Open in VS Code** — invokes `code <project_path>` in a subprocess. On WSL, uses `code.exe` via the WSL shim. On hosted mode, prompts the user to clone the repo locally first.

---

### 8.2 Pipeline View

Main view — active project context.

- Vertical stage list with status, agent, model, description
- `needs-you` stages auto-scroll into view
- Sequential and parallel stages supported
- Add, reorder, skip, remove stages at runtime
- Pause, resume, cancel at any time
- Checkpointed after every stage — resumable from last completed stage
- Natural language steering bar at bottom

---

### 8.3 Agent Chain Editor (ReactFlow)

Visual canvas for building agent pipelines.

- Drag-and-drop agent nodes onto a ReactFlow canvas
- Connect agents with labelled edges: `on-success`, `on-failure`, `always`, `on-decision:{id}`
- Node configuration panel: role, system prompt, model, provider, assigned Abilities, parallelism, trigger conditions
- JSON-exportable; saveable as template; publishable to Marketplace
- **ReactFlow licence:** Fully MIT including the Pro Platform. No licence friction for open source commercial use. A Pro subscription is encouraged to support the project but is not required.

---

### 8.4 Abilities System

Unified extension primitive — skills, plugins, and MCP servers are all Abilities.

| Type | Description |
|---|---|
| **Skill** | Packaged knowledge module or prompt chain. |
| **Plugin** | Code module extending backend behaviour. |
| **MCP Server** | MCP-compatible server exposing tools to agents. |

- Abilities toolbar button → left sidebar list → main view detail (US-3)
- Claude SKILL.md import supported (US-2)
- Abilities assigned per agent in the chain editor
- Agents only access Abilities explicitly assigned to them

---

### 8.5 Marketplace

Main view — community store.

- Browse, search, filter: type, trust tier, install count, last updated, required provider
- One-click install (US-6)
- Publish flow via GitHub OAuth PR to `insomniac-dev/store`
- Trust tiers: `community`, `verified`, `official`
- Categories: Workflows, Agent configs, Templates, MCP adapters

---

### 8.6 Hooks System

User-defined triggers that fire at pipeline and agent lifecycle points (US-7).

**Trigger points:** `pre-stage`, `post-stage`, `pre-merge`, `post-merge`, `on-decision`, `on-agent-error`, `on-pipeline-complete`, `on-file-change`, `on-test-fail`, `on-test-pass`, `scheduled`

**Actions:** shell command, invoke Ability, Slack notification, GitHub issue/PR, trigger pipeline, webhook

Hooks are packaged and shareable as Abilities.

---

### 8.7 Dev Browser

**US-8 (revised): Embedded browser for autonomous agent testing and real-time developer inspection**
**US-25: Developer can use the Dev Browser to edit things in real-time**

#### Browser engine

Insomniac uses **Lightpanda** as the primary headless browser engine, with Playwright/Puppeteer as a fallback.

**Why Lightpanda over Playwright/Chromium:**
- Written from scratch in Zig — not a Chromium fork or WebKit patch
- Benchmarks show it runs automation workloads up to 9× faster while using approximately 16× less memory than Chrome, with 25 concurrent jobs using ~215 MB vs ~2 GB for Chrome
- Supports Chrome DevTools Protocol — Puppeteer and Playwright scripts connect to it without modification
- Fully open source (MIT)
- Dramatically better fit for the hosted version (Firecracker sandbox memory constraints)
- Compatible with WSL on Windows via the Linux binary run from a WSL terminal

**Fallback:** If a test explicitly requires full Chromium rendering fidelity (canvas, WebGL, complex CSS), the user can switch the Dev Browser to Playwright/Chromium mode per-project. Chromium mode is the default on local self-hosted only; Lightpanda is the default everywhere.

#### Agent-facing tools (via `browser-test` Ability)
Exposes MCP tools to agents: navigate, click, fill, screenshot, assertText, assertElement, getConsoleErrors, evaluateScript, waitForSelector

#### Developer-facing interface (US-25)
The Dev Browser is also a real-time inspection and editing surface — not just for agents. When opened in the main view:

- Live preview of the running dev server (proxied through the backend)
- **Visual editor overlay** — developer can:
  - Click any element to select it and see its DOM path and computed styles
  - Double-click text to edit it inline (edits reflected in the live preview; optionally written back to the source file)
  - Right-click an element for context menu: Delete element, Duplicate, Edit HTML, Copy selector, Inspect in agent
- **"Inspect in agent"** — right-clicking an element and choosing this sends a prompt to the active agent: "Fix this element: [CSS selector] — [description of what the developer wants]". The agent edits the source file and the preview refreshes.
- **Screenshot** — capture current viewport to clipboard or save to project
- **Console panel** — shows browser console output in real time
- Agent activity feed — shows what the agent is currently doing in the browser (e.g. "clicking #submit-btn", "asserting text matches 'Welcome'")

---

### 8.8 Agent OAuth & User Credentials

**US-9 & US-10:** Agents can perform OAuth flows using developer-provided credentials.

- Credential vault in Settings → Credentials: client ID, secret, redirect URI, scopes, provider name
- Encrypted AES-256 in SQLite; never exposed to frontend
- Assigned to projects or globally available
- `oauth` Ability exposes MCP tools: initiateOAuthFlow, exchangeCode, refreshToken, injectAuthHeader, validateProtectedRoute

---

### 8.9 Model-Agnostic AI Provider Registry

**US-11 & US-12:** Every agent is model-agnostic. All model calls are server-side; API keys never touch the frontend.

**Supported providers (v1):**

| Provider | Auth method | Notes |
|---|---|---|
| Anthropic (Claude) | API key | Claude Sonnet 4, Haiku 4.5 |
| OpenAI | API key | GPT-4o, o3, Codex |
| Google (Gemini) | API key or OAuth | Gemini 2.0 Flash, 2.5 Pro |
| OpenRouter | API key | 200+ models via single key |
| **Ollama** | Local URL (no key) | Self-hosted models, runs entirely locally |
| Any OpenAI-compatible API | API key + base URL | Azure OpenAI, custom deployments |

**US-24: Ollama models**
Ollama is a first-class provider. Configuration: user sets the Ollama base URL (default `http://localhost:11434`). Insomniac queries the Ollama `/api/tags` endpoint to enumerate available models and populates the model selector automatically. No API key required. Works identically to cloud providers from the agent's perspective — same `AgentAdapter` interface, same model selection UI.

**Credential security:** AES-256 encrypted at rest in SQLite. Per-project model preferences supported. Auto-selection by task type configurable.

---

### 8.10 Usage Charts

**US-13:** Token, cost, and tool usage visualisation in the bottom panel "Usage Graphs" tab.

- **Timeline view:** zoomable time series per provider/model, hover tooltips with agent + stage context
- **Bar graph view:** grouped by provider, model, agent, project; toggle tokens / cost / tool invocations
- **Summary cards:** total tokens, estimated cost, most active agent, most used model
- **CSV export** of raw usage data per session or date range

---

### 8.11 Backseat Driver

**US-14 & US-15:** Passive background agent monitoring the codebase and surfacing one-click recommendations.

- Runs continuously when project is open; configurable scan interval (5m / 15m / 30m / on-save); pausable per project
- Default model: Claude Haiku 4.5 (cost-efficient)
- Recommendation types: code quality, security, performance, architecture, test coverage, documentation
- Each recommendation card: type badge, severity, file + line, plain-language description, **"Run this"** button
- "Run this" creates a single pre-filled pipeline stage; developer confirms, agent executes, diff surfaced for review

---

### 8.12 Admin Terminal

Bottom panel — "Admin Terminal" tab.

- Streaming log of all orchestrator, agent, and system activity
- Direct natural language chat with the orchestrator
- Colour-coded by source; searchable and filterable
- Persistent in SQLite (last N lines)

---

### 8.13 Project Health & Localhost Runner

Bottom panel — "Project Health" tab.

- Infer and start dev server; auto-restart on crash; port conflict detection
- Stream dev server logs
- Health metrics: agent latency, pipeline completion rate, error states

---

### 8.14 Decision Queue

Right sidebar.

- Aggregated across all projects; badge on project entries for unresolved decisions
- Each decision: project, agent, stage, question, 2–4 option buttons, free-text override, "Let agent decide"
- WebSocket-driven immediate unblock on resolution
- Configurable notification timeout → browser notification + optional Slack

---

### 8.15 Customisation

#### Status Bar (US-23)
A persistent thin bar at the very bottom of the shell (below the bottom panel). Always visible, never collapsible. Displays:
- **Session timer** — wall-clock time since the app was opened in this session (HH:MM:SS)
- **CPU usage** — percentage of CPU consumed by the Insomniac backend process (polled every 2s via Node.js `os` module + `process.cpuUsage`)
- **RAM usage** — RSS memory of the backend process in MB
- **Active tokens** — rolling token count for the current session
- **Estimated cost** — running dollar estimate for the current session

The status bar is read-only and does not contain interactive controls.

#### Themes (US-17 & US-21)
- Settings → Themes: browse and install VS Code colour themes
- Supported formats: VS Code JSON theme format (`.json`), installed from file upload, URL, or Marketplace
- Bundled themes: GitHub Dark, One Dark Pro, Dracula, Catppuccin Mocha, Tokyo Night, Solarized Dark, Solarized Light
- Theme applies to the entire shell: sidebars, panels, status bar, agent graph, terminal ANSI colours
- Settings icon in the bottom-left corner of the left toolbar opens Settings directly to the Themes tab (US-21)

#### Pinning Themes to the Toolbar (US-22)
- Any installed theme can be pinned to the left toolbar as a quick-switch icon
- Pinned themes appear as small colour swatch icons below the standard toolbar items
- Clicking a pinned theme applies it instantly
- Max 4 pinned themes; managed from Settings → Themes → Pinned

#### VS Code Settings & Shortcuts Import (US-18)
- Settings → Import from VS Code
- Reads `keybindings.json` and `settings.json` from the VS Code config directory or manual file upload
- Imports: keyboard shortcut mappings, font size/family, tab/space preferences
- Unmapped shortcuts listed with nearest Insomniac equivalent suggestions
- Non-destructive: Insomniac defaults retained for anything not in the VS Code config

---

## 9. Onboarding

1. Welcome — "Insomniac is an AI developer console. You direct. Agents build."
2. Connect a provider — at least one required (Anthropic, OpenAI, Google, OpenRouter, or Ollama)
3. Connect GitHub — optional, strongly recommended
4. Create first project — prompt / template / GitHub repo
5. Pipeline runs — user sees first execution
6. Done

Target: under 3 minutes with an API key ready.

---

## 10. Non-Functional Requirements

- **Startup:** `npx insomniac` to interactive under 2 seconds
- **Agent updates:** under 300ms event to UI via WebSocket
- **Pipeline durability:** SQLite state, resumable from checkpoint
- **Memory baseline:** under 150MB (no agents, no browser)
- **Security:** AES-256 keys at rest, never sent to frontend, all model calls server-side, no telemetry by default
- **WSL:** Full functionality on Windows via WSL2

---

## 11. Resolved Decisions

| # | Decision | Resolution |
|---|---|---|
| 1 | Hosted sandbox execution | **Firecracker microVMs** — stronger isolation than Docker, sub-second boot, memory-efficient, production-proven (used by AWS Lambda) |
| 2 | Multi-user schema | `workspace_id` FK added to all relevant SQLite tables from day one. Multi-user features remain out of scope for v1 but the schema supports them. |
| 3 | Hosted vs self-hosted file access | **Self-hosted:** agents edit files directly on the local filesystem. **Hosted:** agents commit changes to GitHub repositories via git. No direct filesystem access in the hosted version. |
| 4 | Claude Code MCP fallback | stdio fallback defined: structured JSON-lines over child process stdin/stdout. Config flag `claude_code.transport: "mcp" | "stdio" | "auto"`. Same `AgentAdapter` interface for both transports. |
| 5 | ReactFlow licence | **Fully MIT** — the entire library including the Pro Platform is MIT licensed. Pro subscription encouraged but not required. No licence friction for Insomniac's open source model. |
| 6 | Browser engine | **Lightpanda** (primary) — written in Zig from scratch, not a Chromium fork, ~9× faster and ~16× lighter than Chromium, fully Puppeteer/Playwright-compatible via Chrome DevTools Protocol, MIT licensed, WSL-compatible. Playwright/Chromium available as a per-project fallback for full rendering fidelity. |

---

## 12. User Stories Index

| # | Story | Section |
|---|---|---|
| 1 | ReactFlow agent chain editor with per-agent Ability assignment | 8.3 |
| 2 | Claude Skill (SKILL.md) installation as Abilities | 8.4 |
| 3 | Abilities button → left sidebar list → main view detail | 8.4 |
| 4 | Abilities = canonical term for skills, plugins, MCPs | 3, 8.4 |
| 5 | Agent overview: status and current task | 8.14, 8.12 |
| 6 | Browse Marketplace and install Abilities in one click | 8.5 |
| 7 | Custom hooks with configurable triggers and actions | 8.6 |
| 8 | Embedded Lightpanda browser for autonomous agent testing | 8.7 |
| 9 | Agent-side OAuth validation and authentication | 8.8 |
| 10 | User-provided OAuth credentials for agent use | 8.8 |
| 11 | Model-agnostic agents across Claude, OpenAI, Gemini, OpenRouter | 8.9 |
| 12 | Multi-provider API key management with local encryption | 8.9 |
| 13 | Usage charts: cost, tokens, tool calls in timeline and bar view | 8.10 |
| 14 | Backseat Driver passive monitoring and recommendations | 8.11 |
| 15 | One-click execution of Backseat Driver recommendations | 8.11 |
| 16 | Movable and collapsible sidebars and toolbars | 7 |
| 17 | VS Code theme library support | 8.15 |
| 18 | Import VS Code shortcuts and settings | 8.15 |
| 19 | Connect Insomniac to WSL | 6.4 |
| 20 | Right-click project: rename, remove from list, Open in VS Code | 8.1 |
| 21 | Settings icon → opens Themes | 8.15 |
| 22 | Pin themes to left toolbar for quick-switch | 8.15 |
| 23 | Status bar: session timer, CPU, RAM, token count, cost | 8.15 |
| 24 | Ollama model support | 8.9 |
| 25 | Dev Browser: real-time element editing, inline text edit, "Inspect in agent" | 8.7 |

---

## 13. Open Questions

1. **Lightpanda production readiness** — Lightpanda is under active development and not yet 1.0. Define a stability gate before committing it as the production default for the hosted version: minimum version, test suite pass rate against a representative corpus of dev server UIs.
2. **Firecracker on Windows self-hosted** — Firecracker requires KVM, which is Linux-only. On Windows self-hosted (outside WSL), the hosted sandbox model does not apply (agents run as local processes anyway). Clarify docs and error messaging for users who attempt to configure Firecracker outside a Linux environment.
3. **Dev Browser visual editor source writeback** — when a developer edits text inline in the Dev Browser, the system needs to resolve the DOM edit back to a source file and line. This requires source map resolution and is complex for minified/bundled assets. Define scope: writeback supported for unminified development builds only; minified/production builds show a warning.

---

## 14. Milestones

| Milestone | Scope | Target |
|---|---|---|
| M0 — Skeleton | Fastify + React shell, WebSocket plumbing, 5-region layout + status bar, SQLite schema with workspace_id | Week 2 |
| M1 — Pipeline engine | Pipeline execution, stage sequencing, MCP agent spawning, Claude Code integration, stdio fallback, checkpoint/resume | Week 6 |
| M2 — Providers | AI provider registry, API key encryption, Ollama support, model selector, per-project preferences | Week 8 |
| M3 — Integrations | GitHub clone/merge-queue, localhost runner, Slack, MCP connection manager, WSL support | Week 12 |
| M4 — Abilities + ReactFlow | Ability system (skills/plugins/MCPs), chain editor, Claude Skill import | Week 15 |
| M5 — Templates + Marketplace | Template schema, 6 built-in templates, GitHub-backed store, install/publish | Week 18 |
| M6 — Dev Browser | Lightpanda integration, agent browser tools, developer visual editor, "Inspect in agent" | Week 20 |
| M7 — Advanced features | Hooks, OAuth vault, Backseat Driver, project context menu, right-click actions | Week 22 |
| M8 — Customisation + polish | VS Code themes, pinned themes, settings import, status bar, usage charts, onboarding, docs | Week 24 |
| M9 — Hosted + Firecracker | `app.insomniac.dev`, Firecracker sandbox, GitHub-mode file access | Week 27 |
| **v1.0 public launch** | Open source release, store seeded, hosted version live | **Week 28** |

---

*Living document. Open questions in §13 should be resolved before their respective milestones begin. Scope changes after M5 require a milestone review.*