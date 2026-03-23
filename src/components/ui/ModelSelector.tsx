import { useQueries } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { apiFetch } from '../../api/client';
import {
  type ModelDefinition,
  type Provider,
  useProviders,
} from '../../api/providers';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
}

interface ProviderGroup {
  provider: Provider;
  models: ModelDefinition[];
}

export function ModelSelector({
  value,
  onChange,
  className,
}: ModelSelectorProps) {
  const { data: providers, isLoading: providersLoading } = useProviders();

  const activeProviders = providers?.filter((p) => p.isActive) ?? [];

  const modelQueries = useQueries({
    queries: activeProviders.map((provider) => ({
      queryKey: ['providerModels', provider.id],
      queryFn: () =>
        apiFetch<ModelDefinition[]>(`/api/providers/${provider.id}/models`),
    })),
  });

  const isLoading = providersLoading || modelQueries.some((q) => q.isLoading);

  // Build grouped model list
  const groups: ProviderGroup[] = activeProviders
    .map((provider, i) => ({
      provider,
      models: modelQueries[i]?.data ?? [],
    }))
    .filter((g) => g.models.length > 0);

  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs text-text-muted',
          className,
        )}
      >
        <Loader2 size={12} className="animate-spin" />
        Loading models...
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className={cn('text-xs text-text-muted', className)}>
        No models available. Configure a provider in Settings.
      </div>
    );
  }

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          'h-8 text-xs bg-bg-surface border-border-default text-text-primary',
          className,
        )}
      >
        <SelectValue placeholder="Select a model..." />
      </SelectTrigger>
      <SelectContent>
        {groups.map(({ provider, models }) => (
          <SelectGroup key={provider.id}>
            <SelectLabel className="text-[10px] font-semibold text-text-muted">
              {provider.displayName}
            </SelectLabel>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id} className="text-xs">
                {model.displayName}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
