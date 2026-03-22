import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type Connection,
  type ConnectionLineComponentProps,
  BackgroundVariant,
  addEdge,
  getBezierPath,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus } from 'lucide-react';
import { AgentNode } from './AgentNode';
import { CustomEdge } from './CustomEdge';

const nodeTypes = { agent: AgentNode };
const edgeTypes = { custom: CustomEdge };

const defaultViewport = { x: 0, y: 0, zoom: 1 };

/* ── Cycle detection ── */
function wouldCreateCycle(
  edges: Edge[],
  source: string,
  target: string,
): boolean {
  // BFS from target following existing edges — if we can reach source, it's a cycle
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.source) ?? [];
    list.push(e.target);
    adj.set(e.source, list);
  }
  const visited = new Set<string>();
  const queue = [target];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adj.get(current) ?? []) {
      queue.push(next);
    }
  }
  return false;
}

/* ── Dashed connection line during drag ── */
function DashedConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) {
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
    sourcePosition: fromPosition ?? Position.Right,
    targetPosition: toPosition ?? Position.Left,
  });

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="#6366f1"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        strokeOpacity={0.6}
      />
    </g>
  );
}

const defaultEdgeOptions = {
  type: 'custom' as const,
  data: { condition: 'always' as const },
};

export function ChainEditor() {
  const [nodes, , onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      // Reject self-loops
      if (connection.source === connection.target) return;
      // Reject cycles
      if (wouldCreateCycle(edges, connection.source, connection.target)) return;

      setEdges((eds) =>
        addEdge(
          { ...connection, type: 'custom', data: { condition: 'always' } },
          eds,
        ),
      );
    },
    [edges, setEdges],
  );

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  const isEmpty = nodes.length === 0;

  return (
    <div className="h-full w-full relative" style={{ background: '#0a0d13' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineComponent={DashedConnectionLine}
        defaultViewport={defaultViewport}
        proOptions={proOptions}
        fitView={!isEmpty}
        panOnDrag
        zoomOnScroll
        minZoom={0.1}
        maxZoom={2}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1e2a3a"
        />
        <Controls
          showInteractive={false}
          className="!bg-bg-surface !border-border-default !rounded-lg !shadow-lg [&>button]:!bg-bg-surface [&>button]:!border-border-default [&>button]:!text-text-secondary [&>button:hover]:!bg-bg-hover"
        />
        <MiniMap
          nodeColor="#6366f1"
          maskColor="rgba(0, 0, 0, 0.6)"
          className="!bg-bg-surface !border-border-default !rounded-lg"
        />
      </ReactFlow>

      {/* Empty state overlay */}
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-3 pointer-events-auto">
            <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center mx-auto">
              <Plus size={20} className="text-accent-primary" />
            </div>
            <div className="text-sm text-text-primary font-medium font-heading">
              Add your first agent node
            </div>
            <div className="text-xs text-text-muted max-w-xs">
              Build an agent chain by adding nodes and connecting them with edges.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
