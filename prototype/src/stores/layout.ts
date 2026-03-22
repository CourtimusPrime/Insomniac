import { create } from 'zustand';

type ToolbarPanel = 'projects' | 'abilities' | 'github' | 'marketplace';
type MainView = 'pipeline' | 'graph' | 'backseat' | 'ability-detail';
type BottomTab = 'terminal' | 'usage' | 'health' | 'browser';

interface CollapsedPanels {
  leftSidebar: boolean;
  rightSidebar: boolean;
  bottomPanel: boolean;
}

interface LayoutState {
  activeToolbar: ToolbarPanel;
  activeMain: MainView;
  activeTab: BottomTab;
  collapsedPanels: CollapsedPanels;

  setActiveToolbar: (panel: ToolbarPanel) => void;
  setActiveMain: (view: MainView) => void;
  setActiveTab: (tab: BottomTab) => void;
  togglePanel: (panel: keyof CollapsedPanels) => void;
  setCollapsedPanel: (panel: keyof CollapsedPanels, collapsed: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  activeToolbar: 'projects',
  activeMain: 'pipeline',
  activeTab: 'terminal',
  collapsedPanels: {
    leftSidebar: false,
    rightSidebar: false,
    bottomPanel: false,
  },

  setActiveToolbar: (panel) => set({ activeToolbar: panel }),
  setActiveMain: (view) => set({ activeMain: view }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  togglePanel: (panel) =>
    set((state) => ({
      collapsedPanels: {
        ...state.collapsedPanels,
        [panel]: !state.collapsedPanels[panel],
      },
    })),
  setCollapsedPanel: (panel, collapsed) =>
    set((state) => ({
      collapsedPanels: {
        ...state.collapsedPanels,
        [panel]: collapsed,
      },
    })),
}));
