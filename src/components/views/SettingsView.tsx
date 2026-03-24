import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Cpu,
  Keyboard,
  KeyRound,
  Loader2,
  Pin,
  PinOff,
  Plus,
  Send,
  Settings2,
  Shield,
  Trash2,
  Upload,
  Webhook,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  type Credential,
  useCreateCredential,
  useCredentials,
  useDeleteCredential,
} from '../../api/credentials';
import {
  type Hook,
  useCreateHook,
  useDeleteHook,
  useHooks,
  useUpdateHook,
} from '../../api/hooks';
import { useProjects } from '../../api/projects';
import {
  type Provider,
  type ProviderName,
  useAddProvider,
  useProviderModels,
  useProviders,
} from '../../api/providers';
import {
  useSaveSetting,
  useSetting,
  useTestSlackWebhook,
} from '../../api/settings';
import { useTheme } from '../../hooks/useTheme';
import { useLayoutStore } from '../../stores/layout';
import { getThemeById, mapVSCodeColors } from '../../themes';

type SettingsTab =
  | 'providers'
  | 'notifications'
  | 'hooks'
  | 'credentials'
  | 'themes'
  | 'import'
  | 'shell';

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

  const displayName =
    PROVIDER_OPTIONS.find((o) => o.value === name)?.label ?? name;

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
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium font-heading text-text-primary">
              Add Provider
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {/* Provider type */}
          <div className="space-y-1">
            <Label className="text-[11px] text-text-muted">Provider</Label>
            <Select
              value={name}
              onValueChange={(val) => {
                const providerName = val as ProviderName;
                setName(providerName);
                if (providerName === 'ollama') {
                  setApiKey('');
                  setBaseUrl('http://localhost:11434');
                } else {
                  setBaseUrl('');
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          {showApiKey && (
            <div className="space-y-1">
              <Label className="text-[11px] text-text-muted">API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Base URL */}
          {showBaseUrl && (
            <div className="space-y-1">
              <Label className="text-[11px] text-text-muted">Base URL</Label>
              <Input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={
                  isOllama
                    ? 'http://localhost:11434'
                    : 'https://api.example.com'
                }
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="xs" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="xs" disabled={addProvider.isPending}>
              {addProvider.isPending ? 'Adding...' : 'Add Provider'}
            </Button>
          </div>

          {addProvider.isError && (
            <div className="text-[11px] text-status-error flex items-center gap-1">
              <AlertCircle size={12} />
              {(addProvider.error as Error).message}
            </div>
          )}
        </CardContent>
      </form>
    </Card>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  const { data: models } = useProviderModels(provider.id);
  const modelCount = models?.length ?? 0;

  return (
    <Card className="shadow-none">
      <CardContent className="px-4 py-3 p-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-accent-primary/10 flex items-center justify-center shrink-0">
          <Cpu size={16} className="text-accent-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium font-heading text-text-primary">
              {provider.displayName}
            </span>
            {provider.isActive ? (
              <Badge
                variant="success"
                className="text-[10px] px-1.5 py-0 gap-1"
              >
                <CheckCircle2 size={10} /> Active
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 gap-1"
              >
                <XCircle size={10} /> Inactive
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-text-muted capitalize">
              {provider.name}
            </span>
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
      </CardContent>
    </Card>
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
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowForm(true)}
          className="border-dashed text-text-muted hover:text-accent-primary hover:border-accent-primary"
        >
          <Plus size={12} />
          Add Provider
        </Button>
      )}

      {/* Add Provider form */}
      {showForm && <AddProviderForm onClose={() => setShowForm(false)} />}

      {/* Provider list */}
      {providers && providers.length > 0 ? (
        providers.map((provider) => (
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
      {
        key: 'slack_webhook_url',
        value: webhookUrl,
        category: 'notifications',
      },
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
      <Card>
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-accent-primary" />
            <span className="text-xs font-medium font-heading text-text-primary">
              Slack Notifications
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <p className="text-[11px] text-text-muted">
            Enter a Slack incoming webhook URL to receive pipeline
            notifications, decision alerts, and error reports.
          </p>

          <div className="space-y-1">
            <Label className="text-[11px] text-text-muted">Webhook URL</Label>
            <Input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="xs"
              onClick={handleSave}
              disabled={saveSetting.isPending}
            >
              {saveSetting.isPending ? 'Saving...' : saved ? 'Saved!' : 'Save'}
            </Button>

            <Button
              variant="outline"
              size="xs"
              onClick={handleTest}
              disabled={!webhookUrl || testWebhook.isPending}
            >
              <Send size={10} />
              {testWebhook.isPending ? 'Sending...' : 'Test'}
            </Button>

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
        </CardContent>
      </Card>
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

const ACTION_TYPE_OPTIONS: { value: Hook['action']['type']; label: string }[] =
  [
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

    const configKey =
      actionType === 'shell'
        ? 'command'
        : actionType === 'webhook'
          ? 'url'
          : 'webhookUrl';

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

  const configLabel =
    actionType === 'shell'
      ? 'Shell Command'
      : actionType === 'webhook'
        ? 'Webhook URL'
        : 'Slack Webhook URL';
  const configPlaceholder =
    actionType === 'shell' ? 'echo "Hook fired"' : 'https://...';

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium font-heading text-text-primary">
              Add Hook
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-text-muted">Name</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Hook"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-text-muted">Trigger</Label>
              <Select
                value={trigger}
                onValueChange={(val) => setTrigger(val as Hook['trigger'])}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-text-muted">Action Type</Label>
              <Select
                value={actionType}
                onValueChange={(val) =>
                  setActionType(val as Hook['action']['type'])
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPE_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-text-muted">{configLabel}</Label>
            <Input
              type="text"
              value={actionConfig}
              onChange={(e) => setActionConfig(e.target.value)}
              placeholder={configPlaceholder}
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-text-muted">Project Scope</Label>
            <Select
              value={projectId ?? '__global__'}
              onValueChange={(val) =>
                setProjectId(val === '__global__' ? null : val)
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__" className="text-xs">
                  Global (all projects)
                </SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="xs"
              disabled={createHook.isPending || !name.trim()}
            >
              {createHook.isPending ? 'Adding...' : 'Add Hook'}
            </Button>
          </div>

          {createHook.isError && (
            <div className="text-[11px] text-status-error flex items-center gap-1">
              <AlertCircle size={12} />
              {(createHook.error as Error).message}
            </div>
          )}
        </CardContent>
      </form>
    </Card>
  );
}

function HookCard({ hook }: { hook: Hook }) {
  const updateHook = useUpdateHook();
  const deleteHook = useDeleteHook();
  const { data: projects } = useProjects();

  const triggerLabel =
    TRIGGER_OPTIONS.find((t) => t.value === hook.trigger)?.label ??
    hook.trigger;
  const actionLabel =
    ACTION_TYPE_OPTIONS.find((a) => a.value === hook.action.type)?.label ??
    hook.action.type;
  const projectName = hook.projectId
    ? (projects?.find((p) => p.id === hook.projectId)?.name ?? 'Unknown')
    : 'Global';

  function handleToggle() {
    updateHook.mutate({ id: hook.id, enabled: !hook.enabled });
  }

  function handleDelete() {
    deleteHook.mutate(hook.id);
  }

  return (
    <Card className="shadow-none">
      <CardContent className="px-4 py-3 p-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-accent-primary/10 flex items-center justify-center shrink-0">
          <Webhook size={16} className="text-accent-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium font-heading text-text-primary">
              {hook.name}
            </span>
            {hook.enabled ? (
              <Badge
                variant="success"
                className="text-[10px] px-1.5 py-0 gap-1"
              >
                <CheckCircle2 size={10} /> Enabled
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 gap-1"
              >
                <XCircle size={10} /> Disabled
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-text-muted">{triggerLabel}</span>
            <span className="text-[11px] text-text-faint">{actionLabel}</span>
            <span className="text-[11px] text-text-faint">{projectName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={hook.enabled}
            onCheckedChange={() => handleToggle()}
            disabled={updateHook.isPending}
            className="h-[18px] w-8 data-[state=checked]:bg-accent-primary data-[state=unchecked]:bg-bg-hover [&>span]:h-[14px] [&>span]:w-[14px] [&>span]:data-[state=checked]:translate-x-[14px]"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                disabled={deleteHook.isPending}
                className="text-text-faint hover:text-status-error"
              >
                <Trash2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete hook</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
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
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowForm(true)}
          className="border-dashed text-text-muted hover:text-accent-primary hover:border-accent-primary"
        >
          <Plus size={12} />
          Add Hook
        </Button>
      )}

      {showForm && <AddHookForm onClose={() => setShowForm(false)} />}

      {hooksList && hooksList.length > 0 ? (
        hooksList.map((hook) => <HookCard key={hook.id} hook={hook} />)
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
    if (!name.trim() || !providerName.trim() || !clientId || !clientSecret)
      return;

    createCredential.mutate(
      {
        name,
        providerName,
        clientId,
        clientSecret,
        redirectUri,
        scopes: scopes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        projectId,
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium font-heading text-text-primary">
              Add Credential
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-text-muted">Name</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My OAuth App"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-text-muted">
                Provider Name
              </Label>
              <Input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="github, google, etc."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-text-muted">Client ID</Label>
              <Input
                type="password"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Client ID"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-text-muted">
                Client Secret
              </Label>
              <Input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Client Secret"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-text-muted">Redirect URI</Label>
            <Input
              type="text"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder="https://example.com/callback"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-text-muted">
              Scopes (comma-separated)
            </Label>
            <Input
              type="text"
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
              placeholder="read, write, admin"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-text-muted">Project Scope</Label>
            <Select
              value={projectId ?? '__global__'}
              onValueChange={(val) =>
                setProjectId(val === '__global__' ? null : val)
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__" className="text-xs">
                  Global (all projects)
                </SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="xs"
              disabled={
                createCredential.isPending ||
                !name.trim() ||
                !providerName.trim() ||
                !clientId ||
                !clientSecret
              }
            >
              {createCredential.isPending ? 'Adding...' : 'Add Credential'}
            </Button>
          </div>

          {createCredential.isError && (
            <div className="text-[11px] text-status-error flex items-center gap-1">
              <AlertCircle size={12} />
              {(createCredential.error as Error).message}
            </div>
          )}
        </CardContent>
      </form>
    </Card>
  );
}

function CredentialCard({ credential }: { credential: Credential }) {
  const deleteCredential = useDeleteCredential();
  const { data: projects } = useProjects();

  const projectName = credential.projectId
    ? (projects?.find((p) => p.id === credential.projectId)?.name ?? 'Unknown')
    : 'Global';

  function handleDelete() {
    deleteCredential.mutate(credential.id);
  }

  return (
    <Card className="shadow-none">
      <CardContent className="px-4 py-3 p-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-accent-primary/10 flex items-center justify-center shrink-0">
          <KeyRound size={16} className="text-accent-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium font-heading text-text-primary">
              {credential.name}
            </span>
            <Badge
              variant="info"
              className="text-[10px] px-1.5 py-0 capitalize"
            >
              {credential.providerName}
            </Badge>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="xs"
                onClick={handleDelete}
                disabled={deleteCredential.isPending}
              >
                <Trash2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete credential</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
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
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowForm(true)}
          className="border-dashed text-text-muted hover:text-accent-primary hover:border-accent-primary"
        >
          <Plus size={12} />
          Add Credential
        </Button>
      )}

      {showForm && <AddCredentialForm onClose={() => setShowForm(false)} />}

      {credentialsList && credentialsList.length > 0 ? (
        credentialsList.map((cred) => (
          <CredentialCard key={cred.id} credential={cred} />
        ))
      ) : (
        <div className="text-xs text-text-muted">
          No credentials configured. Add a credential to store OAuth secrets
          securely.
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
        <h3 className="text-xs font-bold font-heading text-text-primary">
          Themes
        </h3>
        <p className="text-[11px] text-text-muted mt-0.5">
          Choose your theme and pin up to 4 favorites to the toolbar for quick
          switching.
        </p>
      </div>

      <div className="space-y-1">
        {themes.map((theme) => {
          const isActive = theme.id === themeId;
          const isPinned = pinnedThemes.includes(theme.id);
          const canPin = pinnedThemes.length < 4;
          const colors = getThemeById(theme.id);
          const mapped = colors ? mapVSCodeColors(colors.colors) : null;

          return (
            <div
              key={theme.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                isActive
                  ? 'bg-accent-primary/10 border border-accent-primary/30'
                  : 'border border-transparent hover:bg-bg-hover'
              }`}
            >
              {/* Color swatches */}
              {mapped && (
                <div className="flex gap-1 shrink-0">
                  {(
                    [
                      'bg-base',
                      'bg-default',
                      'accent-primary',
                      'text-default',
                    ] as const
                  ).map((key) => (
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
                <span className="text-sm font-medium text-text-primary">
                  {theme.name}
                </span>
                <span className="text-[10px] text-text-muted ml-2">
                  {theme.type}
                </span>
              </button>

              {/* Active indicator */}
              {isActive && (
                <Check size={14} className="text-accent-primary shrink-0" />
              )}

              {/* Pin/Unpin button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      isPinned ? unpinTheme(theme.id) : pinTheme(theme.id)
                    }
                    disabled={!isPinned && !canPin}
                    className={cn(
                      isPinned
                        ? 'text-accent-primary hover:bg-accent-primary/10'
                        : canPin
                          ? 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                          : 'text-text-faint cursor-not-allowed opacity-40',
                    )}
                  >
                    {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isPinned
                    ? 'Unpin from toolbar'
                    : canPin
                      ? 'Pin to toolbar'
                      : 'Max 4 pinned themes'}
                </TooltipContent>
              </Tooltip>
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

// --- VS Code Import ---

interface VSCodeKeybinding {
  key: string;
  command: string;
  when?: string;
}

interface ParsedEditorSettings {
  fontSize?: number;
  fontFamily?: string;
  tabSize?: number;
  insertSpaces?: boolean;
}

// Mapping from VS Code commands to Insomniac equivalents
const KEYBINDING_MAP: Record<string, string> = {
  'workbench.action.files.save': 'Save file',
  'workbench.action.files.saveAll': 'Save all files',
  'editor.action.formatDocument': 'Format document',
  'workbench.action.quickOpen': 'Quick open',
  'workbench.action.showCommands': 'Command palette',
  'workbench.action.toggleSidebarVisibility': 'Toggle sidebar',
  'workbench.action.togglePanel': 'Toggle panel',
  'editor.action.commentLine': 'Toggle line comment',
  'editor.action.blockComment': 'Toggle block comment',
  'workbench.action.terminal.toggleTerminal': 'Toggle terminal',
  'editor.action.clipboardCutAction': 'Cut',
  'editor.action.clipboardCopyAction': 'Copy',
  'editor.action.clipboardPasteAction': 'Paste',
  'editor.action.selectAll': 'Select all',
  'workbench.action.findInFiles': 'Search in files',
  'editor.action.startFindReplaceAction': 'Find and replace',
  'workbench.action.closeActiveEditor': 'Close tab',
  'workbench.action.splitEditor': 'Split editor',
  'editor.action.revealDefinition': 'Go to definition',
};

function extractEditorSettings(
  json: Record<string, unknown>,
): ParsedEditorSettings {
  const settings: ParsedEditorSettings = {};
  if (typeof json['editor.fontSize'] === 'number')
    settings.fontSize = json['editor.fontSize'];
  if (typeof json['editor.fontFamily'] === 'string')
    settings.fontFamily = json['editor.fontFamily'];
  if (typeof json['editor.tabSize'] === 'number')
    settings.tabSize = json['editor.tabSize'];
  if (typeof json['editor.insertSpaces'] === 'boolean')
    settings.insertSpaces = json['editor.insertSpaces'];
  return settings;
}

function ImportTab() {
  const saveSetting = useSaveSetting();

  const [keybindings, setKeybindings] = useState<VSCodeKeybinding[] | null>(
    null,
  );
  const [editorSettings, setEditorSettings] =
    useState<ParsedEditorSettings | null>(null);
  const [keybindingsError, setKeybindingsError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const keybindingsRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLInputElement>(null);

  function handleKeybindingsUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setKeybindingsError(null);
    setKeybindings(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        // VS Code keybindings.json may have comments — strip them
        const cleaned = text
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '');
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) {
          setKeybindingsError('Expected an array of keybindings');
          return;
        }
        setKeybindings(parsed as VSCodeKeybinding[]);
      } catch {
        setKeybindingsError(
          'Invalid JSON file. Please upload a valid keybindings.json.',
        );
      }
    };
    reader.readAsText(file);
  }

  function handleSettingsUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setSettingsError(null);
    setEditorSettings(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const cleaned = text
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '');
        const parsed = JSON.parse(cleaned);
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          setSettingsError('Expected a JSON object');
          return;
        }
        const extracted = extractEditorSettings(
          parsed as Record<string, unknown>,
        );
        if (Object.keys(extracted).length === 0) {
          setSettingsError(
            'No recognized editor settings found (fontSize, fontFamily, tabSize, insertSpaces).',
          );
          return;
        }
        setEditorSettings(extracted);
      } catch {
        setSettingsError(
          'Invalid JSON file. Please upload a valid settings.json.',
        );
      }
    };
    reader.readAsText(file);
  }

  function applyEditorSettings() {
    if (!editorSettings) return;
    const entries = Object.entries(editorSettings) as [
      string,
      string | number | boolean,
    ][];
    let completed = 0;
    for (const [key, value] of entries) {
      saveSetting.mutate(
        { key: `editor_${key}`, value, category: 'editor' },
        {
          onSuccess: () => {
            completed++;
            if (completed === entries.length) {
              setApplied(true);
              setTimeout(() => setApplied(false), 3000);
            }
          },
        },
      );
    }
  }

  const mappedBindings = keybindings?.filter(
    (kb) => KEYBINDING_MAP[kb.command],
  );
  const unmappedBindings = keybindings?.filter(
    (kb) => !KEYBINDING_MAP[kb.command],
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold font-heading text-text-primary">
          Import from VS Code
        </h3>
        <p className="text-[11px] text-text-muted mt-0.5">
          Import your keyboard shortcuts and editor settings from VS Code. Only
          recognized settings will be applied — your Insomniac defaults are
          preserved for everything else.
        </p>
      </div>

      {/* Keybindings Import */}
      <Card>
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <Keyboard size={14} className="text-accent-primary" />
            <span className="text-xs font-medium font-heading text-text-primary">
              Keyboard Shortcuts
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <p className="text-[11px] text-text-muted">
            Upload your VS Code{' '}
            <code className="px-1 py-0.5 rounded bg-bg-surface text-text-primary">
              keybindings.json
            </code>{' '}
            to see which shortcuts can be mapped.
          </p>
          <input
            ref={keybindingsRef}
            type="file"
            accept=".json"
            onChange={handleKeybindingsUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="xs"
            onClick={() => keybindingsRef.current?.click()}
            className="border-dashed text-text-muted hover:text-accent-primary hover:border-accent-primary"
          >
            <Upload size={12} />
            Upload keybindings.json
          </Button>

          {keybindingsError && (
            <div className="text-[11px] text-status-error flex items-center gap-1">
              <AlertCircle size={12} />
              {keybindingsError}
            </div>
          )}

          {/* Mapped shortcuts table */}
          {mappedBindings && mappedBindings.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-text-primary">
                Mapped Shortcuts ({mappedBindings.length})
              </span>
              <div className="border border-border-default rounded overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-bg-surface border-b border-border-default">
                      <th className="text-left px-3 py-1.5 text-text-muted font-medium">
                        VS Code Shortcut
                      </th>
                      <th className="text-left px-3 py-1.5 text-text-muted font-medium">
                        VS Code Command
                      </th>
                      <th className="text-left px-3 py-1.5 text-text-muted font-medium">
                        Insomniac Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedBindings.map((kb, i) => (
                      <tr
                        key={i}
                        className="border-b border-border-default last:border-0"
                      >
                        <td className="px-3 py-1.5 text-text-primary font-mono">
                          {kb.key}
                        </td>
                        <td className="px-3 py-1.5 text-text-muted">
                          {kb.command}
                        </td>
                        <td className="px-3 py-1.5 text-status-success">
                          {KEYBINDING_MAP[kb.command]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unmapped shortcuts */}
          {unmappedBindings && unmappedBindings.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-text-muted">
                Unmapped Shortcuts ({unmappedBindings.length})
              </span>
              <p className="text-[10px] text-text-faint">
                These VS Code shortcuts have no Insomniac equivalent yet.
              </p>
              <div className="border border-border-default rounded overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-bg-surface border-b border-border-default sticky top-0">
                      <th className="text-left px-3 py-1.5 text-text-muted font-medium">
                        Shortcut
                      </th>
                      <th className="text-left px-3 py-1.5 text-text-muted font-medium">
                        Command
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmappedBindings.map((kb, i) => (
                      <tr
                        key={i}
                        className="border-b border-border-default last:border-0"
                      >
                        <td className="px-3 py-1.5 text-text-faint font-mono">
                          {kb.key}
                        </td>
                        <td className="px-3 py-1.5 text-text-faint">
                          {kb.command}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {keybindings && keybindings.length === 0 && (
            <div className="text-[11px] text-text-muted">
              No keybindings found in the uploaded file.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Import */}
      <Card>
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <Settings2 size={14} className="text-accent-primary" />
            <span className="text-xs font-medium font-heading text-text-primary">
              Editor Settings
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <p className="text-[11px] text-text-muted">
            Upload your VS Code{' '}
            <code className="px-1 py-0.5 rounded bg-bg-surface text-text-primary">
              settings.json
            </code>{' '}
            to import editor preferences.
          </p>
          <input
            ref={settingsRef}
            type="file"
            accept=".json"
            onChange={handleSettingsUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="xs"
            onClick={() => settingsRef.current?.click()}
            className="border-dashed text-text-muted hover:text-accent-primary hover:border-accent-primary"
          >
            <Upload size={12} />
            Upload settings.json
          </Button>

          {settingsError && (
            <div className="text-[11px] text-status-error flex items-center gap-1">
              <AlertCircle size={12} />
              {settingsError}
            </div>
          )}

          {editorSettings && (
            <div className="space-y-3">
              <span className="text-[11px] font-medium text-text-primary">
                Detected Settings
              </span>
              <div className="border border-border-default rounded overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-bg-surface border-b border-border-default">
                      <th className="text-left px-3 py-1.5 text-text-muted font-medium">
                        Setting
                      </th>
                      <th className="text-left px-3 py-1.5 text-text-muted font-medium">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {editorSettings.fontSize !== undefined && (
                      <tr className="border-b border-border-default">
                        <td className="px-3 py-1.5 text-text-primary">
                          Font Size
                        </td>
                        <td className="px-3 py-1.5 text-text-muted font-mono">
                          {editorSettings.fontSize}px
                        </td>
                      </tr>
                    )}
                    {editorSettings.fontFamily !== undefined && (
                      <tr className="border-b border-border-default">
                        <td className="px-3 py-1.5 text-text-primary">
                          Font Family
                        </td>
                        <td className="px-3 py-1.5 text-text-muted font-mono">
                          {editorSettings.fontFamily}
                        </td>
                      </tr>
                    )}
                    {editorSettings.tabSize !== undefined && (
                      <tr className="border-b border-border-default">
                        <td className="px-3 py-1.5 text-text-primary">
                          Tab Size
                        </td>
                        <td className="px-3 py-1.5 text-text-muted font-mono">
                          {editorSettings.tabSize}
                        </td>
                      </tr>
                    )}
                    {editorSettings.insertSpaces !== undefined && (
                      <tr className="border-b border-border-default last:border-0">
                        <td className="px-3 py-1.5 text-text-primary">
                          Insert Spaces
                        </td>
                        <td className="px-3 py-1.5 text-text-muted font-mono">
                          {editorSettings.insertSpaces ? 'Yes' : 'No'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  onClick={applyEditorSettings}
                  disabled={saveSetting.isPending}
                >
                  {saveSetting.isPending ? 'Applying...' : 'Apply Settings'}
                </Button>
                {applied && (
                  <span className="text-[11px] text-status-success flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Settings applied!
                  </span>
                )}
              </div>

              <p className="text-[10px] text-text-faint">
                Only the settings shown above will be imported. All other
                Insomniac defaults remain unchanged.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shell & Files Settings Tab
// ---------------------------------------------------------------------------

function ShellSettingsTab() {
  const { data: bashSetting } = useSetting('shell.bash.enabled');
  const { data: psSetting } = useSetting('shell.powershell.enabled');
  const { data: cloneDirSetting } = useSetting('projects.cloneDir');
  const saveSetting = useSaveSetting();
  const [cloneDir, setCloneDir] = useState('');

  const bashEnabled =
    bashSetting?.value !== false && bashSetting?.value !== 'false';
  const psEnabled = psSetting?.value !== false && psSetting?.value !== 'false';

  useEffect(() => {
    if (cloneDirSetting?.value && typeof cloneDirSetting.value === 'string') {
      setCloneDir(cloneDirSetting.value);
    }
  }, [cloneDirSetting]);

  return (
    <div className="space-y-4 mt-4">
      <Card className="bg-bg-surface border-border-default">
        <CardHeader className="pb-2">
          <h3 className="text-xs font-semibold text-text-primary flex items-center gap-2">
            <Shield size={13} />
            Shell Access
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-[11px] text-text-default">
                Enable Bash
              </Label>
              <p className="text-[10px] text-text-faint">
                Allow agents and the shell panel to execute bash commands
              </p>
            </div>
            <Switch
              checked={bashEnabled}
              onCheckedChange={(checked) =>
                saveSetting.mutate({
                  key: 'shell.bash.enabled',
                  value: checked,
                  category: 'shell',
                })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-[11px] text-text-default">
                Enable PowerShell
              </Label>
              <p className="text-[10px] text-text-faint">
                Allow PowerShell commands (WSL only, via Windows interop)
              </p>
            </div>
            <Switch
              checked={psEnabled}
              onCheckedChange={(checked) =>
                saveSetting.mutate({
                  key: 'shell.powershell.enabled',
                  value: checked,
                  category: 'shell',
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-bg-surface border-border-default">
        <CardHeader className="pb-2">
          <h3 className="text-xs font-semibold text-text-primary flex items-center gap-2">
            <Settings2 size={13} />
            Projects Directory
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-[11px] text-text-default">
              Clone Directory
            </Label>
            <p className="text-[10px] text-text-faint mb-2">
              Default directory where GitHub repos are cloned
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={cloneDir}
                onChange={(e) => setCloneDir(e.target.value)}
                placeholder="~/projects"
                className="h-7 text-[11px] flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() =>
                  saveSetting.mutate({
                    key: 'projects.cloneDir',
                    value: cloneDir,
                    category: 'projects',
                  })
                }
                disabled={!cloneDir || saveSetting.isPending}
              >
                {saveSetting.isPending ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'providers', label: 'Providers' },
  { id: 'themes', label: 'Themes' },
  { id: 'import', label: 'Import' },
  { id: 'hooks', label: 'Hooks' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'shell', label: 'Shell & Files' },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');

  return (
    <div className="p-5 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-bold font-heading text-text-primary">
          Settings
        </h2>
        <p className="text-[11px] text-text-muted mt-0.5">
          Manage AI providers and project preferences
        </p>
      </div>

      {/* Tab bar */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as SettingsTab)}
      >
        <TabsList className="h-auto p-0 bg-transparent border-b border-border-default rounded-none w-full justify-start gap-1">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="text-[11px] rounded-t rounded-b-none px-3 py-1.5 data-[state=active]:bg-accent-primary/15 data-[state=active]:text-accent-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-accent-primary text-text-muted hover:text-text-default hover:bg-bg-hover"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab content */}
        <TabsContent value="providers">
          <ProvidersTab />
        </TabsContent>
        <TabsContent value="themes">
          <ThemesTab />
        </TabsContent>
        <TabsContent value="import">
          <ImportTab />
        </TabsContent>
        <TabsContent value="hooks">
          <HooksTab />
        </TabsContent>
        <TabsContent value="credentials">
          <CredentialsTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="shell">
          <ShellSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
