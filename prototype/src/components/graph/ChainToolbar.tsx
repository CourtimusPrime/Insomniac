import { Plus, LayoutGrid, Trash2, Download } from 'lucide-react';

interface ChainToolbarProps {
  onAddNode: () => void;
  onAutoLayout: () => void;
  onClearEdges: () => void;
  onExportJSON: () => void;
}

const btnClass =
  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-text-primary border transition-colors hover:bg-white/5';

export function ChainToolbar({
  onAddNode,
  onAutoLayout,
  onClearEdges,
  onExportJSON,
}: ChainToolbarProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
      style={{ borderColor: '#1e2a3a', background: '#0d1117' }}
    >
      <button className={btnClass} style={{ borderColor: '#1e2a3a' }} onClick={onAddNode}>
        <Plus size={13} />
        Add node
      </button>
      <button className={btnClass} style={{ borderColor: '#1e2a3a' }} onClick={onAutoLayout}>
        <LayoutGrid size={13} />
        Auto-layout
      </button>
      <button className={btnClass} style={{ borderColor: '#1e2a3a' }} onClick={onClearEdges}>
        <Trash2 size={13} />
        Clear edges
      </button>

      {/* Spacer pushes Export to right */}
      <div className="flex-1" />

      <button className={btnClass} style={{ borderColor: '#1e2a3a' }} onClick={onExportJSON}>
        <Download size={13} />
        Export JSON
      </button>
    </div>
  );
}
