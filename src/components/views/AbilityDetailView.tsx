import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  useAbility,
  useDeleteAbility,
  useUpdateAbility,
} from '../../api/abilities';
import { useLayoutStore } from '../../stores/layout';

const typeBadgeVariant = (t: string) =>
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
        <Button variant="link" size="xs" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const handleToggleActive = () => {
    updateAbility.mutate({ id: ability.id, active: !ability.active });
  };

  const handleDelete = () => {
    deleteAbility.mutate(ability.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setActiveAbilityId(null);
        setActiveMain('pipeline');
      },
    });
  };

  return (
    <div className="p-5 max-w-xl space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        size="xs"
        onClick={() => {
          setActiveAbilityId(null);
          setActiveMain('pipeline');
        }}
      >
        <ArrowLeft size={12} />
        Back
      </Button>

      {/* Header */}
      <div className="flex items-center gap-3 pb-4">
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
        <div className="flex items-center gap-2">
          <Label
            htmlFor="ability-active-toggle"
            className={cn(
              'text-[10px] cursor-pointer',
              ability.active ? 'text-status-success' : 'text-text-muted',
            )}
          >
            {updateAbility.isPending
              ? '...'
              : ability.active
                ? 'Active'
                : 'Inactive'}
          </Label>
          <Switch
            id="ability-active-toggle"
            checked={ability.active}
            onCheckedChange={handleToggleActive}
            disabled={updateAbility.isPending}
            className="scale-75"
          />
        </div>
      </div>

      <Separator />

      {/* Type badge */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">
          Type
        </div>
        <Badge
          variant="outline"
          className={cn('text-[11px]', typeBadgeVariant(ability.type))}
        >
          {ability.type}
        </Badge>
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
      <Separator />
      <div className="pt-1">
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              className="text-status-error/70 hover:text-status-error hover:bg-status-error/10"
            >
              <Trash2 size={12} />
              Delete ability
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete ability</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{ability.name}"? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteAbility.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteAbility.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
