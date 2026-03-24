import { Separator } from 'react-resizable-panels';

interface ResizeHandleProps {
  direction?: 'horizontal' | 'vertical';
}

export function ResizeHandle({ direction = 'horizontal' }: ResizeHandleProps) {
  const isVertical = direction === 'vertical';

  return (
    <Separator
      className={`group relative flex items-center justify-center bg-transparent ${
        isVertical
          ? 'h-[3px] cursor-row-resize'
          : 'w-[3px] cursor-col-resize'
      }`}
      style={
        isVertical
          ? { flexBasis: '3px', flexGrow: 0, flexShrink: 0 }
          : { flexBasis: '3px', flexGrow: 0, flexShrink: 0 }
      }
    >
      <div
        className={`${
          isVertical ? 'h-px w-full' : 'w-px h-full'
        } bg-border-default group-hover:bg-accent-primary group-[[data-separator-active]]:bg-accent-primary transition-colors`}
      />
    </Separator>
  );
}
