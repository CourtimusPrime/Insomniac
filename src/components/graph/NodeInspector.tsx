import type { Edge, Node } from '@xyflow/react';
import { Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type Ability, useAbilities } from '../../api/abilities';
import { ModelSelector } from '../ui/ModelSelector';
import type { AgentNodeAbility, AgentNodeData } from './AgentNode';
import { edgeColors } from './CustomEdge';

/* ── Edge condition options ── */
const edgeConditionOptions = [
  { value: 'always', label: 'Always' },
  { value: 'on-success', label: 'On success' },
  { value: 'on-failure', label: 'On failure' },
  { value: 'on-decision', label: 'On decision' },
] as const;

/* ── Ability type badge variant ── */
const abilityTypeVariant: Record<string, 'info' | 'success' | 'secondary'> = {
  skill: 'info',
  command: 'success',
  mcp: 'info',
  workflow: 'secondary',
};

interface NodeInspectorProps {
  node: Node<AgentNodeData>;
  edges: Edge[];
  onSave: (nodeId: string, data: Partial<AgentNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onUpdateEdge: (edgeId: string, condition: string) => void;
  onClose: () => void;
}

export function NodeInspector({
  node,
  edges,
  onSave,
  onDelete,
  onUpdateEdge,
  onClose,
}: NodeInspectorProps) {
  const [name, setName] = useState(node.data.label);
  const [model, setModel] = useState(node.data.model ?? '');
  const [systemPrompt, setSystemPrompt] = useState(
    node.data.systemPrompt ?? '',
  );
  const [abilities, setAbilities] = useState<AgentNodeAbility[]>(
    node.data.abilities ?? [],
  );
  const [showAbilityPicker, setShowAbilityPicker] = useState(false);

  const { data: allAbilities } = useAbilities();

  // Sync local state when a different node is selected
  useEffect(() => {
    setName(node.data.label);
    setModel(node.data.model ?? '');
    setSystemPrompt(node.data.systemPrompt ?? '');
    setAbilities(node.data.abilities ?? []);
    setShowAbilityPicker(false);
  }, [
    node.data.label,
    node.data.model,
    node.data.systemPrompt,
    node.data.abilities,
  ]);

  // Outgoing edges from this node
  const outgoingEdges = edges.filter((e) => e.source === node.id);

  const handleSave = useCallback(() => {
    onSave(node.id, {
      label: name,
      model: model || undefined,
      systemPrompt: systemPrompt || undefined,
      abilities: abilities.length > 0 ? abilities : undefined,
    });
  }, [node.id, name, model, systemPrompt, abilities, onSave]);

  const handleDelete = useCallback(() => {
    if (confirm('Delete this node and all its connections?')) {
      onDelete(node.id);
    }
  }, [node.id, onDelete]);

  const handleRemoveAbility = useCallback((abilityId: string) => {
    setAbilities((prev) => prev.filter((a) => a.id !== abilityId));
  }, []);

  const handleAddAbility = useCallback((ability: Ability) => {
    setAbilities((prev) => {
      if (prev.some((a) => a.id === ability.id)) return prev;
      return [...prev, { id: ability.id, name: ability.name }];
    });
    setShowAbilityPicker(false);
  }, []);

  // Available abilities (not already assigned)
  const availableAbilities = (allAbilities ?? []).filter(
    (a) => a.enabled && !abilities.some((assigned) => assigned.id === a.id),
  );

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-[340px] sm:max-w-[340px] p-0 flex flex-col"
        style={{ background: '#0d1117', borderColor: '#1e2a3a' }}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <SheetHeader
          className="px-4 py-3 border-b space-y-0"
          style={{ borderColor: '#1e2a3a' }}
        >
          <SheetTitle className="text-sm font-semibold text-text-primary font-heading">
            Node Inspector
          </SheetTitle>
          <SheetDescription className="sr-only">
            Edit the selected node properties
          </SheetDescription>
        </SheetHeader>

        {/* Body (scrollable) */}
        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-5">
            {/* Node Name */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Name
              </Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs bg-bg-surface border-border-default text-text-primary focus-visible:ring-accent-primary"
              />
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Model
              </Label>
              <ModelSelector
                value={model}
                onChange={setModel}
                className="w-full"
              />
            </div>

            {/* System Prompt */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                System Prompt
              </Label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                className="text-xs bg-bg-surface border-border-default text-text-primary focus-visible:ring-accent-primary resize-y leading-relaxed min-h-[100px]"
                placeholder="Enter system prompt for this agent..."
              />
            </div>

            {/* Abilities */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Abilities
              </Label>
              {abilities.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {abilities.map((ability) => (
                    <Badge
                      key={ability.id}
                      variant="outline"
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-accent-primary/10 text-accent-primary border-accent-primary/20"
                    >
                      {ability.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveAbility(ability.id)}
                        className="hover:text-status-error transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-text-faint">
                  No abilities assigned
                </div>
              )}

              {/* Add ability button / picker */}
              {!showAbilityPicker ? (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-accent-primary hover:text-accent-primary/80 mt-1 px-0"
                  onClick={() => setShowAbilityPicker(true)}
                >
                  <Plus size={11} />
                  Add ability
                </Button>
              ) : (
                <div
                  className="mt-1 rounded border overflow-hidden"
                  style={{ background: '#111827', borderColor: '#1e2a3a' }}
                >
                  <div
                    className="px-2.5 py-1.5 border-b flex items-center justify-between"
                    style={{ borderColor: '#1e2a3a' }}
                  >
                    <span className="text-[10px] text-text-muted font-medium">
                      Select ability
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-5 w-5 text-text-muted hover:text-text-primary"
                      onClick={() => setShowAbilityPicker(false)}
                    >
                      <X size={10} />
                    </Button>
                  </div>
                  {availableAbilities.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto">
                      {availableAbilities.map((ability) => (
                        <button
                          type="button"
                          key={ability.id}
                          onClick={() => handleAddAbility(ability)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-white/5 transition-colors"
                        >
                          <span className="text-[11px] text-text-primary">
                            {ability.name}
                          </span>
                          <Badge
                            variant={
                              abilityTypeVariant[ability.executor] ??
                              'secondary'
                            }
                            className="text-[9px] px-1.5 py-0.5"
                          >
                            {ability.executor}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-2.5 py-2 text-[10px] text-text-faint">
                      No available abilities
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Outgoing Edge Conditions */}
            {outgoingEdges.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  Edge Conditions
                </Label>
                <div className="space-y-2">
                  {outgoingEdges.map((edge) => {
                    const currentCondition =
                      (edge.data as { condition?: string })?.condition ??
                      'always';
                    return (
                      <div key={edge.id} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            background:
                              edgeColors[currentCondition] ?? edgeColors.always,
                          }}
                        />
                        <Select
                          value={currentCondition}
                          onValueChange={(value) =>
                            onUpdateEdge(edge.id, value)
                          }
                        >
                          <SelectTrigger className="flex-1 h-7 text-[11px] bg-bg-surface border-border-default text-text-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {edgeConditionOptions.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className="text-[11px]"
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-[10px] text-text-faint truncate max-w-[60px]">
                          → {edge.target.slice(0, 6)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-t shrink-0"
          style={{ borderColor: '#1e2a3a' }}
        >
          <Button onClick={handleSave} size="xs" className="flex-1">
            Save
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="text-status-error border-border-default hover:bg-status-error/10"
                onClick={handleDelete}
              >
                <Trash2 size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete node</TooltipContent>
          </Tooltip>
        </div>
      </SheetContent>
    </Sheet>
  );
}
