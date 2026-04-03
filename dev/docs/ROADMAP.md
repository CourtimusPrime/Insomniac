# Development Roadmap

**Version:** 1.0
**Last updated:** 2026-03-25
**Status:** Active

---

## How to Read This Document

This roadmap is structured for **agent-driven development**. Each task is scoped so a single Claude Code session (or similar agent) can complete it in one sitting. When starting a session:

1. Pick the next unchecked task from the current phase
2. Give the agent the task description below plus the referenced PRD section or file
3. Check it off when merged

Phases are ordered by dependency — earlier phases unblock later ones. Within a phase, tasks are ordered by priority but can be parallelised where noted.

---

## Current Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Wire the Core Loop | Not started |
| 2 | Builders & Visual Composition | Not started |
| 3 | Visibility & Feedback | Not started |
| 4 | Dev Browser | Not started |
| 5 | Ecosystem & Polish | Not started |
| 6 | Advanced & Hosted | Not started |

**What's already built (infrastructure):**
- 5-region resizable shell with collapsible panels and status bar
- Pipeline engine (sequential + parallel stages, checkpoint/resume, pause/cancel)
- Agent spawning (MCP + stdio adapters, auto-fallback factory)
- Ability registry (YAML on disk ↔ SQLite cache, sync on startup)
- Provider registry (Anthropic, OpenAI, Google, OpenRouter, Ollama, Custom)
- API key encryption (AES-256 at rest)
- WebSocket real-time events with auto-reconnect
- Filesystem tools (read/write/list/stat/delete with path traversal protection)
- Shell tools (command execution for agents)
- Hooks engine (trigger-action system)
- Backseat Driver backend (code analysis, TODO/FIXME detection)
- Project manager (CRUD, status dots, context menu, "Open in VS Code")
- Localhost runner (dev server inference, auto-start, crash recovery)
- Database with Drizzle ORM (workspace-aware schema, migrations)

---

## Phase 1: Wire the Core Loop

**Goal:** A user can create a project, build a pipeline, and watch agents execute it with real LLM calls.

**Why first:** The backend infrastructure is solid but the ability executor doesn't actually call LLMs yet. Without this, Insomniac is a pipeline orchestrator that can't reason. This phase makes the app functional end-to-end.

**Estimated scope:** 5 tasks

---

### Task 1.1: Wire Ability Executor to Provider System

**Status:** Not started
**Files:** `server/abilities/executor.ts`, `server/providers/`
**PRD ref:** §8.4 Abilities System

Connect the ability executor to the provider registry so that `inline` (prompt) abilities actually call the configured LLM provider.

