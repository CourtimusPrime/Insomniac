# PRD: Abilities System

## Introduction

Abilities are the universal unit of capability in Insomniac. Today the app has
separate concepts for skills, plugins, MCPs, agents, and pipelines — each with
its own schema, API, and UI. This feature unifies them under a single
**Ability** format: a self-describing YAML file that defines what something
does, what it accepts, what it returns, and how it runs. Any orchestrator,
agent, or human can read an Ability without external documentation.

The system ships four executors (`inline`, `shell`, `mcp`, `workflow`) and three
authoring surfaces: a structured **Agent Builder** form, a visual **Workflow
Builder** powered by React Flow, and **natural language** input that produces
valid Ability YAML from a description. Legacy bash install commands for
skills/plugins/MCPs are auto-detected and converted on import.

## Goals

- Establish a single canonical Ability YAML schema that describes all four
  executor types
- Store abilities in a global app-level registry (`~/.insomniac/abilities/`)
- Provide a structured Agent Builder form with full natlang parity
- Provide a visual Workflow Builder (React Flow) for composing abilities into
  executable chains
- Execute workflows locally inside Insomniac via Tauri/Fastify
- Auto-detect and convert legacy bash install commands into abilities on import
- Migrate the existing `abilities`, `agents`, and `pipelines` DB tables to the
  unified schema
- Install a proper YAML parsing library to replace the hand-rolled frontmatter
  parser

## User Stories

### US-001: Define Ability YAML Schema

**Description:** As a developer, I need a formal schema so that all abilities
follow a consistent, machine-readable format regardless of executor type.

**Acceptance Criteria:**

- [ ] Schema supports frontmatter fields: `id`, `name`, `version`,
      `description`, `tags`, `author`, `enabled`, `icon`
- [ ] Schema supports sections: `Trigger`, `Interface` (inputs/outputs),
      `Config` (semantic config + `runtime.executor`), `Instructions`,
      `Examples`, `Dependencies`
- [ ] `runtime.executor` accepts `inline`, `shell`, `mcp`, `workflow`
- [ ] For `inline`, presence of `tools:` and `memory:` in Config distinguishes
      agent from skill
- [ ] For `shell`, `entrypoint:` field is required in the runtime block
- [ ] For `mcp`, `server:` and `tool:` fields are required in the runtime block
- [ ] For `workflow`, Instructions contain `use:` references, conditions, and
      output maps
- [ ] Schema is defined as a TypeScript type and a JSON Schema for validation
- [ ] Typecheck/lint passes

### US-002: Install YAML Parser

**Description:** As a developer, I need a proper YAML parsing library so that
full Ability YAML files (not just simple frontmatter) can be reliably parsed and
serialized.

**Acceptance Criteria:**

- [ ] `js-yaml` or `yaml` package is installed
- [ ] Existing `skill-parser.ts` is refactored to use the new library
- [ ] All existing skill/ability imports continue to work
- [ ] Typecheck/lint passes

### US-003: Global Ability Registry on Disk

**Description:** As a user, I want my abilities stored in
`~/.insomniac/abilities/` so they persist globally and are accessible across
projects.

**Acceptance Criteria:**

- [ ] On first launch, Insomniac creates `~/.insomniac/abilities/` if it doesn't
      exist
- [ ] Each ability is stored as a single `.yaml` file named `{id}.yaml`
- [ ] Registry is indexed in the SQLite database for fast querying (file is
      source of truth, DB is cache)
- [ ] Changes to YAML files on disk are detected and synced to DB on app start
- [ ] Tauri `plugin-fs` is used for file system operations
- [ ] Typecheck/lint passes

### US-004: Ability CRUD API

**Description:** As a frontend developer, I need API endpoints to create, read,
update, delete, and list abilities so the UI can manage them.

**Acceptance Criteria:**

- [ ] `GET /api/abilities` — list all abilities with optional filter by `type`,
      `tags`, `enabled`
- [ ] `GET /api/abilities/:id` — get a single ability with full YAML content
- [ ] `POST /api/abilities` — create a new ability (accepts JSON body, writes
      YAML to disk)
- [ ] `PUT /api/abilities/:id` — update an existing ability
- [ ] `DELETE /api/abilities/:id` — delete ability (removes file + DB record)
- [ ] `POST /api/abilities/import` — import from YAML string or file path
- [ ] `POST /api/abilities/:id/toggle` — enable/disable an ability
- [ ] Responses include parsed metadata (not raw YAML) for list views
- [ ] Existing `/api/abilities` routes are migrated, not duplicated
- [ ] Typecheck/lint passes

