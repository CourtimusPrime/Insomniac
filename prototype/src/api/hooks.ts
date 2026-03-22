import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

export interface Hook {
  id: string;
  workspaceId: string;
  name: string;
  trigger:
    | "pre-stage"
    | "post-stage"
    | "on-decision"
    | "on-agent-error"
    | "on-pipeline-complete"
    | "on-file-change"
    | "on-test-fail"
    | "on-test-pass"
    | "scheduled";
  action: { type: "shell" | "webhook" | "slack"; config: Record<string, unknown> };
  enabled: boolean;
  projectId: string | null;
  createdAt: string;
}

export function useHooks(projectId?: string) {
  const params = projectId ? `?projectId=${projectId}` : "";
  return useQuery<Hook[]>({
    queryKey: ["hooks", projectId ?? "all"],
    queryFn: () => apiFetch<Hook[]>(`/api/hooks${params}`),
  });
}

export function useCreateHook() {
  const queryClient = useQueryClient();
  return useMutation<
    Hook,
    Error,
    {
      name: string;
      trigger: Hook["trigger"];
      action: Hook["action"];
      enabled?: boolean;
      projectId?: string | null;
    }
  >({
    mutationFn: (body) =>
      apiFetch<Hook>("/api/hooks", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hooks"] });
    },
  });
}

export function useUpdateHook() {
  const queryClient = useQueryClient();
  return useMutation<
    Hook,
    Error,
    {
      id: string;
      name?: string;
      trigger?: Hook["trigger"];
      action?: Hook["action"];
      enabled?: boolean;
      projectId?: string | null;
    }
  >({
    mutationFn: ({ id, ...body }) =>
      apiFetch<Hook>(`/api/hooks/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hooks"] });
    },
  });
}

export function useDeleteHook() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/hooks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hooks"] });
    },
  });
}
