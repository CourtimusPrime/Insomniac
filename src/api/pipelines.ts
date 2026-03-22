import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

export interface Pipeline {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  status: "idle" | "running" | "completed" | "error" | "paused" | "cancelled";
  checkpointStageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  agentId: string | null;
  model: string | null;
  status: "queued" | "running" | "done" | "needs-you" | "error" | "skipped";
  description: string | null;
  sortOrder: number;
}

export function usePipelines(projectId: string | null) {
  return useQuery<Pipeline[]>({
    queryKey: ["pipelines", projectId],
    queryFn: () => apiFetch<Pipeline[]>(`/api/pipelines?projectId=${projectId}`),
    enabled: !!projectId,
  });
}

export function usePipelineStages(pipelineId: string | null) {
  return useQuery<PipelineStage[]>({
    queryKey: ["pipelineStages", pipelineId],
    queryFn: () =>
      apiFetch<PipelineStage[]>(`/api/pipelines/${pipelineId}/stages`),
    enabled: !!pipelineId,
  });
}

export function usePausePipeline(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pipelineId: string) =>
      apiFetch(`/api/pipelines/${pipelineId}/pause`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines", projectId] });
    },
  });
}

export function useResumePipeline(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pipelineId: string) =>
      apiFetch(`/api/pipelines/${pipelineId}/resume`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines", projectId] });
    },
  });
}

export function useCancelPipeline(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pipelineId: string) =>
      apiFetch(`/api/pipelines/${pipelineId}/cancel`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines", projectId] });
    },
  });
}

export interface SteerResult {
  action: string;
  result: string;
}

export function useSteerPipeline(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<SteerResult, Error, { pipelineId: string; message: string }>({
    mutationFn: ({ pipelineId, message }) =>
      apiFetch<SteerResult>(`/api/pipelines/${pipelineId}/steer`, {
        method: "POST",
        body: JSON.stringify({ message }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines", projectId] });
      queryClient.invalidateQueries({ queryKey: ["pipelineStages"] });
    },
  });
}

export function useAddStage(pipelineId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<
    PipelineStage,
    Error,
    { name: string; model?: string; description?: string }
  >({
    mutationFn: (body) =>
      apiFetch<PipelineStage>(`/api/pipelines/${pipelineId}/stages`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelineStages", pipelineId] });
    },
  });
}

export interface ProjectPreferences {
  id: string;
  projectId: string;
  providerId: string;
  defaultModel: string | null;
  taskTypeOverrides: Record<string, string> | null;
  createdAt: string;
}

export function useProjectPreferences(projectId: string | null) {
  return useQuery<ProjectPreferences | null>({
    queryKey: ["projectPreferences", projectId],
    queryFn: async () => {
      try {
        return await apiFetch<ProjectPreferences>(`/api/projects/${projectId}/preferences`);
      } catch {
        return null;
      }
    },
    enabled: !!projectId,
  });
}
