import { useCallback, useReducer } from 'react';
import type {
  AbilityDocument,
  ExecutorType,
  InterfaceField,
} from '../../../api/abilities';

export interface AgentFormState {
  // Frontmatter
  id: string;
  name: string;
  version: string;
  description: string;
  tags: string[];
  author: string;
  enabled: boolean;
  icon: string;

  // Trigger
  trigger: string;

  // Interface
  inputFields: InterfaceField[];
  outputFields: InterfaceField[];

  // Config
  executor: ExecutorType;
  model: string;
  maxTokens: number;
  temperature: number;
  tools: string[];
  memory: 'session' | 'persistent' | 'none';
  maxRetries: number;
  timeoutSeconds: number;
  onError: 'stop' | 'continue';

  // Shell-specific
  entrypoint: string;
  workingDirectory: string;
  parseOutput: 'json' | 'text' | 'lines';

  // MCP-specific
  transport: 'stdio' | 'sse';
  mcpUrl: string;
  mcpCommand: string;
  mcpArgs: string;

  // Instructions
  instructions: string;

  // Examples
  examples: string;

  // Dependencies
  dependencies: string[];
}

type Action =
  | { type: 'SET_FIELD'; field: string; value: unknown }
  | { type: 'RESET' }
  | { type: 'LOAD'; state: AgentFormState };

const defaultState: AgentFormState = {
  id: '',
  name: '',
  version: '1.0.0',
  description: '',
  tags: [],
  author: '',
  enabled: true,
  icon: '',
  trigger: '',
  inputFields: [],
  outputFields: [],
  executor: 'skill',
  model: '',
  maxTokens: 4096,
  temperature: 0.7,
  tools: [],
  memory: 'none',
  maxRetries: 0,
  timeoutSeconds: 60,
  onError: 'stop',
  entrypoint: '',
  workingDirectory: '',
  parseOutput: 'text',
  transport: 'stdio',
  mcpUrl: '',
  mcpCommand: '',
  mcpArgs: '',
  instructions: '',
  examples: '',
  dependencies: [],
};

function reducer(state: AgentFormState, action: Action): AgentFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return { ...defaultState };
    case 'LOAD':
      return { ...action.state };
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function useAgentBuilderForm() {
  const [formState, dispatch] = useReducer(reducer, defaultState);

  const setField = useCallback((field: string, value: unknown) => {
    dispatch({ type: 'SET_FIELD', field, value });
    // Auto-derive slug from name
    if (field === 'name') {
      dispatch({
        type: 'SET_FIELD',
        field: 'id',
        value: slugify(value as string),
      });
    }
  }, []);

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const loadFromAbility = useCallback((doc: AbilityDocument) => {
    const rt = doc.config.runtime;
    const state: AgentFormState = {
      id: doc.frontmatter.id,
      name: doc.frontmatter.name,
      version: doc.frontmatter.version,
      description: doc.frontmatter.description,
      tags: doc.frontmatter.tags,
      author: doc.frontmatter.author,
      enabled: doc.frontmatter.enabled,
      icon: doc.frontmatter.icon ?? '',
      trigger: doc.trigger,
      inputFields: doc.interface.input,
      outputFields: doc.interface.output,
      executor: rt.executor,
      model: 'model' in rt && rt.model ? (rt.model as string) : '',
      maxTokens:
        'max_tokens' in rt && rt.max_tokens ? (rt.max_tokens as number) : 4096,
      temperature:
        'temperature' in rt && rt.temperature !== undefined
          ? (rt.temperature as number)
          : 0.7,
      tools: doc.config.tools ?? [],
      memory: doc.config.memory ?? 'none',
      maxRetries: doc.config.max_retries ?? 0,
      timeoutSeconds: doc.config.timeout_seconds ?? 60,
      onError: doc.config.on_error ?? 'stop',
      entrypoint:
        'entrypoint' in rt && rt.entrypoint ? (rt.entrypoint as string) : '',
      workingDirectory:
        'working_directory' in rt && rt.working_directory
          ? (rt.working_directory as string)
          : '',
      parseOutput:
        'parse_output' in rt && rt.parse_output
          ? (rt.parse_output as 'json' | 'text' | 'lines')
          : 'text',
      transport:
        'transport' in rt && rt.transport
          ? (rt.transport as 'stdio' | 'sse')
          : 'stdio',
      mcpUrl: 'url' in rt && rt.url ? (rt.url as string) : '',
      mcpCommand: 'command' in rt && rt.command ? (rt.command as string) : '',
      mcpArgs:
        'args' in rt && Array.isArray(rt.args)
          ? (rt.args as string[]).join(' ')
          : '',
      instructions:
        typeof doc.instructions === 'string'
          ? doc.instructions
          : JSON.stringify(doc.instructions, null, 2),
      examples: doc.examples,
      dependencies: doc.dependencies,
    };
    dispatch({ type: 'LOAD', state });
  }, []);

  const toAbilityDocument = useCallback((): AbilityDocument => {
    const runtime = buildRuntime(formState);

    return {
      frontmatter: {
        id: formState.id || slugify(formState.name),
        name: formState.name,
        version: formState.version,
        description: formState.description,
        tags: formState.tags,
        author: formState.author,
        enabled: formState.enabled,
        ...(formState.icon ? { icon: formState.icon } : {}),
      },
      trigger: formState.trigger,
      interface: {
        input: formState.inputFields,
        output: formState.outputFields,
      },
      config: {
        runtime,
        ...(formState.tools.length > 0 ? { tools: formState.tools } : {}),
        ...(formState.memory !== 'none' ? { memory: formState.memory } : {}),
        ...(formState.maxRetries > 0
          ? { max_retries: formState.maxRetries }
          : {}),
        ...(formState.timeoutSeconds !== 60
          ? { timeout_seconds: formState.timeoutSeconds }
          : {}),
        ...(formState.onError !== 'stop'
          ? { on_error: formState.onError }
          : {}),
      },
      instructions: formState.instructions,
      examples: formState.examples,
      dependencies: formState.dependencies,
    };
  }, [formState]);

  return { formState, setField, resetForm, loadFromAbility, toAbilityDocument };
}

function buildRuntime(
  state: AgentFormState,
): AbilityDocument['config']['runtime'] {
  switch (state.executor) {
    case 'skill':
      return {
        executor: 'skill' as const,
        ...(state.model ? { model: state.model } : {}),
        ...(state.maxTokens !== 4096 ? { max_tokens: state.maxTokens } : {}),
        ...(state.temperature !== 0.7
          ? { temperature: state.temperature }
          : {}),
      };
    case 'command':
      return {
        executor: 'command' as const,
        entrypoint: state.entrypoint,
        ...(state.workingDirectory
          ? { working_directory: state.workingDirectory }
          : {}),
        ...(state.parseOutput !== 'text'
          ? { parse_output: state.parseOutput }
          : {}),
      };
    case 'mcp':
      return {
        executor: 'mcp' as const,
        transport: state.transport,
        ...(state.mcpUrl ? { url: state.mcpUrl } : {}),
        ...(state.mcpCommand ? { command: state.mcpCommand } : {}),
        ...(state.mcpArgs ? { args: state.mcpArgs.split(/\s+/) } : {}),
      };
    case 'workflow':
      return { executor: 'workflow' as const };
  }
}
