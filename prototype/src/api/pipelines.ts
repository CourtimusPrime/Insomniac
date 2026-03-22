import { useQuery } from "@tanstack/react-query";
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
