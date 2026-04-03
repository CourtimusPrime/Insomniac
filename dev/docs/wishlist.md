# Wishlist

This document contains list of wishlist features that would be available in an
Agentic Developer Environment (ADE).

## UI

- **Progressive Disclosure:** Completed agent tasks first provide a brief,
  high-level summary about what it did/accomplished. This can be dropped-down
  into a more detailed paragraph, with each action able to be dropped-down to
  reveal steps, tools used, and code changed either in an in-app diff screen or
  open it in VS Code.
  [@ Vivek Haldar](https://www.devopsdigest.com/ides-are-becoming-debuggers)

- **Shell Drawers:** Separate shells (sidebars, sections) can be moved, resized,
  and collapsed.

- **System Stack:** Instead of opening files inside Finder / File Explorer, view
  your system files in-app as a file directory. Right click on folders to
  "Create a Project".

### Integrations

- **Slack:** Connect Slack to show channels and threads in your sidebar, connect
  to Orchestator to control remotely via Slack messages.

- **GitHub:** Connect GitHub to browse and immediately clone remote
  respositories to your system, making them instantly accessible to you within
  seconds. Configure the default location where repos are cloned to or manually
  choose each time.

## Tests

- **Actionable Test Results:** Agentic test results are surfaced in distinct
  colour-codes, or can be opened to reveal what was tested, what went wrong, and
  what didn't. Failed/incomplete tests show a "Fix now" button or a chat bubble
  for the user to write in their own prompt/question.

- **In-App Browser Tests:** Instead of agents trying to test an app within the
  heavy, complicated confines of Chromium, agents can spin up their own
  Firecracker web-browser and perform a variety of tests including testing a new
  feature, impersonating a user, or testing every feature/ability the app has to
  offer.

## Quality Assurance

- **Queued Merges:** Instead of immediate merges, users can configure the
  tests/skills to be ran and must have successful passes before merging. The
  user can configure the default branch (parent branch / (e.g.) main), the
  actions performed, and what the agents do in the event of failed runs (resolve
  instantly, wait for human input).

## Agents

- **Workflow Builder:** Using React Flow, users can create custom agent chains:
  a declarative workflow that wires Abilities together without being an agent
  itself. It has no model, no reasoning, no instructions prose. It's pure
  topology. Users also have the option to create workflows using natlang. The
  interface lets users add pre-build abilities grouped by tags, or create one
  using natlang.

- **Agent Builder:** Users can create greenfield agents using a structured form
  deciding everything from that converts it into an ability yaml:
  - Name/icon
  - Prompt
  - Error Response
  - Output Format
  - Triggers Users also have the option to create agents using natlang.

- (Moonshot) **Parallel Intelligence:** Agents are aware of other agents running
  in parallel, the areas they are focusing on, and what those files those agents
  are currently changing. This allows for agents to hold-off or "tag" agents to
  combine features together, rather than in conflict.

- **Model Agnostic:** Use any model and provider of your choosing.

## Security

- **Rules:** Rules are listed as itemized cards (stored as markdown) that are
  enforced across all agents. Create project-specific rules, too.

- (Moonshot) **Breach Mode:** When the Orchestrator suspects an agent has been
  prompt-injected or if an agent crosses a Red Line, all agents are paused and
  the Orchestrator identifies the issue, updates rules, and, in extreme cases,
  scans for malware.

- **Red Lines:** Authoritative rules that, when crossed, activates "Breach
  Mode".

## Formatting

### Abilities

An **Ability is a self-describing unit of capability.** It defines what
something does, what it accepts, what it returns, and how it runs, in a single
file that any orchestrator, agent, or human can read without external
documentation.

The format is intentionally runtime-agnostic: the same schema describes a raw
shell command and a multi-step workflow. The only thing that varies is
`runtime.executor`.

**The Four Executors**

1. `prompt` - Instructions are a prompt, the LLM is the runtime. In practice,
   they're split into two roles:
   - A **skill** is stateless and single-purpose (one input -> no tools -> one
     output)
   - An **agent** is stateful, multi-step, and can call other abilities. The
     presence of a `tools:` list and `memory:` in Config is the signal
     differentiater.

2. `command` - An external executable. The model is not involved in the
   execution; it just maps inputs to env vars and parses stdout back into
   structured output. Deterministic, side-effectful, and fast. The `entrypoint:`
   in the runtime block is the entire logic.

3. `mcp` - A gateway to a remote tool server over a defined protocol. Like
   `shell` but the execution boundary is a network call rather than a process.
   Pass-through by design: it selects the right tool and returns raw results.
   Adding reasoning here would be anti-pattern.

4. `workflow` - A composition of other abilities. It contains no intelligence of
   its own; its Instructions are a sequence of `use:` references, conditions,
   dates, and an output map. The only decisions it makes are control-flow ones:
   what runs next, what to do on error, when to pause for a human.

**TLDR**

| Executor         | Reasoning | Side Effects | Calls Other Abilities |
| ---------------- | --------- | ------------ | --------------------- |
| `prompt` (skill) | yes       | no           | no                    |
| `prompt` (agent) | yes       | via tools    | yes                   |
| `shell`          | no        | yes          | no                    |
| `mcp`            | no        | yes          | no                    |
| `workflow`       | no        | via setps    | yes                   |

**Example yaml**

```yaml
frontmatter (id, name, version, description, tags, author, enabled)
---
## Trigger
## Interface
## Config        ← semantic config + runtime: executor block
## Instructions  ← prose or YAML steps depending on executor
## Examples
## Dependencies
```

Leaf nodes (`shell`, `mcp`, skills) do one thing and return. Composing nodes
(`agent`, `workflows`) orchestrate leaves, but only agents reason about _what_
to do. workflows only reason about _whether_ to proceed.

- **Legacy Installation:** Bash install commands used to install skills,
  plugins, or MCPs to Claude code are converted into abilities, preserving the
  legacy format until its eventual discontinuation.
