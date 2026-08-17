import { create } from 'zustand';
import { Project, Topic, Session } from '../database/types.js';
import { MyceliumLink, DecisionConflict } from '../database/hydra.js';

interface ForestState {
  projects: Project[];
  topics: Record<string, Topic[]>;
  sessions: Record<string, Session[]>;
  myceliumLinks: MyceliumLink[];
  decisionConflicts: DecisionConflict[];
  
  selectedProjectId: string | null;
  selectedTopicId: string | null;
  selectedSessionId: string | null;
  
  isLive: boolean;
  isTodayMode: boolean;
  isCinematicMode: boolean;
  isShareableMode: boolean;
  isMyceliumVisible: boolean;
  
  isLoading: boolean;
  isOnboarded: boolean;
  settings: {
    provider: string;
    model: string;
    endpoint: string;
  };
  
  growthEvent: {
    id: string;
    projectId: string;
    topicId: string;
    topicName: string;
    intent: string;
    outcome: string;
    importance: number;
  } | null;

  fetchProjects: () => Promise<void>;
  selectProject: (id: string | null) => Promise<void>;
  selectTopic: (id: string | null) => void;
  selectSession: (id: string | null) => void;
  
  setLive: (val: boolean) => void;
  setTodayMode: (val: boolean) => void;
  setCinematicMode: (val: boolean) => void;
  setShareableMode: (val: boolean) => void;
  setMyceliumVisible: (val: boolean) => void;
  setOnboarded: (val: boolean) => void;
  
  triggerGrowthEvent: (event: any) => void;
  clearGrowthEvent: () => void;

  fetchSettings: () => Promise<void>;
  saveSettings: (settings: any) => Promise<void>;
}

export const useForestStore = create<ForestState>((set, _get) => ({
  projects: [],
  topics: {},
  sessions: {},
  myceliumLinks: [],
  decisionConflicts: [],

  selectedProjectId: null,
  selectedTopicId: null,
  selectedSessionId: null,
  
  isLive: true,
  isTodayMode: false,
  isCinematicMode: false,
  isShareableMode: false,
  isMyceliumVisible: true, // Show underground mycelium graph by default
  
  isLoading: false,
  isOnboarded: true,
  settings: {
    provider: 'none',
    model: 'llama3',
    endpoint: 'http://localhost:11434'
  },
  
  growthEvent: null,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/forest');
      if (res.ok) {
        const data = await res.json();
        set({ 
          projects: data.projects || [],
          topics: data.topics || {},
          sessions: data.sessions || {},
          myceliumLinks: data.myceliumLinks || [],
          decisionConflicts: data.decisionConflicts || []
        });
      }
    } catch (e) {
      try {
        const res = await fetch('http://localhost:3001/api/forest');
        const data = await res.json();
        set({
          projects: data.projects || [],
          topics: data.topics || {},
          sessions: data.sessions || {},
          myceliumLinks: data.myceliumLinks || [],
          decisionConflicts: data.decisionConflicts || []
        });
      } catch (err) {}
    } finally {
      set({ isLoading: false });
    }
  },

  selectProject: async (id) => {
    set({ selectedProjectId: id, selectedTopicId: null, selectedSessionId: null });
    if (!id) return;

    set({ isLoading: true });
    try {
      const [topicsRes, sessionsRes] = await Promise.all([
        fetch(`/api/projects/${id}/topics`),
        fetch(`/api/projects/${id}/sessions`)
      ]);
      const topicsData = await topicsRes.json();
      const sessionsData = await sessionsRes.json();

      set(state => ({
        topics: { ...state.topics, [id]: topicsData },
        sessions: { ...state.sessions, [id]: sessionsData }
      }));
    } catch (e) {
    } finally {
      set({ isLoading: false });
    }
  },

  selectTopic: (id) => set({ selectedTopicId: id, selectedSessionId: null }),
  selectSession: (id) => set({ selectedSessionId: id }),
  
  setLive: (val) => set({ isLive: val }),
  setTodayMode: (val) => set({ isTodayMode: val }),
  setCinematicMode: (val) => set({ isCinematicMode: val }),
  setShareableMode: (val) => set({ isShareableMode: val }),
  setMyceliumVisible: (val) => set({ isMyceliumVisible: val }),
  setOnboarded: (val) => set({ isOnboarded: val }),
  
  triggerGrowthEvent: (event) => set({ growthEvent: event }),
  clearGrowthEvent: () => set({ growthEvent: null }),

  fetchSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      set({ settings: data });
    } catch (e) {}
  },

  saveSettings: async (settings) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      set({ settings });
    } catch (e) {}
  }
}));
