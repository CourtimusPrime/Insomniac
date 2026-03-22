import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { Template } from "./templates";

export type MarketplaceItemType =
  | "workflow"
  | "agent-config"
  | "template"
  | "mcp-adapter";

export type TrustTier = "community" | "verified" | "official";

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  type: MarketplaceItemType;
  author: string;
  version: string;
  trustTier: TrustTier;
  installCount: number;
  lastUpdated: string;
  repoUrl: string;
  downloadUrl: string;
}

export interface MarketplaceFilters {
  type?: MarketplaceItemType;
  trustTier?: TrustTier;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MarketplaceResponse {
  items: MarketplaceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useMarketplace(filters?: MarketplaceFilters) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.trustTier) params.set("trustTier", filters.trustTier);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const qs = params.toString();

  return useQuery<MarketplaceResponse>({
    queryKey: ["marketplace", filters],
    queryFn: () =>
      apiFetch<MarketplaceResponse>(`/api/marketplace${qs ? `?${qs}` : ""}`),
  });
}

export function useMarketplaceItem(id: string | null) {
  return useQuery<MarketplaceItem>({
    queryKey: ["marketplace", id],
    queryFn: () => apiFetch<MarketplaceItem>(`/api/marketplace/${id}`),
    enabled: !!id,
  });
}

export function useInstallItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      workspaceId,
    }: {
      id: string;
      workspaceId?: string;
    }) =>
      apiFetch<{
        installed: boolean;
        template: Template;
        source: { marketplaceId: string; name: string; version: string };
      }>(`/api/marketplace/${id}/install`, {
        method: "POST",
        body: JSON.stringify(workspaceId ? { workspaceId } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
