import { create } from 'zustand';

interface ProjectsState {
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),
}));