**What to do:**
- In `executor.ts`, replace the TODO stub with a call to the provider system
- Resolve which provider + model to use (from the ability's `config.model` / `config.provider` fields, falling back to project defaults, then global defaults)
- Send the ability's `instructions` as the system prompt and the execution input as the user message
- Stream the response back through the existing WebSocket infrastructure
- Handle errors (invalid API key, rate limit, model not found) with descriptive messages
- For agent-type abilities (those with `tools:` in config), pass the assigned abilities as available tools

**Acceptance criteria:**
- [ ] An `inline` skill ability (no tools) sends a prompt to the configured provider and returns the response
- [ ] An `inline` agent ability (with tools) sends a prompt with tool definitions and handles tool call loops
- [ ] Provider/model resolution follows the fallback chain: ability config → project default → global default
- [ ] Errors from the provider surface as stage errors in the pipeline
- [ ] Typecheck passes (`bun run typecheck` or `tsc --noEmit`)

---

### Task 1.2: Wire Ability Generator to Provider System

**Status:** Not started
**Files:** `server/routes/abilities-generate.ts`, `server/providers/`
**PRD ref:** §8.4, `tasks/prd-abilities.md` US-008

Connect the natlang-to-YAML generation endpoint so users can describe an ability in plain English and get valid YAML back.

**What to do:**
- In the generate route, call the configured provider with:
  - System prompt: instruct the LLM to produce valid Ability YAML matching the schema
  - User message: the natural language description provided by the user
  - Context: include the Ability JSON Schema so the LLM knows the format
- Parse and validate the returned YAML before sending it to the frontend
- If validation fails, include the errors in the response so the frontend can show them

**Acceptance criteria:**
- [ ] `POST /api/abilities/generate` with `{ description: "..." }` returns valid Ability YAML
- [ ] The generated YAML validates against the Ability schema
- [ ] Validation errors are returned in the response body if generation produces invalid YAML
- [ ] The endpoint uses the project's configured provider or the global default
- [ ] Typecheck passes

---

### Task 1.3: Connect Agent Builder Form Submission

**Status:** Not started
**Files:** `src/components/builders/AgentBuilder.tsx`, `src/api/`, `server/routes/abilities.ts`
**PRD ref:** `tasks/prd-abilities.md` US-007

Wire the Agent Builder form so submitting it creates a real ability.

**What to do:**
- Map all form fields (name, icon, description, tags, model, provider, prompt, tools, triggers, inputs, outputs) to the Ability YAML schema
- On submit, POST to `/api/abilities` with the structured data
- Backend converts to YAML, writes to `~/.insomniac/abilities/{id}.yaml`, syncs to SQLite
- Show success/error feedback in the UI
- After save, navigate to the new ability's detail view
- Add a live YAML preview panel (collapsible right side) that updates as the form changes

**Acceptance criteria:**
- [ ] Filling out the form and clicking Save creates a `.yaml` file in the abilities directory
- [ ] The new ability appears in the abilities list immediately
- [ ] Form validation prevents saving with missing required fields (name, instructions)
- [ ] YAML preview updates in real time as form fields change
- [ ] Typecheck passes

---

### Task 1.4: Connect GraphView Save/Load

**Status:** Not started
**Files:** `src/components/graph/ChainEditor.tsx`, `src/api/`, `server/routes/pipelines.ts`
**PRD ref:** §8.3 Agent Chain Editor

Persist chain editor state so graphs survive page reloads and are associated with projects.

**What to do:**
- When nodes/edges change on the canvas, debounce and save the chain definition JSON (see §8.3 schema) to the project's SQLite record via `PUT /api/projects/:id/chain`
- On project load, fetch the chain definition and render it on the canvas
- When the user clicks "Save" in the graph toolbar, persist immediately
- Wire the node inspector panel: editing a node's name, model, prompt, or abilities should update the node definition and re-render the canvas node
- Wire the "Export JSON" toolbar button to download the chain as `.insomniac-chain.json`
- Ensure "Auto-layout" works with dagre

**Acceptance criteria:**
- [ ] Graph state persists across page reloads
- [ ] Each project has its own independent chain definition
- [ ] Node inspector edits (name, model, prompt) reflect on the canvas immediately
- [ ] Exporting produces valid JSON matching the chain definition schema
- [ ] Auto-layout arranges nodes in a clean left-to-right grid
- [ ] Typecheck passes

---

### Task 1.5: WebSocket Broadcast from Ability Events

**Status:** Not started
**Files:** `server/routes/abilities.ts`, `server/ws/handler.ts`
**PRD ref:** §8.4

Wire WebSocket broadcasts so the frontend updates in real time when abilities are created, updated, deleted, or executed.

**What to do:**
- After ability CRUD operations in the routes, broadcast events: `ability:created`, `ability:updated`, `ability:deleted`
- During ability execution, broadcast `ability:execution:start`, `ability:execution:progress`, `ability:execution:complete`, `ability:execution:error`
- Frontend: invalidate relevant TanStack Query caches on receiving these events (ability list, ability detail)

**Acceptance criteria:**
- [ ] Creating an ability via the API triggers an `ability:created` event
- [ ] The abilities list in the UI updates without manual refresh after CRUD operations
- [ ] Execution events stream to the frontend during ability runs
- [ ] Typecheck passes

---

## Phase 2: Builders & Visual Composition

**Goal:** Users can create agents and workflows without writing YAML by hand.

**Depends on:** Phase 1 (ability executor must work for testing)

**Estimated scope:** 6 tasks

---

### Task 2.1: Agent Builder — Full Form Implementation

**Status:** Not started
**Files:** `src/components/builders/AgentBuilder.tsx`
**PRD ref:** `tasks/prd-abilities.md` US-007

Build out the complete Agent Builder form with all schema fields.

**What to do:**
- Form sections: Identity (name, icon picker, description, tags), Trigger (event type, pattern, schedule), Interface (inputs with name/type/required/default, outputs), Config (model selector, provider selector, temperature, max tokens), Tools (select from existing abilities, with search), Memory toggle, Instructions (rich textarea for system prompt), Examples (input/output pairs), Dependencies (select from existing abilities)
- Each section collapsible with clear headings
- Model/provider selectors pull from the provider registry API
- Tools/dependencies selectors pull from the abilities list API

**Acceptance criteria:**
- [ ] All Ability YAML schema fields are represented in the form
- [ ] Model selector shows models from all configured providers
- [ ] Tools selector shows available abilities filtered to non-workflow types
- [ ] Collapsible sections maintain state
- [ ] Typecheck passes
- [ ] Visually consistent with the existing shadcn/ui design system

---

### Task 2.2: Agent Builder — Natural Language Generation

**Status:** Not started
**Files:** `src/components/builders/AgentBuilder.tsx`
**PRD ref:** `tasks/prd-abilities.md` US-008

Add the natlang input to the Agent Builder that calls the generate endpoint (Task 1.2).

**What to do:**
- Add a text input area above the form: "Describe what this agent should do..."
- "Generate" button sends the description to `POST /api/abilities/generate`
- On success, parse the returned YAML and populate all form fields
- Show loading state during generation
- If validation errors exist, highlight them on the relevant form fields
- User can edit the description and re-generate, or edit the form directly

**Acceptance criteria:**
- [ ] Typing a description and clicking Generate populates the form
- [ ] Loading state is visible during LLM call
- [ ] Generated values can be overridden by editing form fields
- [ ] Re-generating from a new description replaces form values
- [ ] Typecheck passes

---

### Task 2.3: Workflow Builder — Ability Palette & Drag-and-Drop

**Status:** Not started
**Files:** `src/components/builders/WorkflowBuilder.tsx`, `src/components/graph/`
**PRD ref:** `tasks/prd-abilities.md` US-009

Build the ability palette sidebar in the Workflow Builder and enable drag-and-drop composition.

**What to do:**
- Left sidebar: ability palette grouped by tags, with search bar at top
- Each group collapsible, showing ability cards with name, icon, executor type badge
- Drag an ability from the palette onto the ReactFlow canvas to create a node
- Nodes display: ability name, icon, executor type badge, input/output ports
- Connect output ports to input ports via bezier edges
- Right-click edge: context menu to set condition (success/failure/custom)
- Node inspector panel (right sidebar): shows selected node's config, allows inline edits
- Canvas controls: zoom, pan, minimap, auto-layout

**Acceptance criteria:**
- [ ] Palette lists all abilities from the registry, grouped by tags
- [ ] Search filters abilities across all groups
- [ ] Dragging from palette creates a node on the canvas
- [ ] Nodes can be connected via edges between ports
- [ ] Edge conditions can be set via right-click menu
- [ ] Node inspector shows config for the selected node
- [ ] Typecheck passes

---

### Task 2.4: Workflow Builder — Execution Controls

**Status:** Not started
**Files:** `src/components/builders/WorkflowBuilder.tsx`, `server/pipeline/engine.ts`
**PRD ref:** `tasks/prd-abilities.md` US-010

Add run/pause/stop controls to the Workflow Builder canvas.

**What to do:**
- "Run" button in toolbar: serializes the current graph to a workflow ability, sends to the backend for execution
- Nodes highlight with status colours during execution: pending (gray), running (blue pulse), success (green), error (red), skipped (dim)
- Edge animations show data flowing between nodes
- Execution log panel at bottom of the canvas shows step-by-step output
- "Pause" halts at next step boundary; "Stop" cancels immediately
- On error, failed node is highlighted and error message shown in inspector
- Connect to the existing pipeline engine's checkpoint/resume system

**Acceptance criteria:**
- [ ] Clicking Run executes the workflow from the canvas
- [ ] Node status colours update in real time via WebSocket
- [ ] Pause and Stop controls work correctly
- [ ] Errors surface on the failed node in the inspector
- [ ] Typecheck passes

---

### Task 2.5: Workflow Builder — Save as Ability

**Status:** Not started
**Files:** `src/components/builders/WorkflowBuilder.tsx`
**PRD ref:** `tasks/prd-abilities.md` US-012

Allow saving visual workflows as reusable ability YAML files.

**What to do:**
- "Save" button in toolbar opens a save dialog
- Dialog pre-fills name, description from canvas metadata
- User can add tags, set version, toggle enabled
- On save, serialize the graph topology to a `workflow` executor Ability YAML
- YAML includes `use:` references for each node, edge conditions, and output mapping
- Save to `~/.insomniac/abilities/{id}.yaml`
- The saved workflow appears immediately in the Ability List View and palette

**Acceptance criteria:**
- [ ] Save dialog captures workflow metadata
- [ ] Serialized YAML is valid and includes all node references and edge conditions
- [ ] Saved workflow appears in the abilities list
- [ ] Saved workflow can be re-opened in the Workflow Builder for editing
- [ ] Typecheck passes

---

### Task 2.6: Legacy Import Auto-Detection

**Status:** Not started
**Files:** `server/routes/abilities.ts`, `server/abilities/registry.ts`
**PRD ref:** `tasks/prd-abilities.md` US-013

Auto-detect and convert legacy formats when importing.

**What to do:**
- `POST /api/abilities/import` accepts: raw text, file path, or file upload
- Auto-detect format:
  - Claude SKILL.md → parse frontmatter + markdown → `inline` ability
  - Bash install scripts → wrap in `shell` executor with script as `entrypoint`
  - MCP server config JSON → create `mcp` executor with server/tool fields
- Show preview of generated Ability YAML before confirming
- Preserve original source as a comment block in the YAML
- Frontend: import dialog accessible from the abilities list toolbar

**Acceptance criteria:**
- [ ] SKILL.md files are correctly parsed and converted
- [ ] Bash scripts are wrapped as `shell` abilities
- [ ] MCP configs are converted to `mcp` abilities
- [ ] Preview is shown before saving
- [ ] Original source is preserved as a YAML comment
- [ ] Typecheck passes

---

## Phase 3: Visibility & Feedback

**Goal:** The user can see what's happening across agents and projects, and act on recommendations.

**Depends on:** Phase 1 (real execution data needed)

**Estimated scope:** 5 tasks

---

### Task 3.1: Backseat Driver Frontend

**Status:** Not started
**Files:** `src/components/shell/RightSidebar.tsx`, `server/backseat/driver.ts`
**PRD ref:** §8.11

Render Backseat Driver recommendations in the UI.

**What to do:**
- In the right sidebar (or a dedicated tab), render recommendation cards
- Each card: type badge (code quality / security / performance / architecture / test coverage / documentation), severity indicator, file + line reference, plain-language description
- "Run this" button on each card: creates a pre-filled pipeline stage, user confirms, agent executes
- Configurable scan interval (5m / 15m / 30m / on-save) via settings or a control in the panel
- Pause/resume scanning per project
- Cards clear when the recommendation is addressed (re-scan detects the fix)

**Acceptance criteria:**
- [ ] Recommendations from the backend render as cards
- [ ] Cards show type, severity, file reference, and description
- [ ] "Run this" creates a pipeline stage and prompts for confirmation
- [ ] Scan interval is configurable
- [ ] Scanning can be paused per project
- [ ] Typecheck passes

---

### Task 3.2: Usage Charts

**Status:** Not started
**Files:** `src/components/shell/BottomPanel.tsx`, `server/routes/usage.ts`
**PRD ref:** §8.10

Render token, cost, and tool usage visualisations in the bottom panel.

**What to do:**
- "Usage Graphs" tab in the bottom panel
- Timeline view: zoomable time series of tokens/cost per provider/model, hover tooltips
- Bar graph view: grouped by provider, model, agent, project; toggle between tokens / cost / tool invocations
- Summary cards at top: total tokens, estimated cost, most active agent, most used model
- CSV export button for raw usage data per session or date range
- Use a lightweight charting library (e.g., recharts or @nivo/core — check what's already in `package.json` or pick the lightest option)

**Acceptance criteria:**
- [ ] Timeline chart renders with real usage data
- [ ] Bar chart renders with grouping toggles
- [ ] Summary cards show correct aggregated values
- [ ] CSV export downloads valid data
- [ ] Charts are responsive to panel resizing
- [ ] Typecheck passes

---

### Task 3.3: Decision Queue Polish

**Status:** Not started
**Files:** `src/components/shell/RightSidebar.tsx`, `server/ws/handler.ts`
**PRD ref:** §8.14

Ensure the decision queue works end-to-end.

**What to do:**
- Decision cards in the right sidebar: project name, agent name, stage, question text
- 2–4 option buttons per decision (generated by the agent)
- Free-text override input
- "Let agent decide" button (agent picks the best option autonomously)
- Badge count on project entries in the left sidebar for unresolved decisions
- WebSocket-driven: resolving a decision immediately unblocks the waiting agent
- Sort: most recent first, with `needs-you` decisions highlighted

**Acceptance criteria:**
- [ ] Decisions from running pipelines appear in the right sidebar
- [ ] Option buttons and free-text input resolve the decision
- [ ] "Let agent decide" sends the decision back to the agent for autonomous resolution
- [ ] Badge count shows on the project sidebar entry
- [ ] Resolving a decision unblocks the pipeline stage immediately
- [ ] Typecheck passes

---

### Task 3.4: Progressive Disclosure for Agent Results

**Status:** Not started
**Files:** `src/components/views/PipelineView.tsx`
**PRD ref:** `docs/wishlist.md` — Progressive Disclosure

Implement collapsible result summaries for completed pipeline stages.

**What to do:**
- Completed stages show a 1-2 line summary of what the agent did
- Click to expand: detailed paragraph with actions taken
- Each action expandable: steps, tools used, files changed
- File changes show inline diff or "Open in VS Code" button
- Running stages show real-time streaming output
- Smooth expand/collapse animations

**Acceptance criteria:**
- [ ] Completed stages show collapsed summary by default
- [ ] Expanding reveals detailed breakdown
- [ ] File changes are viewable as diffs or openable externally
- [ ] Animations are smooth and don't cause layout shifts
- [ ] Typecheck passes

---

### Task 3.5: Admin Terminal Enhancements

**Status:** Not started
**Files:** `src/components/shell/BottomPanel.tsx`
**PRD ref:** §8.12

Polish the admin terminal tab.

**What to do:**
- Colour-coded log entries by source (orchestrator, agent name, system)
- Search/filter bar: filter by source, severity, keyword
- Natural language input at the bottom: type a message to the orchestrator
- Orchestrator responds inline in the terminal
- Persistent: last N lines stored in SQLite, loaded on app start
- Auto-scroll to bottom with "scroll lock" toggle

**Acceptance criteria:**
- [ ] Logs are colour-coded by source
- [ ] Search and filter work across log entries
- [ ] Natural language input sends messages to the orchestrator
- [ ] Scroll lock toggle works
- [ ] Typecheck passes

---

## Phase 4: Dev Browser

**Goal:** Agents can test web apps autonomously; developers can inspect and edit visually.

**Depends on:** Phase 1 (agents must be able to execute)

**Estimated scope:** 4 tasks

---

### Task 4.1: Playwright Adapter — Full Tool Set

**Status:** Not started
**Files:** `server/browser/`, `server/filesystem/`
**PRD ref:** §8.7

Complete the agent-facing browser tools.

**What to do:**
- Implement all MCP tools: `navigate(url)`, `click(selector)`, `fill(selector, value)`, `screenshot()`, `assertText(selector, expected)`, `assertElement(selector)`, `getConsoleErrors()`, `evaluateScript(code)`, `waitForSelector(selector, timeout)`
- Each tool validates inputs and returns structured results
- Screenshots saved to project temp directory, path returned
- Console errors accumulated and returned on request
- Timeout handling for all operations

**Acceptance criteria:**
- [ ] All 9 tools are implemented and callable via MCP
- [ ] An agent can navigate to a URL, interact with elements, and assert content
- [ ] Screenshots are saved and the path is returned
- [ ] Errors are handled gracefully with descriptive messages
- [ ] Typecheck passes

---

### Task 4.2: Dev Browser Panel

**Status:** Not started
**Files:** `src/components/shell/BottomPanel.tsx`
**PRD ref:** §8.7

Add a live browser preview panel.

**What to do:**
- "Browser" tab in the bottom panel shows a live preview of the running dev server
- URL bar at top with navigation controls (back, forward, refresh)
- The preview is proxied through the Fastify backend to avoid CORS issues
- If the localhost runner has a dev server running, auto-open its URL
- Agent activity feed overlay: shows what the agent is doing in the browser ("clicking #submit-btn", "asserting text matches 'Welcome'")

**Acceptance criteria:**
- [ ] Dev server preview renders in the panel
- [ ] URL bar allows manual navigation
- [ ] Agent activity is shown as an overlay or sidebar
- [ ] Panel resizes correctly
- [ ] Typecheck passes

---

### Task 4.3: Browser Console Panel

**Status:** Not started
**Files:** `src/components/shell/BottomPanel.tsx`
**PRD ref:** §8.7

Real-time browser console output.

**What to do:**
- Sub-panel or tab within the Dev Browser showing console.log, console.warn, console.error output
- Colour-coded by severity (log = gray, warn = amber, error = red)
- Clickable source locations
- Clear button
- Filter by severity

**Acceptance criteria:**
- [ ] Console output streams in real time from the browser instance
- [ ] Entries are colour-coded by severity
- [ ] Filter controls work
- [ ] Typecheck passes

---

### Task 4.4: Visual Editor Overlay

**Status:** Not started
**Files:** `src/components/views/`, `server/browser/`
**PRD ref:** §8.7 (US-25)

Developer-facing visual inspection and editing.

**What to do:**
- Click any element in the preview to select it: show DOM path and computed styles in an inspector panel
- Double-click text to edit inline (development builds only — detect via source map presence)
- If minified/production build detected, hide edit affordance and show notice: "Source writeback requires an unminified development build."
- Right-click context menu: Delete element, Duplicate, Edit HTML, Copy selector, "Inspect in agent"
- "Inspect in agent" sends a prompt to the active agent: "Fix this element: [selector] — [description]"
- Agent edits source file → preview auto-refreshes

**Acceptance criteria:**
- [ ] Clicking an element shows its DOM path and styles
- [ ] Inline text editing works on unminified dev builds
- [ ] Production builds show the appropriate notice instead of edit controls
- [ ] "Inspect in agent" creates an agent task with the element context
- [ ] Typecheck passes

---

## Phase 5: Ecosystem & Polish

**Goal:** Insomniac is installable, shareable, customisable, and welcoming to new users.

**Depends on:** Phases 1–3

**Estimated scope:** 5 tasks

---

### Task 5.1: Marketplace Integration

**Status:** Not started
**Files:** `src/components/views/MarketplaceView.tsx`, `server/marketplace/client.ts`
**PRD ref:** §8.5

Connect the marketplace to the real GitHub-backed store.

**What to do:**
- Replace stub data with actual fetches from the `insomniac-dev/store` GitHub repo
- Browse: list abilities with name, description, author, install count, trust tier badge
- Search and filter by type, trust tier, tags
- One-click install: download YAML → save to `~/.insomniac/abilities/` → sync to DB
- Publish flow: package local ability → create PR to `insomniac-dev/store` via GitHub OAuth
- Trust tiers: `community`, `verified`, `official` with visual badges

**Acceptance criteria:**
- [ ] Marketplace loads real data from the store repo
- [ ] Search and filter work
- [ ] One-click install saves the ability locally
- [ ] Publish creates a PR to the store repo
- [ ] Trust tier badges display correctly
- [ ] Typecheck passes

---

### Task 5.2: Theme System

**Status:** Not started
**Files:** `src/`, `server/routes/settings.ts`
**PRD ref:** §8.15 (US-17, US-21)

Implement VS Code theme import and application.

**What to do:**
- Settings → Themes: browse installed themes
- Import from: file upload (VS Code JSON `.json`), URL, or Marketplace
- Bundled themes: GitHub Dark, One Dark Pro, Dracula, Catppuccin Mocha, Tokyo Night, Solarized Dark, Solarized Light
- Parse VS Code theme JSON format and map to CSS custom properties
- Theme applies to the entire shell: sidebars, panels, status bar, graph canvas, terminal ANSI colours
- Settings icon in the bottom-left of the left toolbar opens Settings → Themes tab directly

**Acceptance criteria:**
- [ ] Bundled themes can be selected and applied instantly
- [ ] VS Code JSON themes can be imported and applied
- [ ] Theme covers all shell regions
- [ ] Settings icon shortcut works
- [ ] Typecheck passes

---

### Task 5.3: Pinned Themes

**Status:** Not started
**Files:** `src/components/shell/LeftToolbar.tsx`, `src/stores/layout.ts`
**PRD ref:** §8.15 (US-22)

Quick-switch theme icons in the toolbar.

**What to do:**
- Any installed theme can be pinned to the left toolbar
- Pinned themes appear as colour swatch icons below the standard toolbar items
- Clicking a pinned theme applies it instantly
- Max 4 pinned themes
- Managed from Settings → Themes → Pinned section
- Persisted in localStorage (already supported in the layout store)

**Acceptance criteria:**
- [ ] Themes can be pinned/unpinned from Settings
- [ ] Pinned swatches appear in the toolbar
- [ ] Clicking a swatch applies the theme instantly
- [ ] Max 4 limit enforced
- [ ] Typecheck passes

---

### Task 5.4: VS Code Settings Import

**Status:** Not started
**Files:** `src/components/views/SettingsView.tsx`, `server/routes/settings.ts`
**PRD ref:** §8.15 (US-18)

Import keybindings and preferences from VS Code.

**What to do:**
- Settings → Import from VS Code
- Read `keybindings.json` and `settings.json` from the VS Code config directory (auto-detect path) or accept manual file upload
- Import: keyboard shortcuts, font size/family, tab/space preferences
- Show a mapping preview: VS Code shortcut → Insomniac equivalent
- Unmapped shortcuts listed with nearest suggestions
- Non-destructive: Insomniac defaults retained for anything not in the VS Code config

**Acceptance criteria:**
- [ ] VS Code config directory is auto-detected
- [ ] Keybindings are mapped and previewed before applying
- [ ] Font and editor preferences are applied
- [ ] Unmapped shortcuts are listed with suggestions
- [ ] Import does not overwrite unrelated Insomniac settings
- [ ] Typecheck passes

---

### Task 5.5: Onboarding Wizard

**Status:** Not started
**Files:** `src/components/`, `server/routes/`
**PRD ref:** §9 Onboarding

First-run experience for new users.

**What to do:**
- Detect first launch (no providers configured, no projects)
- Step 1: Welcome — "Insomniac is an AI developer console. You direct. Agents build."
- Step 2: Connect a provider — at least one required. Show cards for Anthropic, OpenAI, Google, OpenRouter, Ollama. API key input with "Test connection" button.
- Step 3: Connect GitHub — optional but recommended. OAuth flow.
- Step 4: Create first project — from prompt, from template, or from GitHub repo.
- Step 5: First pipeline runs — show the pipeline executing with real-time updates.
- Step 6: Done — "You're ready. Start building."
- Target: under 3 minutes with an API key ready
- Skip button on every step
- Can be re-triggered from Settings

**Acceptance criteria:**
- [ ] Wizard appears on first launch
- [ ] All 6 steps work end-to-end
- [ ] At least one provider must be configured before proceeding past step 2
- [ ] First project is created and a pipeline executes
- [ ] Can be skipped and re-triggered
- [ ] Typecheck passes

---

## Phase 6: Advanced & Hosted

**Goal:** Platform features for scale, security, and the hosted version.

**Depends on:** Phases 1–5 (core product must be solid first)

**Estimated scope:** 6 tasks (each is a larger initiative)

---

### Task 6.1: Lightpanda Integration

**Status:** Blocked — waiting for Lightpanda v1.0.0
**PRD ref:** §8.7, Resolved Decision #6 and #7

Replace Playwright with Lightpanda as the primary browser engine once the stability gate is passed (v1.0.0, ≥95% pass rate on 50 representative dev server UIs, zero regressions).

---

### Task 6.2: GitHub File Sync

**Status:** Not started
**PRD ref:** §6.1 (Hosted mode)

For hosted mode: agents commit changes to GitHub repos via git instead of direct filesystem access. Requires implementing the GitHub file access adapter in `server/hosted/file-access-factory.ts`.

---

### Task 6.3: Firecracker Sandboxing

**Status:** Not started
**PRD ref:** §6.1, Resolved Decision #1

For `app.insomniac.dev`: run agents in Firecracker microVM sandboxes. Sub-second boot, memory-efficient, isolated execution.

---

### Task 6.4: Security Rules & Red Lines

**Status:** Not started
**PRD ref:** `docs/wishlist.md` — Security

Implement the rules system: markdown-stored rules enforced across all agents. Project-specific rules supported. Red Lines that trigger Breach Mode when crossed.

---

### Task 6.5: Parallel Intelligence (Moonshot)

**Status:** Not started
**PRD ref:** `docs/wishlist.md` — Parallel Intelligence

Agents aware of sibling agents running in parallel: what areas they focus on, what files they're changing. Enables coordination to avoid conflicts and combine features.

---

### Task 6.6: Breach Mode (Moonshot)

**Status:** Not started
**PRD ref:** `docs/wishlist.md` — Breach Mode

When the orchestrator suspects prompt injection or a Red Line is crossed: pause all agents, identify the issue, update rules, and optionally scan for malware.

---

## Appendix: File Reference

Quick reference for agents starting a task.

| Area | Key files |
|------|-----------|
| **Ability executor** | `server/abilities/executor.ts` |
| **Ability registry** | `server/abilities/registry.ts` |
| **Ability routes** | `server/routes/abilities.ts`, `server/routes/abilities-generate.ts` |
| **Agent adapters** | `server/agents/factory.ts`, `server/agents/mcp-adapter.ts`, `server/agents/stdio-adapter.ts` |
| **Pipeline engine** | `server/pipeline/engine.ts` |
| **Provider system** | `server/providers/` |
| **Database schema** | `server/db/schema/` |
| **WebSocket** | `server/ws/handler.ts` |
| **Frontend shell** | `src/App.tsx`, `src/components/shell/` |
| **Graph editor** | `src/components/graph/ChainEditor.tsx`, `src/components/graph/AgentNode.tsx` |
| **Builders** | `src/components/builders/AgentBuilder.tsx`, `src/components/builders/WorkflowBuilder.tsx` |
| **Views** | `src/components/views/` |
| **State stores** | `src/stores/layout.ts`, `src/stores/projects.ts` |
| **API client** | `src/api/client.ts`, `src/api/` |
| **Filesystem tools** | `server/filesystem/` |
| **Browser tools** | `server/browser/` |
| **Hooks** | `server/hooks/engine.ts` |
| **Backseat Driver** | `server/backseat/driver.ts` |
| **Marketplace** | `server/marketplace/client.ts` |
| **PRD** | `docs/PRD.md` |
| **Abilities PRD** | `tasks/prd-abilities.md` |
| **Wishlist** | `docs/wishlist.md` |
