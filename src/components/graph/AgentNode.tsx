import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { ExternalLink, X } from 'lucide-react';
import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/* ── node-type colour map ── */
const typeColors: Record<string, string> = {
  trigger: '#06b6d4', // cyan
  prototyper: '#8b5cf6', // violet
  builder: '#6366f1', // indigo
  tester: '#10b981', // emerald
  reviewer: '#f59e0b', // amber
  auditor: '#ef4444', // red
};

/* ── status badge variant map ── */
const statusVariant: Record<
  string,
  'secondary' | 'info' | 'success' | 'destructive'
> = {
  pending: 'secondary',
  running: 'info',
  done: 'success',
  error: 'destructive',
};

export type AgentNodeAbility = { id: string; name: string };

export type AgentNodeData = {
  label: string;
  nodeType: string;
  model?: string;
  systemPrompt?: string;
  status?: 'pending' | 'running' | 'done' | 'error';
  abilities?: AgentNodeAbility[];
  onOpen?: (id: string) => void;
  onDelete?: (id: string) => void;
};

type AgentNodeType = Node<AgentNodeData, 'agent'>;

function AgentNodeComponent({ id, data }: NodeProps<AgentNodeType>) {
  const color = typeColors[data.nodeType] ?? '#6b7280';
  const status = data.status ?? 'pending';
  const promptPreview = data.systemPrompt
    ? data.systemPrompt.length > 72
      ? `${data.systemPrompt.slice(0, 72)}…`
      : data.systemPrompt
    : null;

  return (
    <div
      className="relative rounded-lg border shadow-lg min-w-[180px] max-w-[220px]"
      style={{ background: '#111827', borderColor: '#1e2a3a' }}
    >
      {/* Input handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !border-2 !bg-bg-base"
        style={{ borderColor: '#1e2a3a' }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        {/* Type dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-text-primary truncate leading-tight">
            {data.label}
          </div>
          {data.model && (
            <div className="text-[10px] text-text-muted truncate leading-tight mt-0.5">
              {data.model}
            </div>
          )}
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-5 w-5 text-text-muted hover:text-accent-primary"
                onClick={() => data.onOpen?.(id)}
              >
                <ExternalLink size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Open</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-5 w-5 text-text-muted hover:text-status-error"
                onClick={() => data.onDelete?.(id)}
              >
                <X size={11} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Body preview */}
      {promptPreview && (
        <div className="px-3 pb-1.5">
          <div className="text-[10px] text-text-faint leading-snug break-words">
            {promptPreview}
          </div>
        </div>
      )}

      {/* Footer - status badge */}
      <div className="px-3 pb-2.5 pt-1">
        <Badge
          variant={statusVariant[status] ?? 'secondary'}
          className="text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5"
        >
          {status}
        </Badge>
      </div>

      {/* Output handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !border-2 !bg-bg-base"
        style={{ borderColor: '#1e2a3a' }}
      />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
