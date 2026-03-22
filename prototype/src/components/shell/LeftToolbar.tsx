import { Layers, Github, Zap, Store, Settings } from 'lucide-react';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { useLayoutStore } from '../../stores/layout';

const toolbarItems = [
  { id: 'projects' as const, icon: <Layers size={18} />, label: 'Projects' },
  { id: 'abilities' as const, icon: <Zap size={18} />, label: 'Abilities' },
  { id: 'github' as const, icon: <Github size={18} />, label: 'GitHub' },
  { id: 'marketplace' as const, icon: <Store size={18} />, label: 'Marketplace' },
];

export function LeftToolbar() {
  const activeToolbar = useLayoutStore((s) => s.activeToolbar);
  const setActiveToolbar = useLayoutStore((s) => s.setActiveToolbar);
  const togglePanel = useLayoutStore((s) => s.togglePanel);
  const leftSidebarCollapsed = useLayoutStore((s) => s.collapsedPanels.leftSidebar);
  const setCollapsedPanel = useLayoutStore((s) => s.setCollapsedPanel);

  return (
    <aside className="w-14 flex flex-col items-center py-4 gap-1 bg-bg-base border-r border-border-default shrink-0">
      <div className="mb-5 p-1">
        <div className="w-7 h-7 bg-accent-primary rounded flex items-center justify-center">
          <Zap size={14} fill="white" className="text-text-primary" />
        </div>
      </div>
      {toolbarItems.map(item => (
        <button
          key={item.id}
          onClick={() => {
            if (activeToolbar === item.id) {
              togglePanel('leftSidebar');
            } else {
              setActiveToolbar(item.id);
              if (leftSidebarCollapsed) {
                setCollapsedPanel('leftSidebar', false);
              }
            }
          }}
          title={item.label}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            activeToolbar === item.id
              ? 'bg-accent-primary/15 text-accent-primary'
              : 'text-text-faint hover:text-text-default hover:bg-bg-hover'
          }`}>
          {item.icon}
        </button>
      ))}
      <div className="mt-auto flex flex-col items-center gap-1">
        <ThemeSwitcher />
        <button className="w-10 h-10 rounded-lg flex items-center justify-center text-text-faint hover:text-text-default hover:bg-bg-hover">
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
}
