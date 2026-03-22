import { create } from 'zustand';

interface Project {
  name: string;
  status: string;
  lang: string;
  agents: number;
}

interface ProjectsState {
  projects: Project[];
  activeProject: string;

  setProjects: (projects: Project[]) => void;
  setActiveProject: (name: string) => void;
}

export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [
    { name: 'Aether-OS', status: 'building', lang: 'Rust', agents: 3 },
    { name: 'Nova-Protocol', status: 'idle', lang: 'TypeScript', agents: 0 },
    { name: 'Lumina-API', status: 'error', lang: 'Python', agents: 1 },
    { name: 'Void-Shell', status: 'completed', lang: 'Go', agents: 0 },
  ],
  activeProject: 'Aether-OS',

  setProjects: (projects) => set({ projects }),
  setActiveProject: (name) => set({ activeProject: name }),
}));
