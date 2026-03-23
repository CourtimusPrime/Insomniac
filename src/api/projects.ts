import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  status: 'idle' | 'building' | 'completed' | 'error';
  language: string | null;
  repoUrl: string | null;
  path: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => apiFetch<Project[]>('/api/projects'),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      name: string;
      language?: string;
      repoUrl?: string;
      path?: string;
    }) =>
      apiFetch<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      status?: string;
      language?: string;
    }) =>
      apiFetch<Project>(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/projects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useCloneProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { repoUrl: string; name?: string }) =>
      apiFetch<Project>('/api/projects/clone', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export interface ChainDefinition {
  version: number;
  nodes: {
    id: string;
    type: string;
    label: string;
    model?: string | null;
    systemPrompt?: string | null;
    status?: string;
    abilities?: { id: string; name: string }[];
    position: { x: number; y: number };
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    condition?: string;
  }[];
}

export function useChain(projectId: string | null) {
  return useQuery<ChainDefinition>({
    queryKey: ['chain', projectId],
    queryFn: () =>
      apiFetch<ChainDefinition>(`/api/projects/${projectId}/chain`),
    enabled: !!projectId,
  });
}

export function useSaveChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      chain,
    }: {
      projectId: string;
      chain: ChainDefinition;
    }) =>
      apiFetch<ChainDefinition>(`/api/projects/${projectId}/chain`, {
        method: 'PUT',
        body: JSON.stringify(chain),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['chain', variables.projectId],
      });
    },
  });
}

export function useOpenInVSCode() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/projects/${id}/open-vscode`, {
        method: 'POST',
      }),
  });
}
