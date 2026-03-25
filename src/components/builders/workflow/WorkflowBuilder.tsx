import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, GripVertical, Loader2, Save, Search } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type Ability,
  type AbilityDocument,
  useAbilities,
  useCreateAbility,
  type WorkflowStep,
} from '../../../api/abilities';
import { useLayoutStore } from '../../../stores/layout';
import { AbilityNode, type AbilityNodeData } from './AbilityNode';
import { useCanvasState } from './useCanvasState';

const nodeTypes = { ability: AbilityNode };

let nodeIdCounter = 0;
function nextNodeId() {
  return `wf-node-${++nodeIdCounter}`;
}

function WorkflowCanvas() {
  const setActiveMain = useLayoutStore((s) => s.setActiveMain);
  const editingAbilityId = useLayoutStore((s) => s.editingAbilityId);
  const setEditingAbilityId = useLayoutStore((s) => s.setEditingAbilityId);

  const { data: allAbilities, isLoading: abilitiesLoading } = useAbilities();
  const createAbility = useCreateAbility();

  const [paletteSearch, setPaletteSearch] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const isEdit = !!editingAbilityId;

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } =
    useCanvasState();

  // Filter palette abilities
  const filteredAbilities = useMemo(() => {
    if (!allAbilities) return [];
    const search = paletteSearch.toLowerCase();
    return allAbilities.filter(
      (a) =>
        a.enabled &&
        (a.name.toLowerCase().includes(search) ||
          a.executor.includes(search) ||
          a.tags?.some((t: string) => t.includes(search))),
    );
  }, [allAbilities, paletteSearch]);

  // Group by kind
  const groupedAbilities = useMemo(() => {
    const groups: Record<string, Ability[]> = {};
    for (const a of filteredAbilities) {
      const kind = a.kind ?? a.executor;
      if (!groups[kind]) groups[kind] = [];
      groups[kind].push(a);
    }
    return groups;
  }, [filteredAbilities]);

  const handleAddFromPalette = useCallback(
    (ability: Ability) => {
      const id = nextNodeId();
      const node: Node = {
        id,
        type: 'ability',
        position: { x: 200 + nodes.length * 180, y: 150 },
        data: {
          label: ability.name,
          abilityId: ability.id,
          kind: ability.kind ?? ability.executor,
          status: 'pending',
        } satisfies AbilityNodeData,
      };
      addNode(node);
    },
    [addNode, nodes.length],
  );

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Serialize graph to workflow YAML
  const serializeToWorkflow = useCallback((): AbilityDocument => {
    const steps: WorkflowStep[] = nodes.map((node) => {
      const data = node.data as AbilityNodeData;
      return {
        id: node.id,
        use: data.abilityId,
        label: data.label,
        output: `${node.id}_result`,
      };
    });

    return {
      frontmatter: {
        id: saveName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
        name: saveName,
        version: '1.0.0',
        description: saveDescription,
        tags: ['workflow'],
        author: '',
        enabled: true,
      },
      trigger: '',
      interface: { input: [], output: [] },
      config: {
        runtime: { executor: 'workflow' },
        on_error: 'stop',
      },
      instructions: steps,
      examples: '',
      dependencies: steps.map((s) => s.use).filter((u): u is string => !!u),
    };
  }, [nodes, saveName, saveDescription]);

  const handleSave = () => {
    const doc = serializeToWorkflow();
    createAbility.mutate(doc, {
      onSuccess: () => {
        setShowSaveDialog(false);
        setEditingAbilityId(null);
        setActiveMain('pipeline');
      },
    });
  };

  const handleCancel = () => {
    setEditingAbilityId(null);
    setActiveMain(isEdit ? 'ability-detail' : 'pipeline');
  };

  // Selected node info
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedData = selectedNode?.data as AbilityNodeData | undefined;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left — Ability Palette */}
      <div className="w-56 border-r border-border-default flex flex-col overflow-hidden shrink-0">
        <div className="px-3 py-3 border-b border-border-default">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Abilities
            </span>
          </div>
          <div className="relative">
            <Search
              size={11}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-text-faint"
            />
            <input
              type="text"
              placeholder="Search..."
              value={paletteSearch}
              onChange={(e) => setPaletteSearch(e.target.value)}
              className="w-full pl-6 pr-2 py-1.5 text-[10px] bg-bg-base border border-border-muted rounded focus:outline-none focus:border-accent-primary/50 text-text-default placeholder:text-text-faint"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {abilitiesLoading && (
            <div className="flex justify-center py-4">
              <Loader2 size={14} className="animate-spin text-text-faint" />
            </div>
          )}
          {Object.entries(groupedAbilities).map(([kind, abilities]) => (
            <div key={kind} className="mb-2">
              <div className="px-3 py-1 text-[9px] uppercase tracking-widest text-text-faint">
                {kind}
              </div>
              {abilities.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleAddFromPalette(a)}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-bg-hover transition text-[11px] text-text-default"
                >
                  <GripVertical
                    size={10}
                    className="text-text-faint shrink-0"
                  />
                  <span className="truncate">{a.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Center — Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-border-default flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="xs" onClick={handleCancel}>
            <ArrowLeft size={12} />
            Back
          </Button>
          <div className="flex-1" />
          <Button
            size="xs"
            onClick={() => setShowSaveDialog(true)}
            disabled={nodes.length === 0}
            className="bg-accent-primary text-white hover:bg-accent-primary/80"
          >
            <Save size={12} />
            Save as Ability
          </Button>
        </div>

        {/* React Flow canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            fitView
            className="bg-bg-base"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="#1e2a3a"
            />
            <Controls className="!bg-bg-raised !border-border-muted !shadow-none [&_button]:!bg-bg-raised [&_button]:!border-border-muted [&_button]:!text-text-muted" />
            <MiniMap className="!bg-bg-raised !border-border-muted" />
          </ReactFlow>
        </div>
      </div>

      {/* Right — Inspector */}
      <div className="w-64 border-l border-border-default flex flex-col overflow-hidden shrink-0">
        <div className="px-3 py-3 border-b border-border-default">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Inspector
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {selectedData ? (
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] text-text-faint">Node</Label>
                <div className="text-xs text-text-primary font-medium">
                  {selectedData.label}
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-text-faint">Ability</Label>
                <Badge
                  variant="outline"
                  className="text-[10px] mt-1 bg-bg-base border-border-muted text-text-muted"
                >
                  {selectedData.abilityId}
                </Badge>
              </div>
              <div>
                <Label className="text-[10px] text-text-faint">Kind</Label>
                <div className="text-[11px] text-text-muted">
                  {selectedData.kind}
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-text-faint">Status</Label>
                <div className="text-[11px] text-text-muted">
                  {selectedData.status ?? 'pending'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-text-faint text-center py-8">
              Click a node to inspect
            </div>
          )}
        </div>
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-raised border border-border-default rounded-lg p-5 w-96 space-y-3">
            <h3 className="text-sm font-bold text-text-primary">
              Save as Workflow Ability
            </h3>
            <div>
              <Label className="text-[10px] text-text-muted">Name</Label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="My Workflow"
                className="text-xs h-8"
              />
            </div>
            <div>
              <Label className="text-[10px] text-text-muted">Description</Label>
              <textarea
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="What does this workflow do?"
                className="w-full text-xs px-3 py-2 bg-bg-base border border-border-muted rounded resize-none h-16 focus:outline-none focus:border-accent-primary/50 text-text-default"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                size="xs"
                onClick={handleSave}
                disabled={!saveName || createAbility.isPending}
                className="bg-accent-primary text-white hover:bg-accent-primary/80"
              >
                {createAbility.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
}
