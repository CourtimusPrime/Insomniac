/* ------------------------------------------------------------------ */
/*  Marketplace types                                                  */
/* ------------------------------------------------------------------ */

export type MarketplaceItemType =
  | 'workflow'
  | 'agent-config'
  | 'template'
  | 'mcp-adapter';

export type TrustTier = 'community' | 'verified' | 'official';

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
}
