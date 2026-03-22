import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

export interface SystemMetrics {
  cpu: number;
  ram: number;
  uptime: number;
}

export interface SessionUsage {
  totalTokens: number;
  estimatedCost: number;
}

export function useSystemMetrics() {
  return useQuery<SystemMetrics>({
    queryKey: ["systemMetrics"],
    queryFn: () => apiFetch<SystemMetrics>("/api/system/metrics"),
    refetchInterval: 2000,
  });
}

export function useSessionUsage() {
  return useQuery<SessionUsage>({
    queryKey: ["sessionUsage"],
    queryFn: () => apiFetch<SessionUsage>("/api/usage/session"),
    refetchInterval: 2000,
  });
}
