import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

export interface Ability {
  id: string;
  workspaceId: string;
  name: string;
  type: "skill" | "plugin" | "mcp";
  active: boolean;
  config: Record<string, unknown> | null;
  version: string | null;
  createdAt: string;
}

export function useAbilities() {
  return useQuery<Ability[]>({
    queryKey: ["abilities"],
    queryFn: () => apiFetch<Ability[]>("/api/abilities"),
  });
}

export function useAbility(id: string | null) {
  return useQuery<Ability>({
    queryKey: ["abilities", id],
    queryFn: () => apiFetch<Ability>(`/api/abilities/${id}`),
    enabled: !!id,
  });
}

export function useCreateAbility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      name: string;
      type: "skill" | "plugin" | "mcp";
      config?: Record<string, unknown>;
      version?: string;
      active?: boolean;
    }) =>
      apiFetch<Ability>("/api/abilities", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abilities"] });
    },
  });
}

export function useUpdateAbility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      type?: "skill" | "plugin" | "mcp";
      config?: Record<string, unknown>;
      version?: string;
      active?: boolean;
    }) =>
      apiFetch<Ability>(`/api/abilities/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abilities"] });
    },
  });
}

export function useDeleteAbility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/abilities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abilities"] });
    },
  });
}

export function useImportSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (markdown: string) =>
      apiFetch<Ability>("/api/abilities/import-skill", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: markdown,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["abilities"] });
    },
  });
}
