// ── Executor-specific runtime configs (discriminated union on `executor`) ──

export type ExecutorSkill = {
  executor: 'skill';
  model?: string;
  max_tokens?: number;
  temperature?: number;
};

export type ExecutorCommand = {
  executor: 'command';
  entrypoint: string;
  working_directory?: string;
  parse_output?: 'json' | 'text' | 'lines';
  env?: Record<string, string>;
};

export type ExecutorMcp = {
  executor: 'mcp';
  transport: 'stdio' | 'sse';
  url?: string;
  command?: string;
  args?: string[];
  auth?: {
    type: 'oauth' | 'token' | 'none';
    scopes?: string[];
    token_env?: string;
  };
};

export type ExecutorWorkflow = {
  executor: 'workflow';
};

export type RuntimeConfig =
  | ExecutorSkill
  | ExecutorCommand
  | ExecutorMcp
  | ExecutorWorkflow;

// ── Interface ──

export interface InterfaceField {
  field: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface AbilityInterface {
  input: InterfaceField[];
  output: InterfaceField[];
}

// ── Workflow steps ──

export interface WorkflowStep {
  id: string;
  use?: string;
  type?: 'gate';
  label?: string;
  input?: Record<string, unknown>;
  output?: string;
  condition?: string;
  message?: string;
  on_error?: 'stop' | 'continue';
  on_reject?: { goto: string };
}

// ── Config ──

export interface AbilityConfig {
  runtime: RuntimeConfig;
  tools?: string[];
  memory?: 'session' | 'persistent' | 'none';
  max_retries?: number;
  timeout_seconds?: number;
  on_error?: 'stop' | 'continue';
  [key: string]: unknown;
}

// ── Frontmatter ──

export interface AbilityFrontmatter {
  id: string;
  name: string;
  version: string;
  description: string;
  tags: string[];
  author: string;
  enabled: boolean;
  icon?: string;
}

// ── Full document ──

export interface AbilityDocument {
  frontmatter: AbilityFrontmatter;
  trigger: string;
  interface: AbilityInterface;
  config: AbilityConfig;
  instructions: string | WorkflowStep[];
  examples: string;
  dependencies: string[];
}

// ── Derived kind (computed at runtime, not stored) ──

export type AbilityKind = 'skill' | 'agent' | 'command' | 'mcp' | 'workflow';

export function resolveKind(doc: AbilityDocument): AbilityKind {
  const { executor } = doc.config.runtime;

  switch (executor) {
    case 'command':
      return 'command';
    case 'mcp':
      return 'mcp';
    case 'workflow':
      return 'workflow';
    case 'skill': {
      const hasTools = doc.config.tools && doc.config.tools.length > 0;
      const hasMemory = doc.config.memory && doc.config.memory !== 'none';
      return hasTools || hasMemory ? 'agent' : 'skill';
    }
    default:
      return 'skill';
  }
}
