import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { useState } from 'react';

/* ── edge-condition colour map ── */
export const edgeColors: Record<string, string> = {
  always: '#374151',
  'on-success': '#10b981',
  'on-failure': '#ef4444',
  'on-decision': '#f59e0b',
};

export type CustomEdgeData = {
  condition?: keyof typeof edgeColors;
};

type CustomEdgeType = Edge<CustomEdgeData>;

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}: EdgeProps<CustomEdgeType>) {
  const { deleteElements } = useReactFlow();
  const [hovered, setHovered] = useState(false);

  const condition = data?.condition ?? 'always';
  const color = edgeColors[condition] ?? edgeColors.always;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      {/* Invisible wider path for easier hover/click */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.5,
          transition: 'stroke 0.15s, stroke-width 0.15s',
        }}
      />
      {/* Delete button at edge midpoint on hover */}
      {(hovered || selected) && (
        <EdgeLabelRenderer>
          <button
            className="nodrag nopan absolute flex items-center justify-center w-5 h-5 rounded-full bg-red-500/90 text-white hover:bg-red-600 transition-colors shadow-md"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            onClick={(e) => {
              e.stopPropagation();
              deleteElements({ edges: [{ id }] });
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title="Delete edge"
          >
            <X size={10} />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
