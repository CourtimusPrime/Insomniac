import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import { ModelSelector } from '../ui/ModelSelector';
import { useAbilities, type Ability } from '../../api/abilities';
import type { AgentNodeData, AgentNodeAbility } from './AgentNode';
import { edgeColors } from './CustomEdge';

/* ── Edge condition options ── */
const edgeConditionOptions = [
  { value: 'always', label: 'Always' },
  { value: 'on-success', label: 'On success' },
  { value: 'on-failure', label: 'On failure' },
  { value: 'on-decision', label: 'On decision' },
] as const;

/* ── Ability type badge color ── */
const abilityTypeBadge: Record<string, string> = {
  skill: 'bg-violet-500/20 text-violet-300',
  plugin: 'bg-emerald-500/20 text-emerald-300',
  mcp: 'bg-cyan-500/20 text-cyan-300',
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
  const [systemPrompt, setSystemPrompt] = useState(node.data.systemPrompt ?? '');
  const [abilities, setAbilities] = useState<AgentNodeAbility[]>(node.data.abilities ?? []);
  const [showAbilityPicker, setShowAbilityPicker] = useState(false);

  const { data: allAbilities } = useAbilities();

  // Sync local state when a different node is selected
  useEffect(() => {
    setName(node.data.label);
    setModel(node.data.model ?? '');
    setSystemPrompt(node.data.systemPrompt ?? '');
    setAbilities(node.data.abilities ?? []);
    setShowAbilityPicker(false);
  }, [node.id, node.data.label, node.data.model, node.data.systemPrompt, node.data.abilities]);

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
    (a) => a.active && !abilities.some((assigned) => assigned.id === a.id),
  );

  return (
    <div
      className="absolute top-0 right-0 h-full w-[340px] border-l flex flex-col z-40 overflow-hidden"
      style={{ background: '#0d1117', borderColor: '#1e2a3a' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: '#1e2a3a' }}
      >
        <h3 className="text-sm font-semibold text-text-primary font-heading">
          Node Inspector
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body (scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Node Name */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-border-default bg-bg-surface px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary"
          />
        </div>

        {/* Model */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Model
          </label>
          <ModelSelector value={model} onChange={setModel} className="w-full" />
        </div>

        {/* System Prompt */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={5}
            className="w-full rounded border border-border-default bg-bg-surface px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary resize-y leading-relaxed"
            placeholder="Enter system prompt for this agent..."
          />
        </div>

        {/* Abilities */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Abilities
          </label>
          {abilities.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {abilities.map((ability) => (
                <span
                  key={ability.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20"
                >
                  {ability.name}
                  <button
                    onClick={() => handleRemoveAbility(ability.id)}
                    className="hover:text-status-error transition-colors"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-text-faint">No abilities assigned</div>
          )}

          {/* Add ability button / picker */}
          {!showAbilityPicker ? (
            <button
              onClick={() => setShowAbilityPicker(true)}
              className="flex items-center gap-1 text-[11px] text-accent-primary hover:text-accent-primary/80 transition-colors mt-1"
            >
              <Plus size={11} />
              Add ability
            </button>
          ) : (
            <div
              className="mt-1 rounded border overflow-hidden"
              style={{ background: '#111827', borderColor: '#1e2a3a' }}
            >
              <div className="px-2.5 py-1.5 border-b flex items-center justify-between" style={{ borderColor: '#1e2a3a' }}>
                <span className="text-[10px] text-text-muted font-medium">Select ability</span>
                <button
                  onClick={() => setShowAbilityPicker(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  <X size={10} />
                </button>
              </div>
              {availableAbilities.length > 0 ? (
                <div className="max-h-32 overflow-y-auto">
                  {availableAbilities.map((ability) => (
                    <button
                      key={ability.id}
                      onClick={() => handleAddAbility(ability)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-white/5 transition-colors"
                    >
                      <span className="text-[11px] text-text-primary">{ability.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded ${abilityTypeBadge[ability.type] ?? 'bg-gray-500/20 text-gray-400'}`}
                      >
                        {ability.type}
                      </span>
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
            <label className="block text-[11px] font-medium text-text-muted uppercase tracking-wider">
              Edge Conditions
            </label>
            <div className="space-y-2">
              {outgoingEdges.map((edge) => (
                <div key={edge.id} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background:
                        edgeColors[(edge.data as { condition?: string })?.condition ?? 'always'] ??
                        edgeColors.always,
                    }}
                  />
                  <select
                    value={(edge.data as { condition?: string })?.condition ?? 'always'}
                    onChange={(e) => onUpdateEdge(edge.id, e.target.value)}
                    className="flex-1 rounded border border-border-default bg-bg-surface px-2 py-1 text-[11px] text-text-primary outline-none focus:border-accent-primary"
                  >
                    {edgeConditionOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-text-faint truncate max-w-[60px]">
                    → {edge.target.slice(0, 6)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-t shrink-0"
        style={{ borderColor: '#1e2a3a' }}
      >
        <button
          onClick={handleSave}
          className="flex-1 rounded-md bg-accent-primary px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent-primary/90 transition-colors"
        >
          Save
        </button>
        <button
          onClick={handleDelete}
          className="rounded-md border px-3 py-1.5 text-[11px] font-medium text-status-error hover:bg-status-error/10 transition-colors"
          style={{ borderColor: '#1e2a3a' }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
