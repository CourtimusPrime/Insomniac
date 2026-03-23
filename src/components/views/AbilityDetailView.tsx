import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
  useAbility,
  useDeleteAbility,
  useUpdateAbility,
} from '../../api/abilities';
import { useLayoutStore } from '../../stores/layout';

const typeBadge = (t: string) =>
  ({
    skill: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    plugin: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    mcp: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  })[t] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';

const typeIcon = (t: string) =>
  ({
    skill: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    plugin: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    mcp: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  })[t] || 'bg-gray-500/10 border-gray-500/20 text-gray-400';

export function AbilityDetailView() {
  const activeAbilityId = useLayoutStore((s) => s.activeAbilityId);
  const setActiveMain = useLayoutStore((s) => s.setActiveMain);
  const setActiveAbilityId = useLayoutStore((s) => s.setActiveAbilityId);

  const {
    data: ability,
    isLoading,
    isError,
    refetch,
  } = useAbility(activeAbilityId);
  const updateAbility = useUpdateAbility();
  const deleteAbility = useDeleteAbility();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!activeAbilityId) {
    return (
      <div className="p-5 flex flex-col items-center justify-center h-full text-text-muted">
        <BookOpen size={24} className="mb-2 opacity-50" />
        <p className="text-xs">No ability selected</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-5 flex items-center justify-center h-full">
        <Loader2 size={18} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (isError || !ability) {
    return (
      <div className="p-5 flex flex-col items-center gap-2 justify-center h-full">
        <AlertCircle size={18} className="text-status-error" />
        <p className="text-xs text-text-muted">Failed to load ability</p>
        <button
          onClick={() => refetch()}
          className="text-[10px] text-accent-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const handleToggleActive = () => {
    updateAbility.mutate({ id: ability.id, active: !ability.active });
  };

  const handleDelete = () => {
    deleteAbility.mutate(ability.id, {
      onSuccess: () => {
        setActiveAbilityId(null);
        setActiveMain('pipeline');
      },
    });
  };

  return (
    <div className="p-5 max-w-xl space-y-4">
      {/* Back button */}
      <button
        onClick={() => {
          setActiveAbilityId(null);
          setActiveMain('pipeline');
        }}
        className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-default transition-colors"
      >
        <ArrowLeft size={12} />
        Back
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border-default">
        <div
          className={`w-10 h-10 rounded-lg border flex items-center justify-center ${typeIcon(ability.type)}`}
        >
          <BookOpen size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-text-primary font-heading truncate">
            {ability.name}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            {ability.type} {ability.version ? `· v${ability.version}` : ''}
          </div>
        </div>
        <button
          onClick={handleToggleActive}
          disabled={updateAbility.isPending}
          className={`text-[10px] px-2 py-1 rounded border cursor-pointer transition-colors ${
            ability.active
              ? 'bg-status-success/15 text-status-success border-status-success/30 hover:bg-status-success/25'
              : 'bg-text-faint/15 text-text-muted border-border-muted hover:bg-text-faint/25'
          }`}
        >
          {updateAbility.isPending
            ? '...'
            : ability.active
              ? 'Active'
              : 'Inactive'}
        </button>
      </div>

      {/* Type badge */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">
          Type
        </div>
        <span
          className={`text-[11px] px-2 py-1 rounded border inline-block ${typeBadge(ability.type)}`}
        >
          {ability.type}
        </span>
      </div>

      {/* Version */}
      {ability.version && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">
            Version
          </div>
          <span className="text-[11px] text-text-secondary">
            {ability.version}
          </span>
        </div>
      )}

      {/* Config */}
      {ability.config && Object.keys(ability.config).length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">
            Configuration
          </div>
          <pre className="text-[11px] font-mono text-text-muted px-3 py-2 bg-bg-base rounded border border-border-muted overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(ability.config, null, 2)}
          </pre>
        </div>
      )}

      {/* Assigned agents placeholder */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">
          Assigned agents
        </div>
        <p className="text-[11px] text-text-muted italic">
          No agents assigned yet
        </p>
      </div>

      {/* Delete */}
      <div className="pt-4 border-t border-border-default">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-[11px] text-status-error/70 hover:text-status-error transition-colors"
          >
            <Trash2 size={12} />
            Delete ability
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted">
              Delete this ability?
            </span>
            <button
              onClick={handleDelete}
              disabled={deleteAbility.isPending}
              className="text-[11px] px-2 py-1 rounded bg-status-error/20 text-status-error border border-status-error/30 hover:bg-status-error/30 transition-colors"
            >
              {deleteAbility.isPending ? 'Deleting...' : 'Confirm'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="text-[11px] px-2 py-1 rounded text-text-muted hover:text-text-default transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
