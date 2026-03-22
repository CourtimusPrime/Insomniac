import { useState } from 'react';
import { Loader2, AlertCircle, Shield, Cpu, CheckCircle2, XCircle, Plus, X } from 'lucide-react';
import { useProviders, useAddProvider, useProviderModels, type Provider, type ProviderName } from '../../api/providers';
import { useProjects } from '../../api/projects';

type SettingsTab = 'providers';

const PROVIDER_OPTIONS: { value: ProviderName; label: string }[] = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'custom', label: 'Custom' },
];

function AddProviderForm({ onClose }: { onClose: () => void }) {
  const { data: projects } = useProjects();
  const addProvider = useAddProvider();
  const [name, setName] = useState<ProviderName>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const isOllama = name === 'ollama';
  const isCustom = name === 'custom';
  const showApiKey = !isOllama;
  const showBaseUrl = isOllama || isCustom;

  const displayName = PROVIDER_OPTIONS.find(o => o.value === name)?.label ?? name;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const workspaceId = projects?.[0]?.workspaceId;
    if (!workspaceId) return;

    addProvider.mutate(
      {
        workspaceId,
        name,
        displayName,
        ...(showApiKey && apiKey ? { apiKey } : {}),
        ...(showBaseUrl && baseUrl ? { baseUrl } : {}),
        isActive: true,
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border-default p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium font-heading text-text-primary">Add Provider</span>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X size={14} />
        </button>
      </div>

      {/* Provider type */}
      <div className="space-y-1">
        <label className="text-[11px] text-text-muted">Provider</label>
        <select
          value={name}
          onChange={e => {
            const val = e.target.value as ProviderName;
            setName(val);
            if (val === 'ollama') {
              setApiKey('');
              setBaseUrl('http://localhost:11434');
            } else {
              setBaseUrl('');
            }
          }}
          className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary"
        >
          {PROVIDER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* API Key */}
      {showApiKey && (
        <div className="space-y-1">
          <label className="text-[11px] text-text-muted">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-faint"
          />
        </div>
      )}

      {/* Base URL */}
      {showBaseUrl && (
        <div className="space-y-1">
          <label className="text-[11px] text-text-muted">Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder={isOllama ? 'http://localhost:11434' : 'https://api.example.com'}
            className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-faint"
          />
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-[11px] rounded text-text-muted hover:text-text-primary hover:bg-bg-hover"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={addProvider.isPending}
          className="px-3 py-1.5 text-[11px] rounded bg-accent-primary text-white hover:bg-accent-primary/90 disabled:opacity-50"
        >
          {addProvider.isPending ? 'Adding...' : 'Add Provider'}
        </button>
      </div>

      {addProvider.isError && (
        <div className="text-[11px] text-status-error flex items-center gap-1">
          <AlertCircle size={12} />
          {(addProvider.error as Error).message}
        </div>
      )}
    </form>
  );
}

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
  const [showForm, setShowForm] = useState(false);

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

  return (
    <div className="space-y-3">
      {/* Add Provider button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded border border-dashed border-border-default text-text-muted hover:text-accent-primary hover:border-accent-primary transition"
        >
          <Plus size={12} />
          Add Provider
        </button>
      )}

      {/* Add Provider form */}
      {showForm && <AddProviderForm onClose={() => setShowForm(false)} />}

      {/* Provider list */}
      {providers && providers.length > 0 ? (
        providers.map(provider => (
          <ProviderCard key={provider.id} provider={provider} />
        ))
      ) : (
        <div className="text-xs text-text-muted">
          No providers configured. Add a provider to get started.
        </div>
      )}
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
