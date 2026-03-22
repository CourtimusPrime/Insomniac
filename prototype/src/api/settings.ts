import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

interface SettingResponse {
  key: string;
  value: unknown;
}

export function useSetting(key: string) {
  return useQuery<SettingResponse>({
    queryKey: ["settings", key],
    queryFn: () => apiFetch<SettingResponse>(`/api/settings/${key}`),
  });
}

export function useSaveSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value, category }: { key: string; value: unknown; category?: string }) =>
      apiFetch<SettingResponse>(`/api/settings/${key}`, {
        method: "PUT",
        body: JSON.stringify({ value, category }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["settings", variables.key] });
    },
  });
}

export function useTestSlackWebhook() {
  return useMutation({
    mutationFn: (webhookUrl: string) =>
      apiFetch<{ success: boolean; error?: string }>("/api/settings/slack/test", {
        method: "POST",
        body: JSON.stringify({ webhookUrl }),
      }),
  });
}
