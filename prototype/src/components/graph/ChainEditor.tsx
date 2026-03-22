import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
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
import { Plus, X, Layers } from 'lucide-react';
import { AgentNode, type AgentNodeData } from './AgentNode';
import { CustomEdge } from './CustomEdge';
import { AddNodeMenu } from './AddNodeMenu';
import { NodeInspector } from './NodeInspector';
import { ChainToolbar } from './ChainToolbar';
import { useChain, useSaveChain, type ChainDefinition } from '../../api/projects';
import { useProjectsStore } from '../../stores/projects';
import { useTemplates, useApplyTemplate, type Template } from '../../api/templates';

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

/* ── Menu state type ── */
type MenuState = { screenX: number; screenY: number; flowX: number; flowY: number } | null;

/* ── Serialize chain state for persistence ── */
function serializeChain(nodes: Node[], edges: Edge[]): ChainDefinition {
  return {
    version: 1,
    nodes: nodes.map((n) => {
      const d = n.data as AgentNodeData;
      return {
        id: n.id,
        type: d.nodeType,
        label: d.label,
        model: d.model ?? null,
        systemPrompt: d.systemPrompt ?? null,
        status: d.status ?? 'pending',
        abilities: d.abilities ?? [],
        position: n.position,
      };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      condition: (e.data as { condition?: string })?.condition ?? 'always',
    })),
  };
}

/* ── Deserialize chain from API into ReactFlow state ── */
function deserializeChain(chain: ChainDefinition): { nodes: Node<AgentNodeData>[]; edges: Edge[] } {
  const nodes: Node<AgentNodeData>[] = chain.nodes.map((n) => ({
    id: n.id,
    type: 'agent',
    position: n.position,
    data: {
      label: n.label,
      nodeType: n.type,
      model: n.model ?? undefined,
      systemPrompt: n.systemPrompt ?? undefined,
      status: (n.status as AgentNodeData['status']) ?? 'pending',
      abilities: n.abilities ?? [],
    },
  }));
  const edges: Edge[] = chain.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'custom',
    data: { condition: e.condition ?? 'always' },
  }));
  return { nodes, edges };
}

/* ── Template Picker overlay ── */
const CATEGORY_LABELS: Record<string, string> = {
  workflow: 'Workflow',
  'agent-config': 'Agent Config',
  template: 'Template',
  'mcp-adapter': 'MCP Adapter',
};

