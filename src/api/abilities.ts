import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

// ── Types matching abilities_v2 schema ──

export type ExecutorType = 'skill' | 'command' | 'mcp' | 'workflow';
export type AbilityKind = 'skill' | 'agent' | 'command' | 'mcp' | 'workflow';

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

export interface AbilityDocument {
  frontmatter: {
    id: string;
    name: string;
    version: string;
    description: string;
    tags: string[];
    author: string;
    enabled: boolean;
    icon?: string;
  };
  trigger: string;
  interface: AbilityInterface;
  config: {
    runtime: {
      executor: ExecutorType;
      model?: string;
      max_tokens?: number;
      temperature?: number;
      entrypoint?: string;
      transport?: 'stdio' | 'sse';
      url?: string;
      [key: string]: unknown;
    };
    tools?: string[];
    memory?: 'session' | 'persistent' | 'none';
    max_retries?: number;
    timeout_seconds?: number;
    on_error?: 'stop' | 'continue';
    [key: string]: unknown;
  };
  instructions: string | WorkflowStep[];
  examples: string;
  dependencies: string[];
}

export interface Ability {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  executor: ExecutorType;
  enabled: boolean;
  document: AbilityDocument | null;
  filePath: string;
  contentHash: string;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
  kind: AbilityKind;
}

// ── Filter params ──

export interface AbilityFilters {
  executor?: ExecutorType;
  tags?: string;
  search?: string;
  enabled?: string;
}

// ── Hooks ──

export function useAbilities(filters?: AbilityFilters) {
  const params = new URLSearchParams();
  if (filters?.executor) params.set('executor', filters.executor);
  if (filters?.tags) params.set('tags', filters.tags);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.enabled) params.set('enabled', filters.enabled);
  const qs = params.toString();

  return useQuery<Ability[]>({
    queryKey: ['abilities', filters],
    queryFn: () => apiFetch<Ability[]>(`/api/abilities${qs ? `?${qs}` : ''}`),
  });
}

export function useAbility(id: string | null) {
  return useQuery<Ability>({
    queryKey: ['abilities', id],
    queryFn: () => apiFetch<Ability>(`/api/abilities/${id}`),
    enabled: !!id,
  });
}

export function useAbilityYaml(id: string | null) {
  return useQuery<string>({
    queryKey: ['abilities', id, 'yaml'],
    queryFn: async () => {
      const res = await fetch(`/api/abilities/${id}/yaml`);
      return res.text();
    },
    enabled: !!id,
  });
}

export function useCreateAbility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      body: Partial<AbilityDocument> & {
        frontmatter: AbilityDocument['frontmatter'];
        config: AbilityDocument['config'];
      },
    ) =>
      apiFetch<Ability>('/api/abilities', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abilities'] });
    },
  });
}

export function useUpdateAbility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<AbilityDocument>) =>
      apiFetch<Ability>(`/api/abilities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abilities'] });
    },
  });
}

export function useDeleteAbility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/abilities/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abilities'] });
    },
  });
}

export function useToggleAbility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Ability>(`/api/abilities/${id}/toggle`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abilities'] });
    },
  });
}

export function useImportAbility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (yamlContent: string) =>
      apiFetch<Ability>('/api/abilities/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: yamlContent,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abilities'] });
    },
  });
}
