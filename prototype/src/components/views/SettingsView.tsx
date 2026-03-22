import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Shield, Cpu, CheckCircle2, XCircle, Plus, X, Bell, Send, Webhook, Trash2, KeyRound, Pin, PinOff, Check } from 'lucide-react';
import { useProviders, useAddProvider, useProviderModels, type Provider, type ProviderName } from '../../api/providers';
import { useProjects } from '../../api/projects';
import { useSetting, useSaveSetting, useTestSlackWebhook } from '../../api/settings';
import { useHooks, useCreateHook, useUpdateHook, useDeleteHook, type Hook } from '../../api/hooks';
import { useCredentials, useCreateCredential, useDeleteCredential, type Credential } from '../../api/credentials';
import { useTheme } from '../../hooks/useTheme';
import { useLayoutStore } from '../../stores/layout';
import { getThemeById, mapVSCodeColors } from '../../themes';

type SettingsTab = 'providers' | 'notifications' | 'hooks' | 'credentials' | 'themes';

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

function NotificationsTab() {
  const { data: setting, isLoading } = useSetting('slack_webhook_url');
  const saveSetting = useSaveSetting();
  const testWebhook = useTestSlackWebhook();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (setting?.value && typeof setting.value === 'string') {
      setWebhookUrl(setting.value);
    }
  }, [setting]);

  function handleSave() {
    saveSetting.mutate(
      { key: 'slack_webhook_url', value: webhookUrl, category: 'notifications' },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  }

  function handleTest() {
    if (!webhookUrl) return;
    testWebhook.mutate(webhookUrl);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Loader2 size={14} className="animate-spin" />
        Loading notification settings…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-default p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-accent-primary" />
          <span className="text-xs font-medium font-heading text-text-primary">Slack Notifications</span>
        </div>

        <p className="text-[11px] text-text-muted">
          Enter a Slack incoming webhook URL to receive pipeline notifications, decision alerts, and error reports.
        </p>

        <div className="space-y-1">
          <label className="text-[11px] text-text-muted">Webhook URL</label>
          <input
            type="text"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-faint"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saveSetting.isPending}
            className="px-3 py-1.5 text-[11px] rounded bg-accent-primary text-white hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {saveSetting.isPending ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>

          <button
            onClick={handleTest}
            disabled={!webhookUrl || testWebhook.isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] rounded border border-border-default text-text-muted hover:text-text-primary hover:border-accent-primary disabled:opacity-50 transition"
          >
            <Send size={10} />
            {testWebhook.isPending ? 'Sending...' : 'Test'}
          </button>

          {testWebhook.isSuccess && (
            <span className="text-[11px] text-status-success flex items-center gap-1">
              <CheckCircle2 size={12} />
              Test message sent!
            </span>
          )}

          {testWebhook.isError && (
            <span className="text-[11px] text-status-error flex items-center gap-1">
              <AlertCircle size={12} />
              {(testWebhook.error as Error).message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const TRIGGER_OPTIONS: { value: Hook['trigger']; label: string }[] = [
  { value: 'pre-stage', label: 'Pre Stage' },
  { value: 'post-stage', label: 'Post Stage' },
  { value: 'on-decision', label: 'On Decision' },
  { value: 'on-agent-error', label: 'On Agent Error' },
  { value: 'on-pipeline-complete', label: 'On Pipeline Complete' },
  { value: 'on-file-change', label: 'On File Change' },
  { value: 'on-test-fail', label: 'On Test Fail' },
  { value: 'on-test-pass', label: 'On Test Pass' },
  { value: 'scheduled', label: 'Scheduled' },
];

const ACTION_TYPE_OPTIONS: { value: Hook['action']['type']; label: string }[] = [
  { value: 'shell', label: 'Shell Command' },
  { value: 'webhook', label: 'Webhook URL' },
  { value: 'slack', label: 'Slack Notification' },
];

function AddHookForm({ onClose }: { onClose: () => void }) {
  const { data: projects } = useProjects();
  const createHook = useCreateHook();
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<Hook['trigger']>('post-stage');
  const [actionType, setActionType] = useState<Hook['action']['type']>('shell');
  const [actionConfig, setActionConfig] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const configKey = actionType === 'shell' ? 'command' : actionType === 'webhook' ? 'url' : 'webhookUrl';

    createHook.mutate(
      {
        name,
        trigger,
        action: { type: actionType, config: { [configKey]: actionConfig } },
        enabled: true,
        projectId,
      },
      { onSuccess: () => onClose() },
    );
  }

  const configLabel = actionType === 'shell' ? 'Shell Command' : actionType === 'webhook' ? 'Webhook URL' : 'Slack Webhook URL';
  const configPlaceholder = actionType === 'shell' ? 'echo "Hook fired"' : 'https://...';

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border-default p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium font-heading text-text-primary">Add Hook</span>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-text-muted">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My Hook"
          className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-faint"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] text-text-muted">Trigger</label>
          <select
            value={trigger}
            onChange={e => setTrigger(e.target.value as Hook['trigger'])}
            className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary"
          >
            {TRIGGER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-text-muted">Action Type</label>
          <select
            value={actionType}
            onChange={e => setActionType(e.target.value as Hook['action']['type'])}
            className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary"
          >
            {ACTION_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-text-muted">{configLabel}</label>
        <input
          type="text"
          value={actionConfig}
          onChange={e => setActionConfig(e.target.value)}
          placeholder={configPlaceholder}
          className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-faint"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-text-muted">Project Scope</label>
        <select
          value={projectId ?? ''}
          onChange={e => setProjectId(e.target.value || null)}
          className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary"
        >
          <option value="">Global (all projects)</option>
          {projects?.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

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
          disabled={createHook.isPending || !name.trim()}
          className="px-3 py-1.5 text-[11px] rounded bg-accent-primary text-white hover:bg-accent-primary/90 disabled:opacity-50"
        >
          {createHook.isPending ? 'Adding...' : 'Add Hook'}
        </button>
      </div>

      {createHook.isError && (
        <div className="text-[11px] text-status-error flex items-center gap-1">
          <AlertCircle size={12} />
          {(createHook.error as Error).message}
        </div>
      )}
    </form>
  );
}

function HookCard({ hook }: { hook: Hook }) {
  const updateHook = useUpdateHook();
  const deleteHook = useDeleteHook();
  const { data: projects } = useProjects();

  const triggerLabel = TRIGGER_OPTIONS.find(t => t.value === hook.trigger)?.label ?? hook.trigger;
  const actionLabel = ACTION_TYPE_OPTIONS.find(a => a.value === hook.action.type)?.label ?? hook.action.type;
  const projectName = hook.projectId
    ? projects?.find(p => p.id === hook.projectId)?.name ?? 'Unknown'
    : 'Global';

  function handleToggle() {
    updateHook.mutate({ id: hook.id, enabled: !hook.enabled });
  }

  function handleDelete() {
    deleteHook.mutate(hook.id);
  }

  return (
    <div className="rounded-lg border border-border-default px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-accent-primary/10 flex items-center justify-center shrink-0">
        <Webhook size={16} className="text-accent-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium font-heading text-text-primary">{hook.name}</span>
          {hook.enabled ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-status-success/15 text-status-success border-status-success/30 flex items-center gap-1">
              <CheckCircle2 size={10} /> Enabled
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-bg-hover text-text-muted border-border-muted flex items-center gap-1">
              <XCircle size={10} /> Disabled
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-text-muted">{triggerLabel}</span>
          <span className="text-[11px] text-text-faint">{actionLabel}</span>
          <span className="text-[11px] text-text-faint">{projectName}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleToggle}
          disabled={updateHook.isPending}
          className={`relative w-8 h-[18px] rounded-full transition ${
            hook.enabled ? 'bg-accent-primary' : 'bg-bg-hover border border-border-default'
          }`}
          title={hook.enabled ? 'Disable' : 'Enable'}
        >
          <span
            className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${
              hook.enabled ? 'translate-x-[16px]' : 'translate-x-[2px]'
            }`}
          />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteHook.isPending}
          className="text-text-faint hover:text-status-error transition disabled:opacity-50"
          title="Delete hook"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function HooksTab() {
  const { data: hooksList, isLoading, error } = useHooks();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Loader2 size={14} className="animate-spin" />
        Loading hooks…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-status-error">
        <AlertCircle size={14} />
        Failed to load hooks: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded border border-dashed border-border-default text-text-muted hover:text-accent-primary hover:border-accent-primary transition"
        >
          <Plus size={12} />
          Add Hook
        </button>
      )}

      {showForm && <AddHookForm onClose={() => setShowForm(false)} />}

      {hooksList && hooksList.length > 0 ? (
        hooksList.map(hook => <HookCard key={hook.id} hook={hook} />)
      ) : (
        <div className="text-xs text-text-muted">
          No hooks configured. Add a hook to automate pipeline events.
        </div>
      )}
    </div>
  );
}

function AddCredentialForm({ onClose }: { onClose: () => void }) {
  const { data: projects } = useProjects();
  const createCredential = useCreateCredential();
  const [name, setName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [scopes, setScopes] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !providerName.trim() || !clientId || !clientSecret) return;

    createCredential.mutate(
      {
        name,
        providerName,
        clientId,
        clientSecret,
        redirectUri,
        scopes: scopes.split(',').map(s => s.trim()).filter(Boolean),
        projectId,
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border-default p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium font-heading text-text-primary">Add Credential</span>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] text-text-muted">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My OAuth App"
            className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-faint"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-text-muted">Provider Name</label>
          <input
            type="text"
            value={providerName}
            onChange={e => setProviderName(e.target.value)}
            placeholder="github, google, etc."
            className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-faint"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] text-text-muted">Client ID</label>
          <input
            type="password"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            placeholder="Client ID"
            className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-faint"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-text-muted">Client Secret</label>
          <input
            type="password"
            value={clientSecret}
            onChange={e => setClientSecret(e.target.value)}
            placeholder="Client Secret"
            className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-faint"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-text-muted">Redirect URI</label>
        <input
          type="text"
          value={redirectUri}
          onChange={e => setRedirectUri(e.target.value)}
          placeholder="https://example.com/callback"
          className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-faint"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-text-muted">Scopes (comma-separated)</label>
        <input
          type="text"
          value={scopes}
          onChange={e => setScopes(e.target.value)}
          placeholder="read, write, admin"
          className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder:text-text-faint"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-text-muted">Project Scope</label>
        <select
          value={projectId ?? ''}
          onChange={e => setProjectId(e.target.value || null)}
          className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary"
        >
          <option value="">Global (all projects)</option>
          {projects?.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

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
          disabled={createCredential.isPending || !name.trim() || !providerName.trim() || !clientId || !clientSecret}
          className="px-3 py-1.5 text-[11px] rounded bg-accent-primary text-white hover:bg-accent-primary/90 disabled:opacity-50"
        >
          {createCredential.isPending ? 'Adding...' : 'Add Credential'}
        </button>
      </div>

      {createCredential.isError && (
        <div className="text-[11px] text-status-error flex items-center gap-1">
          <AlertCircle size={12} />
          {(createCredential.error as Error).message}
        </div>
      )}
    </form>
  );
}

function CredentialCard({ credential }: { credential: Credential }) {
  const deleteCredential = useDeleteCredential();
  const { data: projects } = useProjects();

  const projectName = credential.projectId
    ? projects?.find(p => p.id === credential.projectId)?.name ?? 'Unknown'
    : 'Global';

  function handleDelete() {
    deleteCredential.mutate(credential.id);
  }

  return (
    <div className="rounded-lg border border-border-default px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-accent-primary/10 flex items-center justify-center shrink-0">
        <KeyRound size={16} className="text-accent-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium font-heading text-text-primary">{credential.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-accent-primary/10 text-accent-primary border-accent-primary/30 capitalize">
            {credential.providerName}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-text-muted">{projectName}</span>
          {credential.scopes && credential.scopes.length > 0 && (
            <span className="text-[11px] text-text-faint">
              {credential.scopes.join(', ')}
            </span>
          )}
          <span className="text-[10px] text-text-faint flex items-center gap-1">
            <Shield size={10} /> ****
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleDelete}
          disabled={deleteCredential.isPending}
          className="text-text-faint hover:text-status-error transition disabled:opacity-50"
          title="Delete credential"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function CredentialsTab() {
  const { data: credentialsList, isLoading, error } = useCredentials();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Loader2 size={14} className="animate-spin" />
        Loading credentials…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-status-error">
        <AlertCircle size={14} />
        Failed to load credentials: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded border border-dashed border-border-default text-text-muted hover:text-accent-primary hover:border-accent-primary transition"
        >
          <Plus size={12} />
          Add Credential
        </button>
      )}

      {showForm && <AddCredentialForm onClose={() => setShowForm(false)} />}

      {credentialsList && credentialsList.length > 0 ? (
        credentialsList.map(cred => <CredentialCard key={cred.id} credential={cred} />)
      ) : (
        <div className="text-xs text-text-muted">
          No credentials configured. Add a credential to store OAuth secrets securely.
        </div>
      )}
    </div>
  );
}

function ThemesTab() {
  const { themeId, setThemeId, themes } = useTheme();
  const pinnedThemes = useLayoutStore((s) => s.pinnedThemes);
  const pinTheme = useLayoutStore((s) => s.pinTheme);
  const unpinTheme = useLayoutStore((s) => s.unpinTheme);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-bold font-heading text-text-primary">Themes</h3>
        <p className="text-[11px] text-text-muted mt-0.5">
          Choose your theme and pin up to 4 favorites to the toolbar for quick switching.
        </p>
      </div>

      <div className="space-y-1">
        {themes.map(theme => {
          const isActive = theme.id === themeId;
          const isPinned = pinnedThemes.includes(theme.id);
          const canPin = pinnedThemes.length < 4;
          const colors = getThemeById(theme.id);
          const mapped = colors ? mapVSCodeColors(colors.colors) : null;

          return (
            <div
              key={theme.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                isActive ? 'bg-accent-primary/10 border border-accent-primary/30' : 'border border-transparent hover:bg-bg-hover'
              }`}
            >
              {/* Color swatches */}
              {mapped && (
                <div className="flex gap-1 shrink-0">
                  {(['bg-base', 'bg-default', 'accent-primary', 'text-default'] as const).map(key => (
                    <div
                      key={key}
                      className="w-4 h-4 rounded-full border border-border-subtle"
                      style={{ backgroundColor: mapped[key] }}
                    />
                  ))}
                </div>
              )}

              {/* Theme name + type */}
              <button
                onClick={() => setThemeId(theme.id)}
                className="flex-1 text-left"
              >
                <span className="text-sm font-medium text-text-primary">{theme.name}</span>
                <span className="text-[10px] text-text-muted ml-2">{theme.type}</span>
              </button>

              {/* Active indicator */}
              {isActive && <Check size={14} className="text-accent-primary shrink-0" />}

              {/* Pin/Unpin button */}
              <button
                onClick={() => isPinned ? unpinTheme(theme.id) : pinTheme(theme.id)}
                disabled={!isPinned && !canPin}
                title={isPinned ? 'Unpin from toolbar' : canPin ? 'Pin to toolbar' : 'Max 4 pinned themes'}
                className={`p-1.5 rounded transition shrink-0 ${
                  isPinned
                    ? 'text-accent-primary hover:bg-accent-primary/10'
                    : canPin
                      ? 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                      : 'text-text-faint cursor-not-allowed opacity-40'
                }`}
              >
                {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
            </div>
          );
        })}
      </div>

      {pinnedThemes.length > 0 && (
        <div className="pt-2 border-t border-border-default">
          <p className="text-[11px] text-text-muted">
            {pinnedThemes.length}/4 themes pinned to toolbar
          </p>
        </div>
      )}
    </div>
  );
}

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'providers', label: 'Providers' },
  { id: 'themes', label: 'Themes' },
  { id: 'hooks', label: 'Hooks' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'notifications', label: 'Notifications' },
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
      {activeTab === 'themes' && <ThemesTab />}
      {activeTab === 'hooks' && <HooksTab />}
      {activeTab === 'credentials' && <CredentialsTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
    </div>
  );
}
