import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, GitMerge, CheckCircle2, Loader2, AlertCircle,
  Pencil, Trash2, Code2, Github, FolderPlus, X, ArrowLeft,
} from 'lucide-react';
import { useLayoutStore } from '../../stores/layout';
import { useProjectsStore } from '../../stores/projects';
import { useProjects, useDeleteProject, useUpdateProject, useOpenInVSCode, useCreateProject, useCloneProject } from '../../api/projects';
import type { Project } from '../../api/projects';
import { useAbilities } from '../../api/abilities';

const statusDot = (s: string) => ({
  building: 'bg-accent-primary animate-pulse',
  idle: 'bg-text-faint',
  error: 'bg-status-error',
  completed: 'bg-status-success',
}[s] || 'bg-text-faint');

const typeBadge = (t: string) => ({
  skill: 'bg-violet-500/20 text-violet-300',
  plugin: 'bg-emerald-500/20 text-emerald-300',
  mcp: 'bg-cyan-500/20 text-cyan-300',
  workflow: 'bg-amber-500/20 text-amber-300',
}[t]);

interface ContextMenu {
  projectId: string;
  x: number;
  y: number;
}

export function LeftSidebar() {
  const activeToolbar = useLayoutStore((s) => s.activeToolbar);
  const setActiveMain = useLayoutStore((s) => s.setActiveMain);
  const setActiveAbilityId = useLayoutStore((s) => s.setActiveAbilityId);
  const collapsed = useLayoutStore((s) => s.collapsedPanels.leftSidebar);
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const setActiveProjectId = useProjectsStore((s) => s.setActiveProjectId);
  const { data: projects, isLoading, isError, refetch } = useProjects();
  const { data: abilities, isLoading: abilitiesLoading, isError: abilitiesError, refetch: refetchAbilities } = useAbilities();

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const openInVSCode = useOpenInVSCode();
  const createProject = useCreateProject();
  const cloneProject = useCloneProject();

  // Create project dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createMode, setCreateMode] = useState<'choose' | 'github' | 'empty'>('choose');
  const [githubUrl, setGithubUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [createError, setCreateError] = useState('');

  const resetCreateDialog = useCallback(() => {
    setShowCreateDialog(false);
    setCreateMode('choose');
    setGithubUrl('');
    setProjectName('');
    setCreateError('');
  }, []);

  const handleCreateFromGitHub = useCallback(() => {
    if (!githubUrl.trim()) return;
    setCreateError('');
    cloneProject.mutate(
      { repoUrl: githubUrl.trim(), name: projectName.trim() || undefined },
      {
        onSuccess: () => resetCreateDialog(),
        onError: (err) => setCreateError(err instanceof Error ? err.message : 'Clone failed'),
      },
    );
  }, [githubUrl, projectName, cloneProject, resetCreateDialog]);

  const handleCreateEmpty = useCallback(() => {
    if (!projectName.trim()) return;
    setCreateError('');
    createProject.mutate(
      { name: projectName.trim() },
      {
        onSuccess: () => resetCreateDialog(),
        onError: (err) => setCreateError(err instanceof Error ? err.message : 'Creation failed'),
      },
    );
  }, [projectName, createProject, resetCreateDialog]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleContextMenu = useCallback((e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    setContextMenu({ projectId: project.id, x: e.clientX, y: e.clientY });
  }, []);

  const handleRename = useCallback((project: Project) => {
    setContextMenu(null);
    setRenamingId(project.id);
    setRenameValue(project.name);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      updateProject.mutate({ id: renamingId, name: renameValue.trim() });
    }
    setRenamingId(null);
  }, [renamingId, renameValue, updateProject]);

  const handleRemove = useCallback((id: string) => {
    setContextMenu(null);
    deleteProject.mutate(id);
  }, [deleteProject]);

  const handleOpenVSCode = useCallback((id: string) => {
    setContextMenu(null);
    openInVSCode.mutate(id);
  }, [openInVSCode]);

  return (
    <aside className={`flex flex-col bg-bg-default shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out ${
      collapsed ? 'w-0' : 'w-56 border-r border-border-default'
    }`}>
      <div className="w-56 min-w-[14rem] flex flex-col h-full">

      {activeToolbar === 'projects' && (
        <>
          <div className="px-4 py-3 flex items-center justify-between border-b border-border-default">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Projects</span>
            <button onClick={() => setShowCreateDialog(true)} className="text-text-faint hover:text-accent-primary transition"><Plus size={13} /></button>
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
                <button
                  onClick={() => refetch()}
                  className="text-[10px] text-accent-primary hover:underline">
                  Retry
                </button>
              </div>
            )}
            {projects?.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveProjectId(p.id)}
                onContextMenu={(e) => handleContextMenu(e, p)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition border-l-2 ${
                  activeProjectId === p.id
                    ? 'border-accent-primary bg-accent-primary/5 text-text-primary'
                    : 'border-transparent hover:bg-bg-hover text-text-secondary'
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(p.status)}`} />
                <div className="min-w-0 flex-1">
                  {renamingId === p.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium w-full bg-bg-input border border-accent-primary rounded px-1 py-0.5 outline-none text-text-primary"
                    />
                  ) : (
                    <div className="text-xs font-medium truncate">{p.name}</div>
                  )}
                  <div className="text-[10px] text-text-faint mt-0.5">{p.language ?? 'Unknown'} · {p.status}</div>
                </div>
              </button>
            ))}

            {/* Context Menu */}
            {contextMenu && (
              <div
                ref={menuRef}
                className="fixed z-50 bg-bg-surface border border-border-default rounded-lg shadow-lg py-1 min-w-[160px]"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                <button
                  onClick={() => {
                    const project = projects?.find(p => p.id === contextMenu.projectId);
                    if (project) handleRename(project);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary flex items-center gap-2 transition"
                >
                  <Pencil size={12} />
                  Rename
                </button>
                <button
                  onClick={() => handleRemove(contextMenu.projectId)}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary flex items-center gap-2 transition"
                >
                  <Trash2 size={12} />
                  Remove from list
                </button>
                <button
                  onClick={() => handleOpenVSCode(contextMenu.projectId)}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary flex items-center gap-2 transition"
                >
                  <Code2 size={12} />
                  Open in VS Code
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeToolbar === 'abilities' && (
        <>
          <div className="px-4 py-3 flex items-center justify-between border-b border-border-default">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Abilities</span>
            <button className="text-text-faint hover:text-accent-primary transition"><Plus size={13} /></button>
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
                <button
                  onClick={() => refetchAbilities()}
                  className="text-[10px] text-accent-primary hover:underline">
                  Retry
                </button>
              </div>
            )}
            {abilities?.map(a => (
              <button
                key={a.id}
                onClick={() => { setActiveAbilityId(a.id); setActiveMain('ability-detail'); }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-bg-hover transition border-l-2 border-transparent hover:border-border-muted">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.active ? 'bg-status-success' : 'bg-text-faint'}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs truncate">{a.name}</div>
                  <div className={`text-[10px] mt-0.5 ${typeBadge(a.type)} px-1.5 py-0.5 rounded inline-block`}>{a.type}</div>
                </div>
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
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">GitHub</span>
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
            <div className="pt-2 text-[10px] text-text-faint uppercase tracking-widest">Connected as</div>
            <div className="text-xs text-text-secondary">@court-ash-dale</div>
          </div>
        </>
      )}

      {activeToolbar === 'marketplace' && (
        <>
          <div className="px-4 py-3 border-b border-border-default">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Marketplace</span>
          </div>
          <div className="p-3 space-y-1.5">
            {['All', 'Skills', 'MCPs', 'Workflows'].map(cat => (
              <button key={cat} className="w-full text-left px-3 py-1.5 rounded text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition">{cat}</button>
            ))}
          </div>
        </>
      )}

      </div>

      {/* Create Project Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={resetCreateDialog}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative bg-bg-surface border border-border-default rounded-xl shadow-2xl w-[380px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                {createMode !== 'choose' && (
                  <button
                    onClick={() => { setCreateMode('choose'); setCreateError(''); }}
                    className="text-text-faint hover:text-text-primary transition"
                  >
                    <ArrowLeft size={14} />
                  </button>
                )}
                <span className="text-xs font-semibold text-text-primary">
                  {createMode === 'choose' && 'New Project'}
                  {createMode === 'github' && 'From GitHub'}
                  {createMode === 'empty' && 'Empty Project'}
                </span>
              </div>
              <button onClick={resetCreateDialog} className="text-text-faint hover:text-text-primary transition">
                <X size={14} />
              </button>
            </div>

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
                      <div className="font-medium text-text-primary">From GitHub repo</div>
                      <div className="text-text-faint mt-0.5">Clone an existing repository</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setCreateMode('empty')}
                    className="w-full text-left px-3 py-3 rounded-lg border border-border-muted hover:border-accent-primary/50 hover:bg-accent-primary/5 text-xs transition flex items-center gap-3"
                  >
                    <FolderPlus size={16} className="text-text-secondary shrink-0" />
                    <div>
                      <div className="font-medium text-text-primary">Empty project</div>
                      <div className="text-text-faint mt-0.5">Start from scratch</div>
                    </div>
                  </button>
                </div>
              )}

              {createMode === 'github' && (
                <form onSubmit={(e) => { e.preventDefault(); handleCreateFromGitHub(); }} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">Repository URL</label>
                    <input
                      type="text"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/user/repo"
                      autoFocus
                      className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-faint outline-none focus:border-accent-primary transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">Project name <span className="text-text-faint">(optional)</span></label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Derived from URL if empty"
                      className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-faint outline-none focus:border-accent-primary transition"
                    />
                  </div>
                  {createError && <p className="text-[10px] text-status-error">{createError}</p>}
                  <button
                    type="submit"
                    disabled={!githubUrl.trim() || cloneProject.isPending}
                    className="w-full py-2 rounded-lg text-xs font-medium bg-accent-primary text-white hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {cloneProject.isPending && <Loader2 size={12} className="animate-spin" />}
                    {cloneProject.isPending ? 'Cloning...' : 'Clone Repository'}
                  </button>
                </form>
              )}

              {createMode === 'empty' && (
                <form onSubmit={(e) => { e.preventDefault(); handleCreateEmpty(); }} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1">Project name</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="My Project"
                      autoFocus
                      className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-faint outline-none focus:border-accent-primary transition"
                    />
                  </div>
                  {createError && <p className="text-[10px] text-status-error">{createError}</p>}
                  <button
                    type="submit"
                    disabled={!projectName.trim() || createProject.isPending}
                    className="w-full py-2 rounded-lg text-xs font-medium bg-accent-primary text-white hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {createProject.isPending && <Loader2 size={12} className="animate-spin" />}
                    {createProject.isPending ? 'Creating...' : 'Create Project'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
