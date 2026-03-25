import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Code,
  Loader2,
  Pencil,
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
  type AbilityDocument,
  type InterfaceField,
  useAbility,
  useDeleteAbility,
  useToggleAbility,
} from '../../api/abilities';
import { useLayoutStore } from '../../stores/layout';

const kindBadgeVariant = (k: string) =>
  ({
    skill: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    agent: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    command: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    mcp: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    workflow: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  })[k] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';

const kindIcon = (k: string) =>
  ({
    skill: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    agent: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    command: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    mcp: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    workflow: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  })[k] || 'bg-gray-500/10 border-gray-500/20 text-gray-400';

function FieldTable({
  fields,
  title,
}: {
  fields: InterfaceField[];
  title: string;
}) {
  if (fields.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] font-medium text-text-muted mb-1.5">
        {title}
      </div>
      <div className="border border-border-muted rounded overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-bg-base border-b border-border-muted">
              <th className="text-left px-2 py-1 text-text-faint font-medium">
                Field
              </th>
              <th className="text-left px-2 py-1 text-text-faint font-medium">
                Type
              </th>
              <th className="text-left px-2 py-1 text-text-faint font-medium">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr
                key={f.field}
                className="border-b border-border-muted last:border-0"
              >
                <td className="px-2 py-1 font-mono text-text-default">
                  {f.field}
                  {f.required && (
                    <span className="text-status-error ml-0.5">*</span>
                  )}
                </td>
                <td className="px-2 py-1 text-text-muted">{f.type}</td>
                <td className="px-2 py-1 text-text-muted">{f.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AbilityDetailView() {
  const activeAbilityId = useLayoutStore((s) => s.activeAbilityId);
  const setActiveMain = useLayoutStore((s) => s.setActiveMain);
  const setActiveAbilityId = useLayoutStore((s) => s.setActiveAbilityId);
  const setEditingAbilityId = useLayoutStore((s) => s.setEditingAbilityId);

  const {
    data: ability,
    isLoading,
    isError,
    refetch,
  } = useAbility(activeAbilityId);
  const toggleAbility = useToggleAbility();
  const deleteAbility = useDeleteAbility();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showYaml, setShowYaml] = useState(false);

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

  const doc = ability.document as AbilityDocument | null;
  const kind = ability.kind;

  const handleToggle = () => {
    toggleAbility.mutate(ability.id);
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

  const handleEdit = () => {
    setEditingAbilityId(ability.id);
    if (kind === 'workflow') {
      setActiveMain('workflow-builder');
    } else {
      setActiveMain('agent-builder');
    }
  };

  return (
    <div className="p-5 max-w-2xl space-y-4 overflow-y-auto">
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
          className={`w-10 h-10 rounded-lg border flex items-center justify-center ${kindIcon(kind)}`}
        >
          <BookOpen size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-text-primary font-heading truncate">
            {ability.name}
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            {kind} {ability.version ? `· v${ability.version}` : ''} · by{' '}
            {ability.author}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="xs" onClick={handleEdit}>
            <Pencil size={12} />
            Edit
          </Button>
          <Label
            htmlFor="ability-active-toggle"
            className={cn(
              'text-[10px] cursor-pointer',
              ability.enabled ? 'text-status-success' : 'text-text-muted',
            )}
          >
            {toggleAbility.isPending
              ? '...'
              : ability.enabled
                ? 'Active'
                : 'Inactive'}
          </Label>
          <Switch
            id="ability-active-toggle"
            checked={ability.enabled}
            onCheckedChange={handleToggle}
            disabled={toggleAbility.isPending}
            className="scale-75"
          />
        </div>
      </div>

      {/* Description */}
      {ability.description && (
        <p className="text-xs text-text-secondary">{ability.description}</p>
      )}

      {/* Tags */}
      {ability.tags && ability.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={cn('text-[10px]', kindBadgeVariant(kind))}
          >
            {kind}
          </Badge>
          {ability.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[10px] bg-bg-base border-border-muted text-text-muted"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <Separator />

      {/* View Source toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setShowYaml(!showYaml)}
          className="text-text-muted"
        >
          <Code size={12} />
          {showYaml ? 'Hide Source' : 'View Source'}
        </Button>
      </div>

      {showYaml && doc && (
        <pre className="text-[11px] font-mono text-text-muted px-3 py-2 bg-bg-base rounded border border-border-muted overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
          {/* Raw YAML will be rendered here — for now show JSON */}
          {JSON.stringify(doc, null, 2)}
        </pre>
      )}

      {!showYaml && doc && (
        <>
          {/* Trigger */}
          {doc.trigger && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">
                Trigger
              </div>
              <pre className="text-[11px] font-mono text-text-muted px-3 py-2 bg-bg-base rounded border border-border-muted whitespace-pre-wrap">
                {doc.trigger}
              </pre>
            </div>
          )}

          {/* Interface */}
          {(doc.interface.input.length > 0 ||
            doc.interface.output.length > 0) && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">
                Interface
              </div>
              <div className="space-y-3">
                <FieldTable fields={doc.interface.input} title="Input" />
                <FieldTable fields={doc.interface.output} title="Output" />
              </div>
            </div>
          )}

          {/* Config */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">
              Config
            </div>
            <pre className="text-[11px] font-mono text-text-muted px-3 py-2 bg-bg-base rounded border border-border-muted overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(doc.config, null, 2)}
            </pre>
          </div>

          {/* Instructions */}
          {doc.instructions && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">
                Instructions
              </div>
              <pre className="text-[11px] font-mono text-text-muted px-3 py-2 bg-bg-base rounded border border-border-muted overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                {typeof doc.instructions === 'string'
                  ? doc.instructions
                  : JSON.stringify(doc.instructions, null, 2)}
              </pre>
            </div>
          )}

          {/* Examples */}
          {doc.examples && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">
                Examples
              </div>
              <pre className="text-[11px] font-mono text-text-muted px-3 py-2 bg-bg-base rounded border border-border-muted overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                {doc.examples}
              </pre>
            </div>
          )}

          {/* Dependencies */}
          {doc.dependencies && doc.dependencies.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">
                Dependencies
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {doc.dependencies.map((dep) => (
                  <Badge
                    key={dep}
                    variant="outline"
                    className="text-[10px] bg-bg-base border-border-muted text-accent-primary cursor-pointer hover:bg-accent-primary/5"
                    onClick={() => {
                      setActiveAbilityId(dep);
                    }}
                  >
                    {dep}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}

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
                Are you sure you want to delete "{ability.name}"? This will
                remove the YAML file from disk. This action cannot be undone.
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
