import { useState } from 'react';
import { Loader2, AlertCircle, Shield, Cpu, CheckCircle2, XCircle } from 'lucide-react';
import { useProviders, useProviderModels, type Provider } from '../../api/providers';

type SettingsTab = 'providers';

function ProviderCard({ provider }: { provider: Provider }) {
  const { data: models } = useProviderModels(provider.id);
  const modelCount = models?.length ?? 0;

  return (
    <div className="rounded-lg border border-border-default px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-accent-primary/10 flex items-center justify-center shrink-0">
        <Cpu size={16} className="text-accent-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium font-heading text-text-primary">{provider.displayName}</span>
          {provider.isActive ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-status-success/15 text-status-success border-status-success/30 flex items-center gap-1">
              <CheckCircle2 size={10} /> Active
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-bg-hover text-text-muted border-border-muted flex items-center gap-1">
              <XCircle size={10} /> Inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-text-muted capitalize">{provider.name}</span>
          <span className="text-[11px] text-text-faint">
            {modelCount} {modelCount === 1 ? 'model' : 'models'}
          </span>
          {provider.hasApiKey && (
            <span className="text-[10px] text-text-faint flex items-center gap-1">
              <Shield size={10} /> Key configured
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProvidersTab() {
  const { data: providers, isLoading, error } = useProviders();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Loader2 size={14} className="animate-spin" />
        Loading providers…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-status-error">
        <AlertCircle size={14} />
        Failed to load providers: {(error as Error).message}
      </div>
    );
  }

  if (!providers || providers.length === 0) {
    return (
      <div className="text-xs text-text-muted">
        No providers configured. Add a provider to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {providers.map(provider => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </div>
  );
}

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'providers', label: 'Providers' },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');

  return (
    <div className="p-5 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-bold font-heading text-text-primary">Settings</h2>
        <p className="text-[11px] text-text-muted mt-0.5">Manage AI providers and project preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border-default pb-px">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-[11px] rounded-t transition ${
              activeTab === tab.id
                ? 'bg-accent-primary/15 text-accent-primary border-b-2 border-accent-primary'
                : 'text-text-muted hover:text-text-default hover:bg-bg-hover'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'providers' && <ProvidersTab />}
    </div>
  );
}
