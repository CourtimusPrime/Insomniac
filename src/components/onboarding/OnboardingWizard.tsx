import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Github,
  Loader2,
  SkipForward,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreateProject, useProjects } from '../../api/projects';
import {
  type ProviderName,
  useAddProvider,
  useProviders,
} from '../../api/providers';
import { useSaveSetting } from '../../api/settings';

const PROVIDER_OPTIONS: {
  value: ProviderName;
  label: string;
  description: string;
}[] = [
  { value: 'anthropic', label: 'Anthropic', description: 'Claude models' },
  { value: 'openai', label: 'OpenAI', description: 'GPT models' },
  { value: 'google', label: 'Google', description: 'Gemini models' },
  {
    value: 'openrouter',
    label: 'OpenRouter',
    description: 'Multi-provider gateway',
  },
  { value: 'ollama', label: 'Ollama', description: 'Local models' },
  { value: 'custom', label: 'Custom', description: 'Custom endpoint' },
];

type ProjectMethod = 'prompt' | 'template' | 'github';

/* ─── Step 1: Welcome ─── */
function WelcomeStep() {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div className="w-16 h-16 rounded-2xl bg-accent-primary/10 flex items-center justify-center">
        <Zap size={32} className="text-accent-primary" />
      </div>
      <div className="space-y-3 max-w-md">
        <h2 className="text-xl font-bold text-text-primary font-heading">
          Welcome to Insomniac
        </h2>
        <p className="text-sm text-text-muted leading-relaxed">
          Insomniac is an AI developer console. You direct. Agents build.
        </p>
        <p className="text-xs text-text-faint leading-relaxed">
          Let's get you set up in a few quick steps. You can always change these
          settings later.
        </p>
      </div>
    </div>
  );
}