### US-005: Ability List View

**Description:** As a user, I want to browse all my abilities in a filterable
list so I can find and manage them.

**Acceptance Criteria:**

- [ ] List view shows ability name, icon, executor type badge, tags, enabled
      status
- [ ] Filter by executor type: `inline (skill)`, `inline (agent)`, `shell`,
      `mcp`, `workflow`
- [ ] Filter by tags
- [ ] Search by name/description
- [ ] Toggle enabled/disabled inline
- [ ] Click to open Ability Detail View
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Ability Detail View

**Description:** As a user, I want to view and edit a single ability's full
configuration so I can understand and modify it.

**Acceptance Criteria:**

- [ ] Shows all YAML sections rendered in a readable layout (not raw YAML)
- [ ] "View Source" toggle shows raw YAML with syntax highlighting
- [ ] Edit button opens the appropriate builder (Agent Builder for inline,
      Workflow Builder for workflow, form for shell/mcp)
- [ ] Delete button with confirmation dialog
- [ ] Shows dependency graph (which abilities this one depends on / is depended
      on by)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-007: Agent Builder — Structured Form

**Description:** As a user, I want a structured form to create inline agents and
skills so I can define capabilities without writing YAML by hand.

**Acceptance Criteria:**

- [ ] Form fields: name, icon (picker), description, tags
- [ ] Trigger configuration: event type, pattern, schedule
- [ ] Interface section: define inputs (name, type, required, default) and
      outputs
- [ ] Config section: model selector, provider selector, temperature, max tokens
- [ ] For agents: tools list (select from existing abilities), memory toggle
- [ ] Instructions: rich text editor for the system prompt
- [ ] Examples section: add input/output example pairs
- [ ] Dependencies: select from existing abilities
- [ ] Live YAML preview panel that updates as the form changes
- [ ] "Save" writes YAML to `~/.insomniac/abilities/` and syncs to DB
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-008: Agent Builder — Natural Language

**Description:** As a user, I want to describe an agent in plain English and
have Insomniac generate the full Ability YAML so I can create agents without
understanding the schema.

**Acceptance Criteria:**

- [ ] Text input area with placeholder: "Describe what this agent should do..."
- [ ] "Generate" button sends description to configured LLM provider
- [ ] LLM returns structured Ability YAML (not freeform text)
- [ ] Generated YAML is loaded into the structured form for review/editing
- [ ] User can iterate: edit the description and re-generate, or edit the form
      directly
- [ ] Validation errors are highlighted if the generated YAML is malformed
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-009: Workflow Builder — React Flow Canvas

**Description:** As a user, I want a visual drag-and-drop canvas to compose
abilities into workflows so I can build multi-step processes without code.

**Acceptance Criteria:**

- [ ] Full-screen React Flow canvas (extends existing `ChainEditor.tsx` or
      replaces it)
- [ ] Left sidebar: ability palette grouped by tags, with search
- [ ] Drag abilities from palette onto canvas to create nodes
- [ ] Nodes display: ability name, icon, executor type badge, input/output ports
- [ ] Connect output ports to input ports via edges to define data flow
- [ ] Conditional edges: right-click edge to add conditions
      (success/failure/custom)
- [ ] Node inspector panel (right sidebar): shows selected node's config, allows
      inline edits
- [ ] Canvas controls: zoom, pan, minimap, auto-layout
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-010: Workflow Builder — Execution Controls

**Description:** As a user, I want to run workflows directly from the canvas so
I can test and execute my compositions without leaving the builder.

**Acceptance Criteria:**

- [ ] "Run" button in toolbar starts workflow execution
- [ ] Nodes highlight with status colors during execution: pending (gray),
      running (blue), success (green), error (red), skipped (dim)
- [ ] Edge animations show data flowing between nodes
- [ ] Execution log panel at bottom shows step-by-step output
- [ ] "Pause" button halts execution at the next step boundary
- [ ] "Stop" button cancels execution immediately
- [ ] On error, the failed node is highlighted and the error message is shown in
      the inspector
- [ ] Execution state persists — refreshing the page resumes from the last
      checkpoint
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-011: Workflow Builder — Natural Language

**Description:** As a user, I want to describe a workflow in plain English and
have Insomniac generate the visual graph so I can quickly scaffold complex
compositions.

**Acceptance Criteria:**

- [ ] Text input in the Workflow Builder toolbar: "Describe your workflow..."
- [ ] "Generate" sends description + available abilities list to LLM
- [ ] LLM returns a workflow Ability YAML with `use:` references
- [ ] YAML is parsed and rendered as nodes + edges on the canvas
- [ ] User can then visually edit the generated graph
- [ ] If referenced abilities don't exist, they appear as "missing" nodes with a
      "Create" action
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-012: Workflow Builder — Save as Ability

