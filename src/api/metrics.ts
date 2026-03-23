import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface SystemMetrics {
  cpu: number;
  ram: number;
  uptime: number;
}

export interface SessionUsage {
  totalTokens: number;
  estimatedCost: number;
}

export type SystemInfo = {
  mode: 'local' | 'remote' | 'hosted';
  version: string;
  platform: string;
};

export type AuthUser = {
  username: string;
  avatarUrl: string;
};

export function useAuthUser(enabled: boolean) {
  return useQuery<AuthUser>({
    queryKey: ['authUser'],
    queryFn: () => apiFetch<AuthUser>('/api/auth/me'),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useSystemInfo() {
  return useQuery<SystemInfo>({
    queryKey: ['systemInfo'],
    queryFn: () => apiFetch<SystemInfo>('/api/system/info'),
    staleTime: 60_000,
  });
}

export function useSystemMetrics() {
  return useQuery<SystemMetrics>({
    queryKey: ['systemMetrics'],
    queryFn: () => apiFetch<SystemMetrics>('/api/system/metrics'),
    refetchInterval: 2000,
  });
}

export function useSessionUsage() {
  return useQuery<SessionUsage>({
    queryKey: ['sessionUsage'],
    queryFn: () => apiFetch<SessionUsage>('/api/usage/session'),
    refetchInterval: 2000,
  });
}
