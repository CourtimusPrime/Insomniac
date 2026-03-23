import {
  AlertCircle,
  Check,
  Download,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  type MarketplaceItemType,
  useInstallItem,
  useMarketplace,
} from '../../api/marketplace';
import { type MarketplaceCategory, useLayoutStore } from '../../stores/layout';

type CategoryTab = 'all' | MarketplaceItemType;

const CATEGORIES: { key: CategoryTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'workflow', label: 'Workflows' },
  { key: 'agent-config', label: 'Agent Configs' },
  { key: 'template', label: 'Templates' },
  { key: 'mcp-adapter', label: 'MCP Adapters' },
];

const TYPE_COLORS: Record<string, string> = {
  workflow: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'agent-config': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  template: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'mcp-adapter': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
};

const TIER_CONFIG: Record<
  string,
  { icon: typeof Shield; color: string; label: string }
> = {
  community: { icon: Shield, color: 'text-text-muted', label: 'Community' },
  verified: {
    icon: ShieldCheck,
    color: 'text-status-success',
    label: 'Verified',
  },
  official: {
    icon: ShieldAlert,
    color: 'text-accent-primary',
    label: 'Official',
  },
};

export function MarketplaceView() {
  const storeCategory = useLayoutStore((s) => s.marketplaceCategory);
  const setStoreCategory = useLayoutStore((s) => s.setMarketplaceCategory);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] =
    useState<CategoryTab>(storeCategory);

  // Sync from store when sidebar changes the category
  useEffect(() => {
    setActiveCategory(storeCategory);
  }, [storeCategory]);

  const handleCategoryChange = (cat: CategoryTab) => {
    setActiveCategory(cat);
    setStoreCategory(cat as MarketplaceCategory);
  };
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Record<string, string>>({});
  const installMutation = useInstallItem();

  const filters = {
    ...(activeCategory !== 'all' ? { type: activeCategory } : {}),
    ...(search ? { search } : {}),
  };

  const { data, isLoading, error } = useMarketplace(
    Object.keys(filters).length > 0 ? filters : undefined,
  );

  if (isLoading) {
    return (
      <div className="p-5 flex items-center gap-2 text-xs text-text-muted">
        <Loader2 size={14} className="animate-spin" />
        Loading marketplace…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 flex items-center gap-2 text-xs text-status-error">
        <AlertCircle size={14} />
        Failed to load marketplace: {(error as Error).message}
      </div>
    );
  }

  const items = data?.items ?? [];

  const handleInstall = (itemId: string) => {
    // Clear any previous error for this item
    setErrorIds((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    installMutation.mutate(
      { id: itemId },
      {
        onSuccess: () => {
          setInstalledIds((prev) => new Set(prev).add(itemId));
        },
        onError: (err) => {
          setErrorIds((prev) => ({
            ...prev,
            [itemId]: (err as Error).message,
          }));
        },
      },
    );
  };

  return (
    <div className="p-5 space-y-4 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-text-primary font-heading">
          Marketplace
        </h2>
        <p className="text-[11px] text-text-muted mt-0.5">
          Browse and install workflows, agent configs, templates, and MCP
          adapters
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint z-10"
        />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search marketplace…"
          className="h-8 text-xs pl-8"
        />
      </div>

      {/* Category tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={(val) => handleCategoryChange(val as CategoryTab)}
      >
        <TabsList className="h-auto bg-transparent p-0 gap-1">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.key}
              value={cat.key}
              className="px-3 py-1.5 text-[11px] rounded data-[state=active]:bg-accent-primary/15 data-[state=active]:text-accent-primary data-[state=active]:shadow-none text-text-muted hover:text-text-default hover:bg-bg-hover"
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Results count */}
      <div className="text-[10px] text-text-faint">
        {data?.total ?? 0} item{(data?.total ?? 0) !== 1 ? 's' : ''}
      </div>

      {/* Item grid */}
      {items.length === 0 ? (
        <div className="text-xs text-text-muted py-8 text-center">
          No items found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const tierCfg =
              TIER_CONFIG[item.trustTier] ?? TIER_CONFIG.community;
            const TierIcon = tierCfg.icon;

            return (
              <Card
                key={item.id}
                className="border-border-default bg-bg-base hover:border-border-default/80 transition"
              >
                <CardContent className="p-4 space-y-2.5">
                  {/* Top row: name + badges */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-text-primary truncate">
                        {item.name}
                      </h3>
                      <span className="text-[10px] text-text-muted">
                        {item.author}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded font-normal',
                          TYPE_COLORS[item.type] ?? '',
                        )}
                      >
                        {item.type}
                      </Badge>
                      <span
                        className={`flex items-center gap-0.5 ${tierCfg.color}`}
                        title={tierCfg.label}
                      >
                        <TierIcon size={11} />
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Footer: install count + install button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-text-faint">
                      <span className="flex items-center gap-1">
                        <Download size={10} />
                        {item.installCount}
                      </span>
                      <span>v{item.version}</span>
                    </div>

                    {installedIds.has(item.id) ? (
                      <span className="flex items-center gap-1 text-[10px] text-status-success">
                        <Check size={11} />
                        Installed
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleInstall(item.id)}
                        disabled={
                          installMutation.isPending &&
                          installMutation.variables?.id === item.id
                        }
                        className="border-accent-primary/30 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20"
                      >
                        {installMutation.isPending &&
                        installMutation.variables?.id === item.id ? (
                          <>
                            <Loader2 size={10} className="animate-spin" />
                            Installing…
                          </>
                        ) : (
                          <>
                            <Download size={10} />
                            Install
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Inline error */}
                  {errorIds[item.id] && (
                    <div className="flex items-center gap-1 text-[10px] text-status-error">
                      <AlertCircle size={10} />
                      {errorIds[item.id]}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
