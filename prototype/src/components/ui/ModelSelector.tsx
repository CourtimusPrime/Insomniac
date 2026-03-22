import { useQueries } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useProviders, type Provider, type ModelDefinition } from '../../api/providers';
import { apiFetch } from '../../api/client';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
}

interface ProviderGroup {
  provider: Provider;
  models: ModelDefinition[];
}

export function ModelSelector({ value, onChange, className }: ModelSelectorProps) {
  const { data: providers, isLoading: providersLoading } = useProviders();

  const activeProviders = providers?.filter(p => p.isActive) ?? [];

  const modelQueries = useQueries({
    queries: activeProviders.map(provider => ({
      queryKey: ['providerModels', provider.id],
      queryFn: () => apiFetch<ModelDefinition[]>(`/api/providers/${provider.id}/models`),
    })),
  });

  const isLoading = providersLoading || modelQueries.some(q => q.isLoading);

  // Build grouped model list
  const groups: ProviderGroup[] = activeProviders
    .map((provider, i) => ({
      provider,
      models: modelQueries[i]?.data ?? [],
    }))
    .filter(g => g.models.length > 0);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-1.5 text-xs text-text-muted ${className ?? ''}`}>
        <Loader2 size={12} className="animate-spin" />
        Loading models...
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className={`text-xs text-text-muted ${className ?? ''}`}>
        No models available. Configure a provider in Settings.
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary ${className ?? ''}`}
    >
      {!value && <option value="">Select a model...</option>}
      {groups.map(({ provider, models }) => (
        <optgroup key={provider.id} label={provider.displayName}>
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.displayName}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
