import { create } from 'zustand';
import { Project, Topic, Session } from '../database/types.js';
import { MyceliumLink, DecisionConflict, BlastRadiusResult, TroubledBranch } from '../database/hydra.js';

interface ForestState {
  projects: Project[];
  topics: Record<string, Topic[]>;
  sessions: Record<string, Session[]>;
  myceliumLinks: MyceliumLink[];
  decisionConflicts: DecisionConflict[];
  knownPackages: { name: string; projectCount: number }[];
  troubledBranches: TroubledBranch[];
  
  selectedProjectId: string | null;
  selectedProjectIds: string[];
  selectedTopicId: string | null;
  selectedSessionId: string | null;
  
  isProjectSelectorOpen: boolean;
  setProjectSelectorOpen: (open: boolean) => void;
  toggleProjectSelected: (id: string) => void;
  selectAllProjects: () => void;
  deselectAllProjects: () => void;
  
  isLive: boolean;
  isTodayMode: boolean;
  isCinematicMode: boolean;
  isShareableMode: boolean;
  isMyceliumVisible: boolean;

  // Superpower 1: Blast Radius
  activeBlastRadius: BlastRadiusResult | null;
  isBlastRadiusModalOpen: boolean;

  // Superpower 2: Subterranean Root Cavern View
  isSubterraneanMode: boolean;

  // Superpower 3: Universal Cmd+K Search Palette
  isSearchOpen: boolean;

  // Superpower 5: HydraDB Graph Traversal Explorer
  isGraphExplorerOpen: boolean;
  setGraphExplorerOpen: (open: boolean) => void;

  // Superpower 4: "Tend the Garden" Refactor Agent
  isGardenTenderOpen: boolean;
  selectedTroubledTopic: TroubledBranch | null;

  // Time-Travel Timeline State
  timelineDate: string | null;
  timelineMinDate: string | null;
  timelineMaxDate: string | null;
  isPlayingTimeline: boolean;
  timelineSpeed: number;
  
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

  // Superpowers Actions
  setBlastRadiusModalOpen: (open: boolean) => void;
  triggerBlastRadius: (packageName: string) => Promise<void>;
  clearBlastRadius: () => void;

  setSubterraneanMode: (val: boolean) => void;
  toggleSubterraneanMode: () => void;

  setSearchOpen: (open: boolean) => void;

  setGardenTenderOpen: (open: boolean) => void;
  selectTroubledBranch: (branch: TroubledBranch | null) => void;
  healBranch: (topicId: string) => Promise<{ diagnosis: string; suggestedFix: string }>;

  // Timeline Actions
  setTimelineDate: (date: string | null) => void;
  togglePlayTimeline: () => void;
  setTimelineSpeed: (speed: number) => void;
  stepTimeline: () => void;
  
  triggerGrowthEvent: (event: any) => void;
  clearGrowthEvent: () => void;

  fetchSettings: () => Promise<void>;
  saveSettings: (settings: any) => Promise<void>;
}

