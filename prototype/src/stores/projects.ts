import { create } from 'zustand';

interface ProjectsState {
  activeProject: string;
  setActiveProject: (name: string) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  activeProject: 'Aether-OS',
  setActiveProject: (name) => set({ activeProject: name }),
}));
