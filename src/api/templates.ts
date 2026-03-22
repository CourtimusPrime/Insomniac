import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

export interface Template {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  category: "workflow" | "agent-config" | "template" | "mcp-adapter";
  chainDefinition: unknown;
  author: string | null;
  version: string | null;
  isBuiltIn: boolean;
  installCount: number;
  createdAt: string;
  updatedAt: string;
}

export function useTemplates() {
  return useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => apiFetch<Template[]>("/api/templates"),
  });
}

export function useTemplate(id: string | null) {
  return useQuery<Template>({
    queryKey: ["templates", id],
    queryFn: () => apiFetch<Template>(`/api/templates/${id}`),
    enabled: !!id,
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, projectId }: { templateId: string; projectId: string }) =>
      apiFetch<{ project: unknown; appliedTemplate: string }>(
        `/api/templates/${templateId}/apply`,
        {
          method: "POST",
          body: JSON.stringify({ projectId }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      description?: string;
      category: "workflow" | "agent-config" | "template" | "mcp-adapter";
      chainDefinition: { version: number; nodes: unknown[]; edges: unknown[] };
      author?: string;
      version?: string;
      workspaceId: string;
    }) =>
      apiFetch<Template>("/api/templates", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
