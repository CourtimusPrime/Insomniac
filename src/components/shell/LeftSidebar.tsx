import { open } from '@tauri-apps/plugin-dialog';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Code2,
  Download,
  Folder,
  FolderOpen,
  FolderPlus,
  Github,
  GitMerge,
  HardDrive,
  Home,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type ExecutorType,
  useAbilities,
  useToggleAbility,
} from '../../api/abilities';
import {
  type BrowseEntry,
  type BrowseResult,
  useBrowseDirectory,
  useBrowseInfo,
} from '../../api/filesystem';
import { useMarketplace } from '../../api/marketplace';
import type { Project } from '../../api/projects';
import {
  useCloneProject,
  useCreateProject,
  useDeleteProject,
  useOpenInVSCode,
  useProjects,
  useUpdateProject,
} from '../../api/projects';
import { type MarketplaceCategory, useLayoutStore } from '../../stores/layout';
import { useProjectsStore } from '../../stores/projects';

const statusDot = (s: string) =>
  ({
    building: 'bg-accent-primary animate-pulse',
    idle: 'bg-text-faint',
    error: 'bg-status-error',
    completed: 'bg-status-success',
  })[s] || 'bg-text-faint';

const typeBadge = (t: string) =>
  ({
    skill: 'bg-violet-500/20 text-violet-300',
    agent: 'bg-blue-500/20 text-blue-300',
    command: 'bg-emerald-500/20 text-emerald-300',
    mcp: 'bg-cyan-500/20 text-cyan-300',
    workflow: 'bg-amber-500/20 text-amber-300',
  })[t];

const SIDEBAR_CATEGORIES: { key: MarketplaceCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'workflow', label: 'Workflows' },
  { key: 'agent-config', label: 'Agent Configs' },
  { key: 'template', label: 'Templates' },
  { key: 'mcp-adapter', label: 'MCP Adapters' },
];

