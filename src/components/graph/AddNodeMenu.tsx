import { useEffect, useRef } from 'react';

/* ── Node type definitions ── */
const nodeTypeEntries = [
  {
    type: 'trigger',
    label: 'Trigger',
    color: '#06b6d4',
    description: 'Starts the chain execution',
  },
  {
    type: 'prototyper',
    label: 'Prototyper',
    color: '#8b5cf6',
    description: 'Generates initial implementation',
  },
  {
    type: 'builder',
    label: 'Builder',
    color: '#6366f1',
    description: 'Builds and compiles code',
  },
  {
    type: 'tester',
    label: 'Tester',
    color: '#10b981',
    description: 'Runs tests and validates',
  },
  {
    type: 'reviewer',
    label: 'Reviewer',
    color: '#f59e0b',
    description: 'Reviews code quality',
  },
  {
    type: 'auditor',
    label: 'Auditor',
    color: '#ef4444',
    description: 'Security and compliance audit',
  },
] as const;

export type NodeTypeEntry = (typeof nodeTypeEntries)[number];
export { nodeTypeEntries };

interface AddNodeMenuProps {
  position: { x: number; y: number };
  onSelect: (nodeType: string, label: string) => void;
  onClose: () => void;
}

export function AddNodeMenu({ position, onSelect, onClose }: AddNodeMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
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
    <div
      ref={ref}
      className="absolute z-50 w-56 rounded-lg border shadow-xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        background: '#111827',
        borderColor: '#1e2a3a',
      }}
    >
      <div className="px-3 py-2 border-b" style={{ borderColor: '#1e2a3a' }}>
        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          Add Node
        </div>
      </div>
      <div className="py-1">
        {nodeTypeEntries.map((entry) => (
          <button
            key={entry.type}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
            onClick={() => onSelect(entry.type, entry.label)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: entry.color }}
            />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-text-primary leading-tight">
                {entry.label}
              </div>
              <div className="text-[10px] text-text-muted leading-tight mt-0.5">
                {entry.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