export const useForestStore = create<ForestState>((set, get) => ({
  projects: [],
  topics: {},
  sessions: {},
  myceliumLinks: [],
  decisionConflicts: [],
  knownPackages: [],
  troubledBranches: [],

  selectedProjectId: null,
  selectedProjectIds: [],
  selectedTopicId: null,
  selectedSessionId: null,
  isProjectSelectorOpen: false,
  setProjectSelectorOpen: (open) => set({ isProjectSelectorOpen: open }),
  toggleProjectSelected: (id) => set(state => {
    const exists = state.selectedProjectIds.includes(id);
    const newSelected = exists
      ? state.selectedProjectIds.filter(pId => pId !== id)
      : [...state.selectedProjectIds, id];
    return { selectedProjectIds: newSelected };
  }),
  selectAllProjects: () => set(state => ({
    selectedProjectIds: state.projects.map(p => p.id)
  })),
  deselectAllProjects: () => set({ selectedProjectIds: [] }),
  
  isLive: true,
  isTodayMode: false,
  isCinematicMode: false,
  isShareableMode: false,
  isMyceliumVisible: true,

  activeBlastRadius: null,
  isBlastRadiusModalOpen: false,

  isSubterraneanMode: false,
  isSearchOpen: false,

  isGraphExplorerOpen: false,
  setGraphExplorerOpen: (open) => set({ isGraphExplorerOpen: open }),

  isGardenTenderOpen: false,
  selectedTroubledTopic: null,

  timelineDate: null,
  timelineMinDate: null,
  timelineMaxDate: null,
  isPlayingTimeline: false,
  timelineSpeed: 1,
  
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
        const projects = data.projects || [];
        const topics = data.topics || {};
        const sessions = data.sessions || {};
        const myceliumLinks = data.myceliumLinks || [];
        const decisionConflicts = data.decisionConflicts || [];
        const troubledBranches = data.troubledBranches || [];
        const knownPackages = data.knownPackages || [];

        const allDates: string[] = [];
        Object.values(sessions).forEach((sList: any) => {
          sList.forEach((s: any) => {
            if (s.startedAt) allDates.push(s.startedAt.split('T')[0]);
          });
        });
        allDates.sort();

        const timelineMinDate = allDates.length > 0 ? allDates[0] : null;
        const timelineMaxDate = allDates.length > 0 ? allDates[allDates.length - 1] : null;

        const currentSelected = get().selectedProjectIds;
        const allProjectIds = projects.map((p: any) => p.id);
        const newSelected = currentSelected.length === 0
          ? allProjectIds
          : Array.from(new Set([...currentSelected, ...allProjectIds]));

        set({ 
          projects,
          topics,
          sessions,
          myceliumLinks,
          decisionConflicts,
          troubledBranches,
          knownPackages,
          timelineMinDate,
          timelineMaxDate,
          selectedProjectIds: newSelected
        });
      }
    } catch (e) {
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

  setBlastRadiusModalOpen: (open) => set({ isBlastRadiusModalOpen: open }),
  triggerBlastRadius: async (packageName) => {
    try {
      const res = await fetch('/api/blast-radius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName })
      });
      const data = await res.json();
      set({ activeBlastRadius: data });
    } catch (e) {}
  },
  clearBlastRadius: () => set({ activeBlastRadius: null }),

  setSubterraneanMode: (val) => set({ isSubterraneanMode: val }),
  toggleSubterraneanMode: () => set(state => ({ isSubterraneanMode: !state.isSubterraneanMode })),

  setSearchOpen: (open) => set({ isSearchOpen: open }),

  setGardenTenderOpen: (open) => set({ isGardenTenderOpen: open }),
  selectTroubledBranch: (branch) => set({ selectedTroubledTopic: branch, isGardenTenderOpen: !!branch }),
  healBranch: async (topicId) => {
    try {
      const res = await fetch('/api/heal-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId })
      });
      const data = await res.json();
      // Remove from troubled branches list
      set(state => ({
        troubledBranches: state.troubledBranches.filter(b => b.topicId !== topicId)
      }));
      return data;
    } catch (e) {
      return { diagnosis: 'Error healing branch.', suggestedFix: 'Inspect logs manually.' };
    }
  },

  setTimelineDate: (date) => set({ timelineDate: date }),
  togglePlayTimeline: () => set(state => ({ isPlayingTimeline: !state.isPlayingTimeline })),
  setTimelineSpeed: (speed) => set({ timelineSpeed: speed }),
  stepTimeline: () => {
    const { timelineDate, timelineMinDate, timelineMaxDate } = get();
    if (!timelineMinDate || !timelineMaxDate) return;

    const current = new Date(timelineDate || timelineMinDate);
    const max = new Date(timelineMaxDate);
    
    current.setDate(current.getDate() + 1);
    if (current > max) {
      set({ isPlayingTimeline: false, timelineDate: timelineMaxDate });
    } else {
      set({ timelineDate: current.toISOString().split('T')[0] });
    }
  },
  
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
