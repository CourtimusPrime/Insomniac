import { create } from 'zustand';

type ToolbarPanel = 'projects' | 'abilities' | 'github' | 'marketplace';
type MainView =
  | 'pipeline'
  | 'graph'
  | 'backseat'
  | 'ability-detail'
  | 'agent-builder'
  | 'workflow-builder'
  | 'settings'
  | 'marketplace';
type BottomTab =
  | 'terminal'
  | 'usage'
  | 'health'
  | 'browser'
  | 'files'
  | 'shell';
export type MarketplaceCategory =
  | 'all'
  | 'workflow'
  | 'agent-config'
  | 'template'
  | 'mcp-adapter';

const PINNED_THEMES_KEY = 'insomniac-pinned-themes';
const MAX_PINNED = 4;

function loadPinnedThemes(): string[] {
  try {
    const saved = localStorage.getItem(PINNED_THEMES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.slice(0, MAX_PINNED);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function savePinnedThemes(ids: string[]) {
  localStorage.setItem(PINNED_THEMES_KEY, JSON.stringify(ids));
}

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
  editingAbilityId: string | null;
  collapsedPanels: CollapsedPanels;
  marketplaceCategory: MarketplaceCategory;
  pinnedThemes: string[];

  setActiveToolbar: (panel: ToolbarPanel) => void;
  setActiveMain: (view: MainView) => void;
  setActiveTab: (tab: BottomTab) => void;
  setActiveAbilityId: (id: string | null) => void;
  setEditingAbilityId: (id: string | null) => void;
  togglePanel: (panel: keyof CollapsedPanels) => void;
  setCollapsedPanel: (panel: keyof CollapsedPanels, collapsed: boolean) => void;
  setMarketplaceCategory: (category: MarketplaceCategory) => void;
  pinTheme: (id: string) => void;
  unpinTheme: (id: string) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  activeToolbar: 'projects',
  activeMain: 'pipeline',
  activeTab: 'terminal',
  activeAbilityId: null,
  editingAbilityId: null,
  collapsedPanels: {
    leftSidebar: false,
    rightSidebar: false,
    bottomPanel: false,
  },
  marketplaceCategory: 'all',
  pinnedThemes: loadPinnedThemes(),

  setActiveToolbar: (panel) => set({ activeToolbar: panel }),
  setActiveMain: (view) => set({ activeMain: view }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveAbilityId: (id) => set({ activeAbilityId: id }),
  setEditingAbilityId: (id) => set({ editingAbilityId: id }),
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
  pinTheme: (id) =>
    set((state) => {
      if (
        state.pinnedThemes.includes(id) ||
        state.pinnedThemes.length >= MAX_PINNED
      )
        return state;
      const next = [...state.pinnedThemes, id];
      savePinnedThemes(next);
      return { pinnedThemes: next };
    }),
  unpinTheme: (id) =>
    set((state) => {
      const next = state.pinnedThemes.filter((t) => t !== id);
      savePinnedThemes(next);
      return { pinnedThemes: next };
    }),
}));
