import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

export interface BrowserStatus {
  running: boolean;
}

export interface NavigateParams {
  url: string;
}

export interface ScreenshotResult {
  success: boolean;
  image: string;
}

export function useBrowserStatus() {
  return useQuery<BrowserStatus>({
    queryKey: ["browser-status"],
    queryFn: () => apiFetch<BrowserStatus>("/api/browser/status"),
    refetchInterval: 5000,
  });
}

export function useLaunchBrowser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean }>("/api/browser/launch", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browser-status"] });
    },
  });
}

export function useNavigate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: NavigateParams) =>
      apiFetch<{ success: boolean; url: string }>("/api/browser/navigate", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browser-status"] });
    },
  });
}

export function useScreenshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<ScreenshotResult>("/api/browser/screenshot", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browser-status"] });
    },
  });
}

export function useCloseBrowser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean }>("/api/browser/close", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["browser-status"] });
    },
  });
}

export interface InspectInAgentParams {
  selector: string;
  description: string;
  projectId: string;
}

export interface InspectInAgentResult {
  stageId: string;
  pipelineId: string;
}

export function useInspectInAgent() {
  return useMutation({
    mutationFn: (params: InspectInAgentParams) =>
      apiFetch<InspectInAgentResult>("/api/browser/inspect-in-agent", {
        method: "POST",
        body: JSON.stringify(params),
      }),
  });
}
