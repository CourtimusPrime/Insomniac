import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

export interface Credential {
  id: string;
  workspaceId: string;
  name: string;
  providerName: string;
  clientId: string; // always "****" from API
  clientSecret: string; // always "****" from API
  redirectUri: string;
  scopes: string[];
  projectId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export function useCredentials(projectId?: string) {
  const params = projectId ? `?projectId=${projectId}` : "";
  return useQuery<Credential[]>({
    queryKey: ["credentials", projectId ?? "all"],
    queryFn: () => apiFetch<Credential[]>(`/api/credentials${params}`),
  });
}

export function useCreateCredential() {
  const queryClient = useQueryClient();
  return useMutation<
    Credential,
    Error,
    {
      name: string;
      providerName: string;
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      scopes: string[];
      projectId?: string | null;
    }
  >({
    mutationFn: (body) =>
      apiFetch<Credential>("/api/credentials", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
    },
  });
}

export function useDeleteCredential() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/credentials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
    },
  });
}
