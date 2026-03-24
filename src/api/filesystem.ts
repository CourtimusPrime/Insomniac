import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface FilesystemStatus {
  enabled: boolean;
}

export interface FileEntry {
  name: string;
  type: 'file' | 'dir';
}

export interface FilesystemResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export function useFilesystemStatus() {
  return useQuery<FilesystemStatus>({
    queryKey: ['filesystem-status'],
    queryFn: () => apiFetch<FilesystemStatus>('/api/filesystem/status'),
  });
}

export function useReadFile() {
  return useMutation({
    mutationFn: (params: { projectId: string; path: string }) =>
      apiFetch<FilesystemResult>('/api/filesystem/read', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  });
}

export function useWriteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      projectId: string;
      path: string;
      content: string;
    }) =>
      apiFetch<FilesystemResult>('/api/filesystem/write', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filesystem-list'] });
    },
  });
}

export function useListDirectory(projectId: string | null, path: string) {
  return useQuery<FilesystemResult>({
    queryKey: ['filesystem-list', projectId, path],
    queryFn: () =>
      apiFetch<FilesystemResult>('/api/filesystem/list', {
        method: 'POST',
        body: JSON.stringify({ projectId, path }),
      }),
    enabled: !!projectId,
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { projectId: string; path: string }) =>
      apiFetch<FilesystemResult>('/api/filesystem/delete', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filesystem-list'] });
    },
  });
}

export function useMkdir() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { projectId: string; path: string }) =>
      apiFetch<FilesystemResult>('/api/filesystem/mkdir', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filesystem-list'] });
    },
  });
}

export function useFileStat() {
  return useMutation({
    mutationFn: (params: { projectId: string; path: string }) =>
      apiFetch<FilesystemResult>('/api/filesystem/stat', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  });
}

export interface BrowseInfo {
  home: string;
  wsl: boolean;
  wslDrives: string[];
}

export interface BrowseEntry {
  name: string;
  path: string;
  type: 'dir';
}

export interface BrowseResult {
  path: string;
  name: string;
  entries: BrowseEntry[];
  isProject: boolean;
}

export function useBrowseInfo(enabled: boolean) {
  return useQuery<BrowseInfo>({
    queryKey: ['filesystem-browse-info'],
    queryFn: () => apiFetch<BrowseInfo>('/api/filesystem/browse/info'),
    enabled,
    staleTime: 60_000,
  });
}

export function useBrowseDirectory() {
  return useMutation({
    mutationFn: (params: { path: string }) =>
      apiFetch<BrowseResult>('/api/filesystem/browse', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  });
}
