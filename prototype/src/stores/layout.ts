import { create } from 'zustand';

type ToolbarPanel = 'projects' | 'abilities' | 'github' | 'marketplace';
type MainView = 'pipeline' | 'graph' | 'backseat' | 'ability-detail' | 'settings' | 'marketplace';
type BottomTab = 'terminal' | 'usage' | 'health' | 'browser';
export type MarketplaceCategory = 'all' | 'workflow' | 'agent-config' | 'template' | 'mcp-adapter';

interface CollapsedPanels {
  leftSidebar: boolean;
  rightSidebar: boolean;
  bottomPanel: boolean;
}

interface LayoutState {
  activeToolbar: ToolbarPanel;
  activeMain: MainView;
  activeTab: BottomTab;
  activeAbilityId: string | null;
  collapsedPanels: CollapsedPanels;
  marketplaceCategory: MarketplaceCategory;

  setActiveToolbar: (panel: ToolbarPanel) => void;
  setActiveMain: (view: MainView) => void;
  setActiveTab: (tab: BottomTab) => void;
  setActiveAbilityId: (id: string | null) => void;
  togglePanel: (panel: keyof CollapsedPanels) => void;
  setCollapsedPanel: (panel: keyof CollapsedPanels, collapsed: boolean) => void;
  setMarketplaceCategory: (category: MarketplaceCategory) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  activeToolbar: 'projects',
  activeMain: 'pipeline',
  activeTab: 'terminal',
  activeAbilityId: null,
  collapsedPanels: {
    leftSidebar: false,
    rightSidebar: false,
    bottomPanel: false,
  },
  marketplaceCategory: 'all',

  setActiveToolbar: (panel) => set({ activeToolbar: panel }),
  setActiveMain: (view) => set({ activeMain: view }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveAbilityId: (id) => set({ activeAbilityId: id }),
  setMarketplaceCategory: (category) => set({ marketplaceCategory: category }),
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