**Description:** As a user, I want to save my visual workflow as an Ability YAML
file so it becomes a reusable, composable unit.

**Acceptance Criteria:**

- [ ] "Save" button in toolbar opens a save dialog
- [ ] Dialog pre-fills name, description from canvas metadata
- [ ] User can add tags, set version, toggle enabled
- [ ] On save, the graph topology is serialized to a `workflow` executor Ability
      YAML
- [ ] YAML includes `use:` references for each node, edge conditions, and output
      mapping
- [ ] Saved to `~/.insomniac/abilities/{id}.yaml`
- [ ] Appears immediately in the Ability List View
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-013: Legacy Import — Auto-Detection

**Description:** As a user, I want to paste or drop bash install commands and
have Insomniac automatically convert them into proper Abilities so I don't lose
my existing tools.

**Acceptance Criteria:**

- [ ] Import dialog accepts: raw text paste, file drop, or file path
- [ ] Auto-detects format: Claude SKILL.md, bash install script, MCP server
      config JSON
- [ ] For Claude SKILL.md: parses frontmatter + markdown body into `inline`
      ability
- [ ] For bash scripts: wraps in `shell` executor with the script as
      `entrypoint`
- [ ] For MCP configs: creates `mcp` executor ability with server/tool fields
- [ ] Shows preview of the generated Ability YAML before saving
- [ ] User can edit before confirming import
- [ ] Preserves original source as a comment block in the YAML for reference
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-014: Create Ability from Palette (Workflow Builder)

**Description:** As a user building a workflow, I want to create a new ability
inline from the palette so I don't have to leave the canvas to fill a gap.

**Acceptance Criteria:**

- [ ] "Create Ability" button at the top of the palette sidebar
- [ ] Opens a compact version of the Agent Builder as a modal/drawer
- [ ] Supports both form and natlang creation
- [ ] On save, the new ability appears in the palette immediately
- [ ] User can drag it onto the canvas right away
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-015: Workflow Execution Engine

**Description:** As a developer, I need a server-side engine that executes
workflow abilities by traversing the graph, running each node, and managing
state.

**Acceptance Criteria:**

- [ ] Engine receives a workflow ability ID and input data
- [ ] Parses `use:` references to resolve ability dependencies
- [ ] Executes nodes in topological order, respecting edges and conditions
- [ ] For `inline` nodes: invokes LLM with the ability's instructions
- [ ] For `shell` nodes: spawns a child process with inputs as env vars
- [ ] For `mcp` nodes: makes the appropriate MCP tool call
- [ ] For nested `workflow` nodes: recursively invokes the engine
- [ ] Streams execution status via WebSocket to the frontend
- [ ] Supports pause/resume via checkpoint persistence in DB
- [ ] Error in one node triggers the error condition path, not full workflow
      failure
- [ ] Typecheck/lint passes

### US-016: Migrate Existing Data

**Description:** As a developer, I need to migrate existing abilities, agents,
and pipeline data to the unified Ability schema so that nothing is lost during
the transition.

**Acceptance Criteria:**

- [ ] Migration script reads existing `abilities`, `agents`, `pipelines`,
      `pipelineStages`, `stageAbilities` tables
- [ ] Converts each record to an Ability YAML file in `~/.insomniac/abilities/`
- [ ] Existing skills/plugins -> `inline` or `shell` abilities
- [ ] Existing MCP entries -> `mcp` abilities
- [ ] Existing agents -> `inline` (agent) abilities with tools and memory
- [ ] Existing pipelines -> `workflow` abilities with stage ordering preserved
- [ ] DB schema updated: old tables marked deprecated, new unified `abilities`
      table is canonical
- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: The system must define a canonical Ability YAML schema with four
  executor types: `inline`, `shell`, `mcp`, `workflow`
- FR-2: The system must distinguish inline skills from inline agents by the
  presence of `tools:` and `memory:` in Config
- FR-3: The system must store abilities as individual YAML files in
  `~/.insomniac/abilities/`
- FR-4: The system must index ability metadata in SQLite for fast querying,
  using the YAML file as source of truth
- FR-5: The system must sync disk state to DB on app start and after any write
  operation
- FR-6: The system must provide full CRUD API for abilities at `/api/abilities`
- FR-7: The system must provide a list view with filtering by executor type,
  tags, and search
- FR-8: The system must provide an Agent Builder form with all schema fields
  mapped to form controls