function TemplatePicker({
  onSelect,
  onClose,
}: {
  onSelect: (template: Template) => void;
  onClose: () => void;
}) {
  const { data: templates, isLoading } = useTemplates();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: globalThis.MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40">
      <div
        ref={ref}
        className="w-96 max-h-[70vh] rounded-lg border shadow-xl overflow-hidden flex flex-col"
        style={{ background: '#111827', borderColor: '#1e2a3a' }}
      >
        <div
          className="px-4 py-3 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: '#1e2a3a' }}
        >
          <div className="text-xs font-semibold text-text-primary">Load Template</div>
          <button className="text-text-muted hover:text-text-primary transition-colors" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {isLoading && (
            <div className="px-4 py-8 text-center text-xs text-text-muted">Loading templates…</div>
          )}
          {templates && templates.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-text-muted">No templates available</div>
          )}
          {templates?.map((t) => (
            <button
              key={t.id}
              className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b last:border-b-0"
              style={{ borderColor: '#1e2a3a' }}
              onClick={() => onSelect(t)}
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-text-primary">{t.name}</span>
                {t.isBuiltIn && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary font-medium">
                    Built-in
                  </span>
                )}
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-text-muted">
                  {CATEGORY_LABELS[t.category] ?? t.category}
                </span>
              </div>
              {t.description && (
                <div className="text-[10px] text-text-muted mt-1 line-clamp-2">{t.description}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChainEditorInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [menu, setMenu] = useState<MenuState>(null);
  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const { screenToFlowPosition, deleteElements } = useReactFlow();

  /* ── Chain persistence ── */
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const { data: chainData } = useChain(activeProjectId);
  const saveChain = useSaveChain();
  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load chain from API on mount / project change
  useEffect(() => {
    if (!chainData) return;
    // Only load once per project (avoid overwriting user edits with stale query data)
    if (hasLoadedRef.current) return;
    const { nodes: loadedNodes, edges: loadedEdges } = deserializeChain(chainData);
    setNodes(loadedNodes);
    setEdges(loadedEdges);
    hasLoadedRef.current = true;
  }, [chainData, setNodes, setEdges]);

  // Reset loaded flag when project changes
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [activeProjectId]);

  // Debounced auto-save (1s) on nodes/edges change
  useEffect(() => {
    if (!activeProjectId || !hasLoadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const chain = serializeChain(nodes, edges);
      saveChain.mutate({ projectId: activeProjectId, chain });
    }, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, activeProjectId]);

  /* ── Apply template ── */
  const applyTemplate = useApplyTemplate();
  const handleApplyTemplate = useCallback(
    (template: Template) => {
      if (!activeProjectId) return;
      // Persist on server
      applyTemplate.mutate({ templateId: template.id, projectId: activeProjectId });
      // Load chain locally from the template's chainDefinition
      const chain = template.chainDefinition as ChainDefinition;
      const { nodes: newNodes, edges: newEdges } = deserializeChain(chain);
      setNodes(newNodes);
      setEdges(newEdges);
      setShowTemplatePicker(false);
    },
    [activeProjectId, applyTemplate, setNodes, setEdges],
  );

  /* ── Node open / delete callbacks (passed via node data) ── */
  const handleNodeOpen = useCallback((nodeId: string) => {
    setInspectedNodeId(nodeId);
  }, []);

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      deleteElements({ nodes: [{ id: nodeId }] });
      if (inspectedNodeId === nodeId) setInspectedNodeId(null);
    },
    [deleteElements, inspectedNodeId],
  );

  /* ── Inspector save: update node data ── */
  const handleInspectorSave = useCallback(
    (nodeId: string, data: Partial<AgentNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, ...data } }
            : n,
        ),
      );
    },
    [setNodes],
  );

  /* ── Inspector edge condition update ── */
  const handleUpdateEdge = useCallback(
    (edgeId: string, condition: string) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, condition } } : e,
        ),
      );
    },
    [setEdges],
  );

  /* ── Inspector delete node ── */
  const handleInspectorDelete = useCallback(
    (nodeId: string) => {
      deleteElements({ nodes: [{ id: nodeId }] });
      setInspectedNodeId(null);
    },
    [deleteElements],
  );

  // Inject onOpen/onDelete callbacks into node data
  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, onOpen: handleNodeOpen, onDelete: handleNodeDelete },
      })),
    [nodes, handleNodeOpen, handleNodeDelete],
  );

  // The inspected node (from the raw nodes, not the callback-injected version)
  const inspectedNode = inspectedNodeId
    ? (nodes.find((n) => n.id === inspectedNodeId) as Node<AgentNodeData> | undefined) ?? null
    : null;

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

  /* ── Add node from menu ── */
  const handleAddNode = useCallback(
    (nodeType: string, label: string) => {
      if (!menu) return;
      const id = crypto.randomUUID();
      const newNode: Node<AgentNodeData> = {
        id,
        type: 'agent',
        position: { x: menu.flowX, y: menu.flowY },
        data: {
          label: `${label} ${nodes.length + 1}`,
          nodeType,
          status: 'pending',
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setMenu(null);
    },
    [menu, nodes.length, setNodes],
  );

  /* ── Open menu via toolbar button ── */
  const handleToolbarAdd = useCallback(() => {
    // Place node at center of the viewport
    const flowPos = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setMenu({ screenX: 80, screenY: 48, flowX: flowPos.x, flowY: flowPos.y });
  }, [screenToFlowPosition]);

  /* ── Open menu via double-click on canvas ── */
  const handlePaneDoubleClick = useCallback(
    (event: MouseEvent) => {
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const target = event.target as HTMLElement;
      const rect = target.closest('.react-flow')?.getBoundingClientRect();
      const screenX = rect ? event.clientX - rect.left : event.clientX;
      const screenY = rect ? event.clientY - rect.top : event.clientY;
      setMenu({ screenX, screenY, flowX: flowPos.x, flowY: flowPos.y });
    },
    [screenToFlowPosition],
  );

  /* ── Auto-layout: left-to-right grid ── */
  const handleAutoLayout = useCallback(() => {
    const colWidth = 280;
    const rowHeight = 160;
    const maxPerCol = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));

    setNodes((nds) =>
      nds.map((n, i) => ({
        ...n,
        position: {
          x: Math.floor(i / maxPerCol) * colWidth,
          y: (i % maxPerCol) * rowHeight,
        },
      })),
    );
  }, [nodes.length, setNodes]);

  /* ── Clear all edges ── */
  const handleClearEdges = useCallback(() => {
    setEdges([]);
  }, [setEdges]);

  /* ── Export chain as JSON ── */
  const handleExportJSON = useCallback(() => {
    const chain = {
      version: 1,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: (n.data as AgentNodeData).nodeType,
        label: (n.data as AgentNodeData).label,
        model: (n.data as AgentNodeData).model ?? null,
        systemPrompt: (n.data as AgentNodeData).systemPrompt ?? null,
        status: (n.data as AgentNodeData).status ?? 'pending',
        abilities: (n.data as AgentNodeData).abilities ?? [],
        position: n.position,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        condition: (e.data as { condition?: string })?.condition ?? 'always',
      })),
    };
    const blob = new Blob([JSON.stringify(chain, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.insomniac-chain.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  const isEmpty = nodes.length === 0;

  return (
    <div className="h-full w-full relative flex flex-col" style={{ background: '#0a0d13' }}>
      {/* Toolbar */}
      <ChainToolbar
        onAddNode={handleToolbarAdd}
        onAutoLayout={handleAutoLayout}
        onClearEdges={handleClearEdges}
        onExportJSON={handleExportJSON}
        onLoadTemplate={() => setShowTemplatePicker(true)}
      />

      {/* Canvas + Inspector */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDoubleClick={handlePaneDoubleClick}
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

        {/* Add Node Menu (floating) */}
        {menu && (
          <AddNodeMenu
            position={{ x: menu.screenX, y: menu.screenY }}
            onSelect={handleAddNode}
            onClose={() => setMenu(null)}
          />
        )}

        {/* Empty state overlay */}
        {isEmpty && !menu && !showTemplatePicker && (
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
              <div className="flex items-center gap-2 justify-center pt-1">
                <div className="h-px w-8 bg-border-default" />
                <span className="text-[10px] text-text-muted">or</span>
                <div className="h-px w-8 bg-border-default" />
              </div>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-text-primary border transition-colors hover:bg-white/5"
                style={{ borderColor: '#1e2a3a' }}
                onClick={() => setShowTemplatePicker(true)}
              >
                <Layers size={13} />
                Start from template
              </button>
            </div>
          </div>
        )}

        {/* Template Picker overlay */}
        {showTemplatePicker && (
          <TemplatePicker
            onSelect={handleApplyTemplate}
            onClose={() => setShowTemplatePicker(false)}
          />
        )}

        {/* Node Inspector panel (slide-in from right) */}
        {inspectedNode && (
          <NodeInspector
            node={inspectedNode}
            edges={edges}
            onSave={handleInspectorSave}
            onDelete={handleInspectorDelete}
            onUpdateEdge={handleUpdateEdge}
            onClose={() => setInspectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}

export function ChainEditor() {
  return (
    <ReactFlowProvider>
      <ChainEditorInner />
    </ReactFlowProvider>
  );
}
