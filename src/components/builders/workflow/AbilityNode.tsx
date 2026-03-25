import { Handle, type NodeProps, Position } from '@xyflow/react';
import type { AbilityKind } from '../../../api/abilities';

export interface AbilityNodeData {
  label: string;
  abilityId: string;
  kind: AbilityKind;
  status?: 'pending' | 'running' | 'success' | 'error';
  [key: string]: unknown;
}

const kindColors: Record<string, string> = {
  skill: 'border-violet-500/40 bg-violet-500/5',
  agent: 'border-blue-500/40 bg-blue-500/5',
  command: 'border-emerald-500/40 bg-emerald-500/5',
  mcp: 'border-cyan-500/40 bg-cyan-500/5',
  workflow: 'border-amber-500/40 bg-amber-500/5',
};

const statusColors: Record<string, string> = {
  pending: 'bg-text-faint',
  running: 'bg-blue-400 animate-pulse',
  success: 'bg-status-success',
  error: 'bg-status-error',
};

export function AbilityNode({ data, selected }: NodeProps) {
  const d = data as AbilityNodeData;
  const color = kindColors[d.kind] ?? 'border-border-muted bg-bg-base';
  const statusColor = statusColors[d.status ?? 'pending'] ?? 'bg-text-faint';

  return (
    <div
      className={`px-3 py-2 rounded-lg border-2 min-w-[140px] transition ${color} ${
        selected ? 'ring-2 ring-accent-primary/50' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-text-faint"
      />
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-text-primary truncate">
            {d.label}
          </div>
          <div className="text-[9px] text-text-faint">{d.kind}</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-text-faint"
      />
    </div>
  );
}