- FR-9: The system must provide a natlang-to-YAML generation path using the
  configured LLM provider
- FR-10: The system must provide a React Flow-based Workflow Builder with
  drag-and-drop composition
- FR-11: The system must execute workflows locally via the Fastify backend,
  streaming status over WebSocket
- FR-12: The system must support pause, resume, and cancel for running workflows
- FR-13: The system must auto-detect and convert legacy formats (SKILL.md, bash
  scripts, MCP JSON) on import
- FR-14: The system must allow inline ability creation from within the Workflow
  Builder palette
- FR-15: The system must migrate all existing skills, plugins, MCPs, agents, and
  pipelines to the unified schema
- FR-16: The system must validate ability YAML against the JSON Schema before
  saving
- FR-17: The system must use a proper YAML library (`js-yaml` or `yaml`) for
  parsing and serialization

## Non-Goals

- No cloud/remote execution of workflows — all execution is local via
  Tauri/Fastify
- No multi-user collaboration or shared ability registries
- No ability marketplace or publishing (existing marketplace UI is separate)
- No versioning history or rollback for individual abilities (just current
  version)
- No visual builder for `shell` or `mcp` abilities — these use a simple form
- No real-time collaborative editing of workflows
- No ability to import from non-Insomniac formats beyond Claude SKILL.md, bash
  scripts, and MCP JSON
- No scheduling or cron-based workflow triggers in v1
- No per-project ability overrides — the global registry is the single source

## Design Considerations

- **Existing components to reuse:**
  - `ChainEditor.tsx` — existing React Flow setup with custom nodes/edges;
    extend or refactor for the Workflow Builder
  - `AgentNode.tsx`, `CustomEdge.tsx` — existing graph components to adapt
  - `AbilityDetailView` — existing view to enhance with the new schema
  - shadcn UI components — forms, dialogs, badges, tabs, command palette
  - Zustand layout store — extend for builder panel state
  - React Query hooks — extend for new ability API endpoints

- **UI layout:**
  - Agent Builder: full-width form view with collapsible YAML preview on the
    right
  - Workflow Builder: full-screen canvas with collapsible palette (left) and
    inspector (right)
  - Both builders accessible from the Ability List View and from the main
    sidebar

- **Ability palette in Workflow Builder:**
  - Grouped by tags (e.g., "Data", "AI", "DevOps", "Communication")
  - Each group is collapsible
  - Search bar at top filters across all groups
  - Drag handle on each ability card

## Technical Considerations

- **YAML library:** `yaml` (npm) is preferred over `js-yaml` — it supports YAML
  1.2, preserves comments, and has better TypeScript types
- **Schema validation:** Use `ajv` with the JSON Schema derived from the
  TypeScript type for runtime validation
- **React Flow version:** Already on `@xyflow/react` 12.9.3 — no upgrade needed
- **File watching:** Consider `chokidar` or Tauri's `watch` API to detect
  external edits to ability YAML files
- **WebSocket:** Already have `@fastify/websocket` — extend for workflow
  execution streaming
- **Migration:** Run as a Drizzle migration + a one-time Node script that reads
  old tables and writes YAML files
- **LLM integration for natlang:** Reuse existing provider system in
  `server/providers/` — send the Ability JSON Schema as context so the LLM
  produces valid output
- **Performance:** The palette should lazy-load ability details; list view
  should virtualize if >100 abilities

## Success Metrics

- All existing skills, plugins, MCPs, agents, and pipelines are successfully
  migrated to Ability YAML without data loss
- Users can create an inline agent via the form builder in under 2 minutes
- Users can describe an agent in natural language and get a valid, editable
  Ability in under 30 seconds
- Users can compose a 5-node workflow visually and execute it without leaving
  the Workflow Builder
- Legacy bash install commands are correctly auto-detected and converted in >90%
  of cases
- Zero regression in existing functionality during migration

## Open Questions

- Should the Ability YAML schema support custom executor types (user-defined),
  or is the four-executor set fixed?: The four-executor set is fixed.
- Should workflow execution history be persisted for debugging/replay, and if
  so, for how long?: Let's not persist it for now.
- When natlang generates a workflow referencing abilities that don't exist yet,
  should it auto-generate stubs or just flag them as missing?: auto-generate
  stubs
- Should the migration deprecate the old DB tables immediately or keep them as
  read-only backups for a release cycle?: Deprecate the old DB tables
  immediately
- Should abilities support input/output type validation at runtime (e.g.,
  rejecting a string where a number is expected), or is that the caller's
  responsibility?: That's the caller's reponsibility
