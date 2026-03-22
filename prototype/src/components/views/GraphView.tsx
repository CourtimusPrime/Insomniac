import { Cpu } from 'lucide-react';

export function GraphView() {
  return (
    <div className="p-5 h-full flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center mx-auto">
          <Cpu size={20} className="text-accent-primary" />
        </div>
        <div className="text-sm text-text-primary font-medium font-heading">Agent Chain Editor</div>
        <div className="text-xs text-text-muted max-w-xs">
          Visual ReactFlow canvas for building and connecting agent pipelines. Drag agents, assign Abilities, define conditions.
        </div>
        <button className="px-4 py-2 text-xs bg-accent-primary/15 hover:bg-accent-primary/25 text-accent-primary border border-accent-primary/30 rounded-lg transition">
          Open chain editor
        </button>
      </div>
    </div>
  );
}