function MarketplaceSidebar() {
  const setActiveMain = useLayoutStore((s) => s.setActiveMain);
  const marketplaceCategory = useLayoutStore((s) => s.marketplaceCategory);
  const setMarketplaceCategory = useLayoutStore(
    (s) => s.setMarketplaceCategory,
  );

  // Fetch all items to find the top 3 by install count
  const { data, isLoading } = useMarketplace({ limit: 50 });

  const featured = (data?.items ?? [])
    .slice()
    .sort((a, b) => b.installCount - a.installCount)
    .slice(0, 3);

  const handleCategoryClick = (key: MarketplaceCategory) => {
    setMarketplaceCategory(key);
    setActiveMain('marketplace');
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Marketplace
        </span>
        <Button
          variant="link"
          size="xs"
          onClick={() => setActiveMain('marketplace')}
          className="text-text-faint hover:text-accent-primary p-0 h-auto text-[10px]"
          title="Open marketplace"
        >
          Browse all
        </Button>
      </div>

      {/* Categories */}
      <div className="p-3 space-y-0.5">
        <div className="text-[9px] font-bold uppercase tracking-widest text-text-faint px-3 pb-1.5">
          Categories
        </div>
        {SIDEBAR_CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            variant="ghost"
            size="xs"
            onClick={() => handleCategoryClick(cat.key)}
            className={`w-full justify-start px-3 py-1.5 h-auto rounded text-xs ${
              marketplaceCategory === cat.key
                ? 'bg-accent-primary/10 text-accent-primary'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Featured / Popular */}
      <div className="border-t border-border-default p-3 space-y-1.5">
        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-text-faint px-3 pb-1">
          <TrendingUp size={10} />
          Popular
        </div>
        {isLoading && (
          <div className="flex items-center justify-center py-4 text-text-faint">
            <Loader2 size={14} className="animate-spin" />
          </div>
        )}
        {featured.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveMain('marketplace')}
            className="w-full text-left px-3 py-2 rounded hover:bg-bg-hover transition"
          >
            <div className="text-xs font-medium text-text-primary truncate">
              {item.name}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-text-faint">{item.author}</span>
              <span className="flex items-center gap-0.5 text-[10px] text-text-faint">
                <Download size={9} />
                {item.installCount}
              </span>
            </div>
          </button>
        ))}
        {!isLoading && featured.length === 0 && (
          <div className="px-3 py-2 text-[10px] text-text-faint">
            No items available
          </div>
        )}
      </div>
    </>
  );
}

export function LeftSidebar() {
  const activeToolbar = useLayoutStore((s) => s.activeToolbar);
  const setActiveMain = useLayoutStore((s) => s.setActiveMain);
  const setActiveAbilityId = useLayoutStore((s) => s.setActiveAbilityId);
  const setEditingAbilityId = useLayoutStore((s) => s.setEditingAbilityId);
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const setActiveProjectId = useProjectsStore((s) => s.setActiveProjectId);
  const { data: projects, isLoading, isError, refetch } = useProjects();
  const [abilitySearch, setAbilitySearch] = useState('');
  const [executorFilter, setExecutorFilter] = useState<ExecutorType | null>(
    null,
  );
  const {
    data: abilities,
    isLoading: abilitiesLoading,
    isError: abilitiesError,
    refetch: refetchAbilities,
  } = useAbilities({
    search: abilitySearch || undefined,
    executor: executorFilter ?? undefined,
  });
  const toggleAbility = useToggleAbility();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const openInVSCode = useOpenInVSCode();
  const createProject = useCreateProject();
  const cloneProject = useCloneProject();

  // Create project dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createMode, setCreateMode] = useState<
    'choose' | 'github' | 'empty' | 'local'
  >('choose');
  const [githubUrl, setGithubUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [createError, setCreateError] = useState('');

  // Local folder browser state
  const browseInfo = useBrowseInfo(createMode === 'local');
  const browseDirectory = useBrowseDirectory();
  const [browseSource, setBrowseSource] = useState<'linux' | 'windows'>(
    'linux',
  );
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null);
  const [browseHistory, setBrowseHistory] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const initialBrowseAttempted = useRef(false);
  const [slowLoad, setSlowLoad] = useState(false);

  const resetCreateDialog = useCallback(() => {
    setShowCreateDialog(false);
    setCreateMode('choose');
    setGithubUrl('');
    setProjectName('');
    setCreateError('');
    setBrowseData(null);
    setBrowseHistory([]);
    setSelectedPath(null);
    setBrowseSource('linux');
    setBrowseError(null);
    initialBrowseAttempted.current = false;
    setSlowLoad(false);
  }, []);

  const handleCreateFromGitHub = useCallback(() => {
    if (!githubUrl.trim()) return;
    setCreateError('');
    cloneProject.mutate(
      { repoUrl: githubUrl.trim(), name: projectName.trim() || undefined },
      {
        onSuccess: (project) => {
          setActiveProjectId(project.id);
          resetCreateDialog();
        },
        onError: (err) =>
          setCreateError(err instanceof Error ? err.message : 'Clone failed'),
      },
    );
  }, [githubUrl, projectName, cloneProject, resetCreateDialog]);

  const handleCreateEmpty = useCallback(() => {
    if (!projectName.trim()) return;
    setCreateError('');
    createProject.mutate(
      { name: projectName.trim() },
      {
        onSuccess: (project) => {
          setActiveProjectId(project.id);
          resetCreateDialog();
        },
        onError: (err) =>
          setCreateError(
            err instanceof Error ? err.message : 'Creation failed',
          ),
      },
    );
  }, [projectName, createProject, setActiveProjectId, resetCreateDialog]);

  const browseTo = useCallback(
    (path: string, resetHistory = false) => {
      setBrowseError(null);
      browseDirectory.mutate(
        { path },
        {
          onSuccess: (data) => {
            setBrowseData(data);
            setSelectedPath(null);
            if (resetHistory) {
              setBrowseHistory([path]);
            } else {
              setBrowseHistory((prev) => [...prev, path]);
            }
          },
          onError: (err) => {
            setBrowseError(
              err instanceof Error ? err.message : 'Failed to browse directory',
            );
          },
        },
      );
    },
    [browseDirectory],
  );

  // Auto-load the initial directory when entering local mode and info is ready
  useEffect(() => {
    if (
      createMode !== 'local' ||
      !browseInfo.data ||
      initialBrowseAttempted.current
    )
      return;
    initialBrowseAttempted.current = true;
    const startPath =
      browseSource === 'windows' && browseInfo.data.wslDrives.length > 0
        ? `/mnt/${browseInfo.data.wslDrives[0]}/Users`
        : browseInfo.data.home;
    browseTo(startPath, true);
  }, [createMode, browseInfo.data, browseSource, browseTo]);

  const handleBrowseBack = useCallback(() => {
    if (browseHistory.length <= 1) return;
    const newHistory = browseHistory.slice(0, -1);
    const parentPath = newHistory[newHistory.length - 1];
    setBrowseError(null);
    browseDirectory.mutate(
      { path: parentPath },
      {
        onSuccess: (data) => {
          setBrowseData(data);
          setBrowseHistory(newHistory);
          setSelectedPath(null);
        },
        onError: (err) => {
          setBrowseError(
            err instanceof Error ? err.message : 'Failed to browse directory',
          );
        },
      },
    );
  }, [browseHistory, browseDirectory]);

  const handleSwitchSource = useCallback(
    (source: 'linux' | 'windows') => {
      if (!browseInfo.data) return;
      setBrowseSource(source);
      setBrowseData(null);
      setSelectedPath(null);
      setBrowseError(null);
      const startPath =
        source === 'windows' && browseInfo.data.wslDrives.length > 0
          ? `/mnt/${browseInfo.data.wslDrives[0]}/Users`
          : browseInfo.data.home;
      browseDirectory.mutate(
        { path: startPath },
        {
          onSuccess: (data) => {
            setBrowseData(data);
            setBrowseHistory([startPath]);
          },
          onError: (err) => {
            setBrowseError(
              err instanceof Error ? err.message : 'Failed to browse directory',
            );
          },
        },
      );
    },
    [browseInfo.data, browseDirectory],
  );

  const handleNativePicker = useCallback(async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        const name =
          projectName.trim() ||
          selected.split('/').filter(Boolean).pop() ||
          'project';
        setCreateError('');
        createProject.mutate(
          { name, path: selected },
          {
            onSuccess: (project) => {
              setActiveProjectId(project.id);
              resetCreateDialog();
            },
            onError: (err) =>
              setCreateError(
                err instanceof Error ? err.message : 'Creation failed',
              ),
          },
        );
      }
    } catch {
      // User cancelled or dialog unavailable
    }
  }, [projectName, createProject, setActiveProjectId, resetCreateDialog]);

  // Slow-load warning timer
  useEffect(() => {
    if (!browseDirectory.isPending) {
      setSlowLoad(false);
      return;
    }
    const timer = setTimeout(() => setSlowLoad(true), 3000);
    return () => clearTimeout(timer);
  }, [browseDirectory.isPending]);

  const handleCreateFromLocal = useCallback(() => {
    const pathToUse = selectedPath ?? browseData?.path;
    if (!pathToUse) return;
    const name =
      projectName.trim() ||
      pathToUse.split('/').filter(Boolean).pop() ||
      'project';
    setCreateError('');
    createProject.mutate(
      { name, path: pathToUse },
      {
        onSuccess: (project) => {
          setActiveProjectId(project.id);
          resetCreateDialog();
        },
        onError: (err) =>
          setCreateError(
            err instanceof Error ? err.message : 'Creation failed',
          ),
      },
    );
  }, [
    selectedPath,
    browseData,
    projectName,
    createProject,
    setActiveProjectId,
    resetCreateDialog,
  ]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleRename = useCallback((project: Project) => {
    setRenamingId(project.id);
    setRenameValue(project.name);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      updateProject.mutate({ id: renamingId, name: renameValue.trim() });
    }
    setRenamingId(null);
  }, [renamingId, renameValue, updateProject]);

  const handleRemove = useCallback(
    (id: string) => {
      deleteProject.mutate(id);
    },
    [deleteProject],
  );

  const handleOpenVSCode = useCallback(
    (id: string) => {
      openInVSCode.mutate(id);
    },
    [openInVSCode],
  );

  return (
    <aside className="flex flex-col bg-bg-default overflow-hidden h-full w-full">
      <div className="min-w-0 flex flex-col h-full">
        {activeToolbar === 'projects' && (
          <>
            <div className="px-4 py-3 flex items-center justify-between border-b border-border-default">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Projects
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowCreateDialog(true)}
                className="text-text-faint hover:text-accent-primary h-auto w-auto p-0"
              >
                <Plus size={13} />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {isLoading && (
                <div className="flex items-center justify-center py-8 text-text-faint">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}
              {isError && (
                <div className="flex flex-col items-center gap-2 py-8 text-text-faint">
                  <AlertCircle size={16} className="text-status-error" />
                  <span className="text-[10px]">Failed to load projects</span>
                  <Button
                    variant="link"
                    size="xs"
                    onClick={() => refetch()}
                    className="text-[10px] text-accent-primary hover:underline p-0 h-auto"
                  >
                    Retry
                  </Button>
                </div>
              )}
              {projects?.map((p) => (
                <ContextMenu key={p.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      onClick={() => setActiveProjectId(p.id)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition border-l-2 ${
                        activeProjectId === p.id
                          ? 'border-accent-primary bg-accent-primary/5 text-text-primary'
                          : 'border-transparent hover:bg-bg-hover text-text-secondary'
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(p.status)}`}
                      />
                      <div className="min-w-0 flex-1">
                        {renamingId === p.id ? (
                          <Input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-6 text-xs font-medium w-full bg-bg-input border-accent-primary rounded px-1 py-0.5 text-text-primary"
                          />
                        ) : (
                          <div className="text-xs font-medium truncate">
                            {p.name}
                          </div>
                        )}
                        <div className="text-[10px] text-text-faint mt-0.5">
                          {p.language ?? 'Unknown'} · {p.status}
                        </div>
                      </div>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="min-w-[160px]">
                    <ContextMenuItem
                      onClick={() => handleRename(p)}
                      className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-2"
                    >
                      <Pencil size={12} />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleRemove(p.id)}
                      className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-2"
                    >
                      <Trash2 size={12} />
                      Remove from list
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleOpenVSCode(p.id)}
                      className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-2"
                    >
                      <Code2 size={12} />
                      Open in VS Code
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </>
        )}

        {activeToolbar === 'abilities' && (
          <>
            <div className="px-4 py-3 flex items-center justify-between border-b border-border-default">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Abilities
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-text-faint hover:text-accent-primary h-auto w-auto p-0"
                onClick={() => {
                  setEditingAbilityId(null);
                  setActiveMain('agent-builder');
                }}
              >
                <Plus size={13} />
              </Button>
            </div>
            {/* Search */}
            <div className="px-3 py-2 border-b border-border-default">
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-text-faint"
                />
                <input
                  type="text"
                  placeholder="Search abilities..."
                  value={abilitySearch}
                  onChange={(e) => setAbilitySearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-[11px] bg-bg-base border border-border-muted rounded focus:outline-none focus:border-accent-primary/50 text-text-default placeholder:text-text-faint"
                />
              </div>
              {/* Executor filter chips */}
              <div className="flex gap-1 mt-2 flex-wrap">
                {(['skill', 'command', 'mcp', 'workflow'] as const).map(
                  (ex) => (
                    <button
                      key={ex}
                      onClick={() =>
                        setExecutorFilter(executorFilter === ex ? null : ex)
                      }
                      className={`text-[9px] px-2 py-0.5 rounded-full border transition ${
                        executorFilter === ex
                          ? 'bg-accent-primary/15 border-accent-primary/30 text-accent-primary'
                          : 'bg-transparent border-border-muted text-text-faint hover:text-text-muted hover:border-border-default'
                      }`}
                    >
                      {ex}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {abilitiesLoading && (
                <div className="flex items-center justify-center py-8 text-text-faint">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}
              {abilitiesError && (
                <div className="flex flex-col items-center gap-2 py-8 text-text-faint">
                  <AlertCircle size={16} className="text-status-error" />
                  <span className="text-[10px]">Failed to load abilities</span>
                  <Button
                    variant="link"
                    size="xs"
                    onClick={() => refetchAbilities()}
                    className="text-[10px] text-accent-primary hover:underline p-0 h-auto"
                  >
                    Retry
                  </Button>
                </div>
              )}
              {abilities?.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setActiveAbilityId(a.id);
                    setActiveMain('ability-detail');
                  }}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-bg-hover transition border-l-2 border-transparent hover:border-border-muted group"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.enabled ? 'bg-status-success' : 'bg-text-faint'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs truncate">{a.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div
                        className={`text-[9px] ${typeBadge(a.executor)} px-1.5 py-0.5 rounded inline-block`}
                      >
                        {a.kind ?? a.executor}
                      </div>
                      {a.tags?.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="text-[9px] text-text-faint">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAbility.mutate(a.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    title={a.enabled ? 'Disable' : 'Enable'}
                  >
                    <div
                      className={`w-2 h-2 rounded-full border ${a.enabled ? 'bg-status-success border-status-success' : 'border-text-faint'}`}
                    />
                  </button>
                </button>
              ))}
              {abilities && abilities.length === 0 && (
                <div className="px-4 py-8 text-center text-[10px] text-text-faint">
                  No abilities yet
                </div>
              )}
            </div>
          </>
        )}

        {activeToolbar === 'github' && (
          <>
            <div className="px-4 py-3 border-b border-border-default">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                GitHub
              </span>
            </div>
            <div className="p-4 space-y-2">
              <button className="w-full text-left px-3 py-2.5 rounded-lg border border-border-muted hover:border-accent-primary/50 hover:bg-accent-primary/5 text-xs transition flex items-center gap-2">
                <GitMerge size={12} className="text-accent-secondary" />
                Open this repo
              </button>
              <button className="w-full text-left px-3 py-2.5 rounded-lg border border-border-muted hover:border-status-success/50 hover:bg-status-success/5 text-xs transition flex items-center gap-2">
                <CheckCircle2 size={12} className="text-status-success" />
                Merge when ready
              </button>
              <div className="pt-2 text-[10px] text-text-faint uppercase tracking-widest">
                Connected as
              </div>
              <div className="text-xs text-text-secondary">@court-ash-dale</div>
            </div>
          </>
        )}

        {activeToolbar === 'marketplace' && <MarketplaceSidebar />}
      </div>

      {/* Create Project Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (!open) resetCreateDialog();
        }}
      >
        <DialogContent className="bg-bg-surface border-border-default rounded-xl shadow-2xl w-[380px] max-w-[90vw] p-0 gap-0">
          {/* Header */}
          <DialogHeader className="flex-row items-center justify-between px-4 py-3 border-b border-border-default space-y-0">
            <div className="flex items-center gap-2">
              {createMode !== 'choose' && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setCreateMode('choose');
                    setCreateError('');
                  }}
                  className="text-text-faint hover:text-text-primary h-auto w-auto p-0"
                >
                  <ArrowLeft size={14} />
                </Button>
              )}
              <DialogTitle className="text-xs font-semibold text-text-primary">
                {createMode === 'choose' && 'New Project'}
                {createMode === 'github' && 'From GitHub'}
                {createMode === 'empty' && 'Empty Project'}
                {createMode === 'local' && 'From Local Folder'}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="p-4">
            {createMode === 'choose' && (
              <div className="space-y-2">
                <button
                  onClick={() => setCreateMode('github')}
                  className="w-full text-left px-3 py-3 rounded-lg border border-border-muted hover:border-accent-primary/50 hover:bg-accent-primary/5 text-xs transition flex items-center gap-3"
                >
                  <Github size={16} className="text-text-secondary shrink-0" />
                  <div>
                    <div className="font-medium text-text-primary">
                      From GitHub repo
                    </div>
                    <div className="text-text-faint mt-0.5">
                      Clone an existing repository
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setCreateMode('local')}
                  className="w-full text-left px-3 py-3 rounded-lg border border-border-muted hover:border-accent-primary/50 hover:bg-accent-primary/5 text-xs transition flex items-center gap-3"
                >
                  <FolderOpen
                    size={16}
                    className="text-text-secondary shrink-0"
                  />
                  <div>
                    <div className="font-medium text-text-primary">
                      From local folder
                    </div>
                    <div className="text-text-faint mt-0.5">
                      Choose from your filesystem or WSL
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setCreateMode('empty')}
                  className="w-full text-left px-3 py-3 rounded-lg border border-border-muted hover:border-accent-primary/50 hover:bg-accent-primary/5 text-xs transition flex items-center gap-3"
                >
                  <FolderPlus
                    size={16}
                    className="text-text-secondary shrink-0"
                  />
                  <div>
                    <div className="font-medium text-text-primary">
                      Empty project
                    </div>
                    <div className="text-text-faint mt-0.5">
                      Start from scratch
                    </div>
                  </div>
                </button>
              </div>
            )}

            {createMode === 'github' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateFromGitHub();
                }}
                className="space-y-3"
              >
                <div>
                  <Label className="block text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">
                    Repository URL
                  </Label>
                  <Input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/user/repo"
                    className="h-8 text-xs bg-bg-input border-border-default rounded-lg text-text-primary placeholder:text-text-faint focus-visible:border-accent-primary"
                  />
                </div>
                <div>
                  <Label className="block text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">
                    Project name{' '}
                    <span className="text-text-faint">(optional)</span>
                  </Label>
                  <Input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Derived from URL if empty"
                    className="h-8 text-xs bg-bg-input border-border-default rounded-lg text-text-primary placeholder:text-text-faint focus-visible:border-accent-primary"
                  />
                </div>
                {createError && (
                  <p className="text-[10px] text-status-error">{createError}</p>
                )}
                <Button
                  type="submit"
                  disabled={!githubUrl.trim() || cloneProject.isPending}
                  className="w-full py-2 rounded-lg text-xs font-medium bg-accent-primary text-white hover:bg-accent-primary/90"
                >
                  {cloneProject.isPending && (
                    <Loader2 size={12} className="animate-spin" />
                  )}
                  {cloneProject.isPending ? 'Cloning...' : 'Clone Repository'}
                </Button>
              </form>
            )}

            {createMode === 'empty' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateEmpty();
                }}
                className="space-y-3"
              >
                <div>
                  <Label className="block text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">
                    Project name
                  </Label>
                  <Input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="My Project"
                    className="h-8 text-xs bg-bg-input border-border-default rounded-lg text-text-primary placeholder:text-text-faint focus-visible:border-accent-primary"
                  />
                </div>
                {createError && (
                  <p className="text-[10px] text-status-error">{createError}</p>
                )}
                <Button
                  type="submit"
                  disabled={!projectName.trim() || createProject.isPending}
                  className="w-full py-2 rounded-lg text-xs font-medium bg-accent-primary text-white hover:bg-accent-primary/90"
                >
                  {createProject.isPending && (
                    <Loader2 size={12} className="animate-spin" />
                  )}
                  {createProject.isPending ? 'Creating...' : 'Create Project'}
                </Button>
              </form>
            )}

            {createMode === 'local' && (
              <div className="space-y-3">
                {/* Native folder picker (Tauri only) */}
                {window.__TAURI_INTERNALS__ && (
                  <Button
                    variant="outline"
                    onClick={handleNativePicker}
                    className="w-full text-xs gap-2"
                  >
                    <FolderOpen size={13} />
                    Open folder picker
                  </Button>
                )}

                {/* Source toggle: Linux (WSL) vs Windows */}
                {browseInfo.data?.wsl && (
                  <div className="flex rounded-lg border border-border-default overflow-hidden">
                    <button
                      onClick={() => handleSwitchSource('linux')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium transition ${
                        browseSource === 'linux'
                          ? 'bg-accent-primary/10 text-accent-primary border-r border-border-default'
                          : 'text-text-muted hover:bg-bg-hover border-r border-border-default'
                      }`}
                    >
                      <Home size={12} />
                      Linux (WSL)
                    </button>
                    <button
                      onClick={() => handleSwitchSource('windows')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium transition ${
                        browseSource === 'windows'
                          ? 'bg-accent-primary/10 text-accent-primary'
                          : 'text-text-muted hover:bg-bg-hover'
                      }`}
                    >
                      <HardDrive size={12} />
                      Windows
                    </button>
                  </div>
                )}

                {/* Path bar with back button */}
                {browseData && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleBrowseBack}
                      disabled={browseHistory.length <= 1}
                      className="text-text-faint hover:text-text-primary h-auto w-auto p-0.5 shrink-0 disabled:opacity-30"
                    >
                      <ArrowLeft size={12} />
                    </Button>
                    <span className="text-[10px] text-text-muted truncate font-mono flex-1">
                      {browseData.path}
                    </span>
                    {browseData.isProject && (
                      <span className="text-[9px] bg-status-success/15 text-status-success px-1.5 py-0.5 rounded shrink-0">
                        project
                      </span>
                    )}
                  </div>
                )}

                {/* Server connection error */}
                {browseInfo.isError && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <AlertCircle size={16} className="text-status-error" />
                    <span className="text-[10px] text-text-faint">
                      Failed to connect to server
                    </span>
                    <Button
                      variant="link"
                      size="xs"
                      onClick={() => browseInfo.refetch()}
                      className="text-[10px] text-accent-primary hover:underline p-0 h-auto"
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {/* Directory listing */}
                <div className="rounded-lg border border-border-default overflow-hidden">
                  <div className="max-h-[240px] overflow-y-auto">
                    {(browseDirectory.isPending || browseInfo.isLoading) && (
                      <div className="flex flex-col items-center justify-center py-8 text-text-faint gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        {slowLoad && (
                          <span className="text-[10px] text-text-faint px-3 text-center">
                            Reading Windows filesystem via WSL can be slow...
                          </span>
                        )}
                      </div>
                    )}
                    {(browseDirectory.isError || browseError) &&
                      !browseDirectory.isPending && (
                        <div className="flex flex-col items-center gap-2 py-6">
                          <AlertCircle
                            size={16}
                            className="text-status-error"
                          />
                          <span className="text-[10px] text-text-faint text-center px-3">
                            {browseError || 'Failed to read directory'}
                          </span>
                          <Button
                            variant="link"
                            size="xs"
                            onClick={() => {
                              if (browseData?.path) {
                                browseTo(browseData.path, false);
                                // Remove the duplicate history entry that browseTo adds
                                setBrowseHistory((prev) => prev.slice(0, -1));
                              } else if (browseHistory.length > 0) {
                                browseTo(
                                  browseHistory[browseHistory.length - 1],
                                  false,
                                );
                                setBrowseHistory((prev) => prev.slice(0, -1));
                              }
                            }}
                            className="text-[10px] text-accent-primary hover:underline p-0 h-auto"
                          >
                            Retry
                          </Button>
                        </div>
                      )}
                    {browseData &&
                      !browseDirectory.isPending &&
                      !browseDirectory.isError &&
                      !browseError &&
                      browseData.entries.length === 0 && (
                        <div className="px-3 py-6 text-center text-[10px] text-text-faint">
                          Empty folder
                        </div>
                      )}
                    {!browseDirectory.isPending &&
                      browseData?.entries.map((entry: BrowseEntry) => {
                        const isSelected = selectedPath === entry.path;
                        return (
                          <button
                            key={entry.path}
                            onClick={() => setSelectedPath(entry.path)}
                            onDoubleClick={() => browseTo(entry.path)}
                            className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs transition ${
                              isSelected
                                ? 'bg-accent-primary/10 text-accent-primary'
                                : 'hover:bg-bg-hover text-text-secondary'
                            }`}
                          >
                            <Folder size={13} className="shrink-0" />
                            <span className="truncate flex-1">
                              {entry.name}
                            </span>
                            <ChevronRight
                              size={11}
                              className="text-text-faint shrink-0 opacity-40"
                            />
                          </button>
                        );
                      })}
                  </div>
                </div>

                <p className="text-[10px] text-text-faint">
                  Double-click to open a folder. Select and click Open to add as
                  a project.
                </p>

                {/* Optional project name override */}
                <div>
                  <Label className="block text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">
                    Project name{' '}
                    <span className="text-text-faint">(optional)</span>
                  </Label>
                  <Input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder={
                      selectedPath
                        ? selectedPath.split('/').filter(Boolean).pop()
                        : (browseData?.name ?? 'Derived from folder name')
                    }
                    className="h-8 text-xs bg-bg-input border-border-default rounded-lg text-text-primary placeholder:text-text-faint focus-visible:border-accent-primary"
                  />
                </div>

                {createError && (
                  <p className="text-[10px] text-status-error">{createError}</p>
                )}

                <Button
                  onClick={handleCreateFromLocal}
                  disabled={
                    (!selectedPath && !browseData?.path) ||
                    createProject.isPending
                  }
                  className="w-full py-2 rounded-lg text-xs font-medium bg-accent-primary text-white hover:bg-accent-primary/90"
                >
                  {createProject.isPending && (
                    <Loader2 size={12} className="animate-spin" />
                  )}
                  {createProject.isPending ? 'Adding...' : 'Open as Project'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