/* ─── Step 2: Connect Provider ─── */
function ConnectProviderStep() {
  const { data: projects } = useProjects();
  const { data: existingProviders } = useProviders();
  const addProvider = useAddProvider();
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderName>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [added, setAdded] = useState(false);

  const isOllama = selectedProvider === 'ollama';
  const isCustom = selectedProvider === 'custom';
  const showApiKey = !isOllama;
  const showBaseUrl = isOllama || isCustom;
  const hasExistingProvider = (existingProviders?.length ?? 0) > 0;

  function handleAdd() {
    const workspaceId = projects?.[0]?.workspaceId;
    if (!workspaceId) return;
    const displayName =
      PROVIDER_OPTIONS.find((o) => o.value === selectedProvider)?.label ??
      selectedProvider;

    addProvider.mutate(
      {
        workspaceId,
        name: selectedProvider,
        displayName,
        ...(showApiKey && apiKey ? { apiKey } : {}),
        ...(showBaseUrl && baseUrl ? { baseUrl } : {}),
        isActive: true,
      },
      {
        onSuccess: () => {
          setAdded(true);
          setApiKey('');
          setBaseUrl('');
        },
      },
    );
  }

  function handleProviderChange(value: string) {
    const val = value as ProviderName;
    setSelectedProvider(val);
    if (val === 'ollama') {
      setApiKey('');
      setBaseUrl('http://localhost:11434');
    } else {
      setBaseUrl('');
    }
    setAdded(false);
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-text-primary font-heading">
          Connect a Provider
        </h2>
        <p className="text-xs text-text-muted">
          Add at least one AI provider to power your agents.
        </p>
      </div>

      {(added || hasExistingProvider) && (
        <div className="flex items-center gap-2 rounded-lg border border-status-success/30 bg-status-success/5 px-3 py-2">
          <CheckCircle2 size={14} className="text-status-success" />
          <span className="text-xs text-status-success">
            Provider connected! You can add more or continue.
          </span>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-border-default p-4">
        <div className="space-y-1">
          <Label className="text-[11px]">Provider</Label>
          <Select value={selectedProvider} onValueChange={handleProviderChange}>
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
                  {opt.label} — {opt.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showApiKey && (
          <div className="space-y-1">
            <Label className="text-[11px]">API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="h-8 text-xs"
            />
          </div>
        )}

        {showBaseUrl && (
          <div className="space-y-1">
            <Label className="text-[11px]">Base URL</Label>
            <Input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={
                isOllama ? 'http://localhost:11434' : 'https://api.example.com'
              }
              className="h-8 text-xs"
            />
          </div>
        )}

        <Button
          onClick={handleAdd}
          disabled={
            addProvider.isPending || (showApiKey && !apiKey && !isOllama)
          }
          className="w-full"
          size="sm"
        >
          {addProvider.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            'Add Provider'
          )}
        </Button>

        {addProvider.isError && (
          <div className="text-[11px] text-status-error flex items-center gap-1">
            <AlertCircle size={12} />
            {(addProvider.error as Error).message}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Step 3: Connect GitHub ─── */
function ConnectGitHubStep() {
  const [githubUrl, setGithubUrl] = useState('');

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-text-primary font-heading">
          Connect GitHub
        </h2>
        <p className="text-xs text-text-muted">
          Optional. Link a GitHub account to clone and manage repos.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border-default p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-bg-surface flex items-center justify-center">
            <Github size={20} className="text-text-muted" />
          </div>
          <div>
            <p className="text-xs font-medium text-text-primary">GitHub URL</p>
            <p className="text-[11px] text-text-faint">
              Your GitHub profile or organization URL
            </p>
          </div>
        </div>

        <Input
          type="url"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/username"
          className="h-8 text-xs"
        />

        <p className="text-[10px] text-text-faint">
          You can skip this step and connect GitHub later from Settings.
        </p>
      </div>
    </div>
  );
}

/* ─── Step 4: Create First Project ─── */
function CreateProjectStep() {
  const createProject = useCreateProject();
  const [method, setMethod] = useState<ProjectMethod>('prompt');
  const [projectName, setProjectName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [created, setCreated] = useState(false);

  function handleCreate() {
    if (!projectName.trim()) return;
    createProject.mutate(
      {
        name: projectName.trim(),
        ...(method === 'github' && repoUrl ? { repoUrl } : {}),
      },
      { onSuccess: () => setCreated(true) },
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-text-primary font-heading">
          Create Your First Project
        </h2>
        <p className="text-xs text-text-muted">
          Choose how you'd like to start.
        </p>
      </div>

      {created && (
        <div className="flex items-center gap-2 rounded-lg border border-status-success/30 bg-status-success/5 px-3 py-2">
          <CheckCircle2 size={14} className="text-status-success" />
          <span className="text-xs text-status-success">
            Project created! Continue to finish setup.
          </span>
        </div>
      )}

      <div className="flex gap-2">
        {[
          { key: 'prompt' as const, label: 'From Prompt', icon: Zap },
          { key: 'template' as const, label: 'Template', icon: FolderPlus },
          { key: 'github' as const, label: 'GitHub Repo', icon: Github },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant="outline"
            onClick={() => setMethod(key)}
            className={cn(
              'flex-1 flex flex-col items-center gap-1.5 h-auto p-3 text-xs',
              method === key
                ? 'border-accent-primary bg-accent-primary/5 text-accent-primary'
                : 'text-text-muted hover:border-border-hover hover:bg-bg-hover',
            )}
          >
            <Icon size={16} />
            {label}
          </Button>
        ))}
      </div>

      <div className="space-y-3 rounded-lg border border-border-default p-4">
        <div className="space-y-1">
          <Label className="text-[11px]">Project Name</Label>
          <Input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="my-awesome-project"
            className="h-8 text-xs"
          />
        </div>

        {method === 'github' && (
          <div className="space-y-1">
            <Label className="text-[11px]">Repository URL</Label>
            <Input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="h-8 text-xs"
            />
          </div>
        )}

        {method === 'template' && (
          <p className="text-[11px] text-text-faint">
            Templates will be available after setup. Enter a project name to
            create a blank project for now.
          </p>
        )}

        <Button
          onClick={handleCreate}
          disabled={createProject.isPending || !projectName.trim() || created}
          className="w-full"
          size="sm"
        >
          {createProject.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : created ? (
            'Project Created'
          ) : (
            'Create Project'
          )}
        </Button>

        {createProject.isError && (
          <div className="text-[11px] text-status-error flex items-center gap-1">
            <AlertCircle size={12} />
            {(createProject.error as Error).message}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Step 5: Done ─── */
function DoneStep() {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div className="w-16 h-16 rounded-2xl bg-status-success/10 flex items-center justify-center">
        <CheckCircle2 size={32} className="text-status-success" />
      </div>
      <div className="space-y-3 max-w-md">
        <h2 className="text-xl font-bold text-text-primary font-heading">
          You're All Set!
        </h2>
        <p className="text-sm text-text-muted leading-relaxed">
          Your workspace is ready. Start building by creating a pipeline and
          assigning agents.
        </p>
      </div>
    </div>
  );
}

/* ─── Wizard Container ─── */
const STEPS = [
  { label: 'Welcome', component: WelcomeStep },
  { label: 'Provider', component: ConnectProviderStep },
  { label: 'GitHub', component: ConnectGitHubStep },
  { label: 'Project', component: CreateProjectStep },
  { label: 'Done', component: DoneStep },
] as const;

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const saveSetting = useSaveSetting();
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const StepComponent = STEPS[step].component;

  function handleFinish() {
    saveSetting.mutate(
      { key: 'onboarding_completed', value: true, category: 'system' },
      { onSuccess: () => onComplete() },
    );
  }

  function handleSkip() {
    saveSetting.mutate(
      { key: 'onboarding_completed', value: true, category: 'system' },
      { onSuccess: () => onComplete() },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-default">
      <div className="w-full max-w-lg mx-4">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s.label}
              className={`h-1 rounded-full transition-all ${
                i === step
                  ? 'w-8 bg-accent-primary'
                  : i < step
                    ? 'w-4 bg-accent-primary/40'
                    : 'w-4 bg-border-default'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-xl border border-border-default bg-bg-surface p-6 shadow-lg min-h-[360px] flex flex-col">
          <div className="flex-1">
            <StepComponent />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border-default">
            <div>
              {!isFirst && !isLast && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ChevronLeft size={14} />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isLast && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleSkip}
                  className="text-text-faint hover:text-text-muted"
                >
                  <SkipForward size={12} />
                  Skip
                </Button>
              )}

              {isLast ? (
                <Button
                  onClick={handleFinish}
                  disabled={saveSetting.isPending}
                  size="sm"
                >
                  {saveSetting.isPending ? 'Saving...' : 'Get Started'}
                </Button>
              ) : (
                <Button onClick={() => setStep((s) => s + 1)} size="sm">
                  {isFirst ? 'Get Started' : 'Next'}
                  <ChevronRight size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Step label */}
        <p className="text-center text-[10px] text-text-faint mt-3">
          Step {step + 1} of {STEPS.length} — {STEPS[step].label}
        </p>
      </div>
    </div>
  );
}
