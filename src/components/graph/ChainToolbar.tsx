import { Download, Layers, LayoutGrid, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChainToolbarProps {
  onAddNode: () => void;
  onAutoLayout: () => void;
  onClearEdges: () => void;
  onExportJSON: () => void;
  onLoadTemplate: () => void;
  onSaveAsTemplate: () => void;
}

export function ChainToolbar({
  onAddNode,
  onAutoLayout,
  onClearEdges,
  onExportJSON,
  onLoadTemplate,
  onSaveAsTemplate,
}: ChainToolbarProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
      style={{ borderColor: '#1e2a3a', background: '#0d1117' }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="xs" onClick={onAddNode}>
            <Plus size={13} />
            Add node
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Add a new agent node</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="xs" onClick={onLoadTemplate}>
            <Layers size={13} />
            Load template
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Load from a template</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="xs" onClick={onAutoLayout}>
            <LayoutGrid size={13} />
            Auto-layout
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Auto-arrange nodes</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="xs" onClick={onClearEdges}>
            <Trash2 size={13} />
            Clear edges
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Remove all edges</TooltipContent>
      </Tooltip>

      {/* Spacer pushes right-side actions to right */}
      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="xs" onClick={onSaveAsTemplate}>
            <Save size={13} />
            Save as template
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Save current chain as template
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="xs" onClick={onExportJSON}>
            <Download size={13} />
            Export JSON
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Export chain as JSON file</TooltipContent>
      </Tooltip>
    </div>
  );
}
