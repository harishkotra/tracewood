import React, { useState, useEffect } from 'react';
import { useForestStore } from '../store/forestStore.js';
import { SettingsModal } from './SettingsModal.js';
import { TimelineScrubber } from './TimelineScrubber.js';
import { 
  Settings, Eye, EyeOff, Calendar, Sparkles, RefreshCw, 
  GitBranch, ArrowLeft, CheckCircle2, AlertCircle, X,
  Network, AlertTriangle, Search, Layers, ShieldAlert, Wrench, Filter
} from 'lucide-react';

export const HUD: React.FC = () => {
  const {
    projects,
    topics,
    sessions,
    myceliumLinks,
    decisionConflicts,
    troubledBranches,
    isMyceliumVisible,
    isSubterraneanMode,
    selectedProjectId,
    selectedTopicId,
    selectedSessionId,
    selectProject,
    selectTopic,
    selectSession,
    isLive,
    isTodayMode,
    isCinematicMode,
    isShareableMode,
    setLive,
    setTodayMode,
    setCinematicMode,
    setShareableMode,
    setMyceliumVisible,
    toggleSubterraneanMode,
    setSearchOpen,
    setBlastRadiusModalOpen,
    setGardenTenderOpen,
    fetchProjects
  } = useForestStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dailyRecapText, setDailyRecapText] = useState<string | null>(null);
  const [showConflictsModal, setShowConflictsModal] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c') {
        setCinematicMode(!isCinematicMode);
      }
      if (e.key === 'Escape') {
        selectProject(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCinematicMode, setCinematicMode, selectProject]);

  const totalStats = React.useMemo(() => {
    let sCount = 0;
    let tokenCount = 0;
    
    projects.forEach(p => {
      const projSess = sessions[p.id] || [];
      sCount += projSess.length;
      projSess.forEach(s => {
        tokenCount += s.tokenCount || 0;
      });
    });

    return {
      projectsCount: projects.length,
      sessionsCount: sCount,
      tokenCount: (tokenCount / 1000000).toFixed(1) + 'M',
      myceliumLinksCount: myceliumLinks.length,
      conflictsCount: decisionConflicts.length
    };
  }, [projects, sessions, myceliumLinks, decisionConflicts]);

  const currentProject = projects.find(p => p.id === selectedProjectId);
  const projectSessions = selectedProjectId ? (sessions[selectedProjectId] || []) : [];
  const projectTopics = selectedProjectId ? (topics[selectedProjectId] || []) : [];
  
  const maskProjectName = (name: string) => {
    if (!isShareableMode) return name;
    const map: Record<string, string> = {
      'Tracewood': 'PROJECT_ALPHA',
      'DailyBuild': 'PROJECT_BETA',
      'AgentKit': 'PROJECT_GAMMA',
      'Website': 'PROJECT_DELTA',
      'Research': 'PROJECT_EPSILON',
      'Experiments': 'PROJECT_ZETA'
    };
    return map[name] || `PROJECT_${name.toUpperCase()}`;
  };

  const maskPath = (path: string) => {
    if (!isShareableMode) return path;
    return `~/workspace/${maskProjectName(path.split('/').pop() || 'project').toLowerCase()}`;
  };

  const getHashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  };

  const maskFile = (file: string) => {
    if (!isShareableMode) return file;
    const ext = file.split('.').pop() || 'ts';
    return `module_${Math.abs(getHashCode(file)) % 100}.${ext}`;
  };

  const triggerScan = async () => {
    setScanning(true);
    try {
      await fetch('/api/scan', { method: 'POST' });
      await fetchProjects();
    } catch (e) {}
    setScanning(false);
  };

  const loadDailyRecap = async () => {
    try {
      const res = await fetch('/api/recap', { method: 'POST' });
      const data = await res.json();
      setDailyRecapText(data.recap);
    } catch (e) {
      setDailyRecapText("Could not generate daily recap.");
    }
  };

  const selectedTopic = currentProject ? projectTopics.find(t => t.id === selectedTopicId) : null;
  const selectedSession = selectedProjectId ? projectSessions.find(s => s.id === selectedSessionId) : null;

  if (isCinematicMode) {
    return (
      <div className="absolute bottom-4 right-4 z-40">
        <button
          onClick={() => setCinematicMode(false)}
          className="px-3 py-1.5 bg-black/60 hover:bg-black/80 text-[10px] uppercase tracking-wider text-forest-sage border border-forest-moss/30 rounded backdrop-blur"
        >
          Exit Cinematic Mode (C)
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 pointer-events-none select-none flex flex-col justify-between p-6">
      
      {/* 1. TOP HUD HEADER */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-light tracking-widest text-forest-glow">TRACEWOOD</h1>
            {selectedProjectId && (
              <button
                onClick={() => selectProject(null)}
                className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 bg-black/60 hover:bg-forest-moss/60 border border-forest-moss/40 rounded text-forest-sage transition-all"
              >
                <ArrowLeft size={11} />
                Overview
              </button>
            )}
          </div>
          <span className="text-[10px] tracking-wider uppercase text-forest-leaf">
            Powered by HydraDB Context Engine
          </span>
        </div>
        
        {/* Top Right Controls & Superpower Tools */}
        <div className="flex items-center gap-2">
          
          {/* Multi-select Project Filter */}
          <button
            onClick={() => useForestStore.getState().setProjectSelectorOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-panel border border-forest-moss/30 text-forest-sage hover:text-forest-glow hover:border-forest-leaf transition-all text-xs"
            title="Select projects to visualize"
          >
            <Filter size={13} className="text-forest-gold" />
            <span className="text-[10px] font-mono text-forest-leaf">Filter Projects</span>
          </button>

          {/* Spotlight Search (Cmd+K) */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-panel border border-forest-moss/30 text-forest-sage hover:text-forest-glow hover:border-forest-leaf transition-all text-xs"
            title="Search memory, sessions, & packages (Cmd+K)"
          >
            <Search size={13} className="text-forest-gold" />
            <span className="text-[10px] font-mono text-forest-leaf">Cmd+K</span>
          </button>

          {/* Subterranean Root Cavern View */}
          <button
            onClick={toggleSubterraneanMode}
            className={`p-2 rounded-lg border transition-all ${
              isSubterraneanMode
                ? 'bg-forest-moss border-forest-fern text-forest-glow shadow-md'
                : 'glass-panel border-forest-moss/20 text-forest-sage hover:border-forest-moss/40'
            }`}
            title={isSubterraneanMode ? "Return to Forest Surface" : "Dive into Subterranean Root Cavern (HydraDB Graph)"}
          >
            <Layers size={14} />
          </button>

          {/* HydraDB Graph Traversal Explorer */}
          <button
            onClick={() => useForestStore.getState().setGraphExplorerOpen(true)}
            className="p-2 rounded-lg border glass-panel border-forest-moss/20 text-forest-sage hover:text-forest-gold hover:border-forest-gold/40 transition-all"
            title="HydraDB Graph Traversal Explorer"
          >
            <Network size={14} />
          </button>

          {/* Supply Chain Blast Radius Simulation */}
          <button
            onClick={() => setBlastRadiusModalOpen(true)}
            className="p-2 rounded-lg border glass-panel border-forest-moss/20 text-forest-sage hover:text-forest-rust hover:border-forest-rust/40 transition-all"
            title="Supply Chain & Dependency Blast Radius"
          >
            <ShieldAlert size={14} />
          </button>

          {/* Tend the Garden Refactor Agent */}
          <button
            onClick={() => setGardenTenderOpen(true)}
            className={`p-2 rounded-lg border transition-all flex items-center gap-1 ${
              troubledBranches.length > 0
                ? 'glass-panel border-forest-gold/40 text-forest-gold hover:bg-forest-moss/40'
                : 'glass-panel border-forest-moss/20 text-forest-sage hover:border-forest-moss/40'
            }`}
            title="Tend the Garden (Autonomous Refactor Agent)"
          >
            <Wrench size={14} />
            {troubledBranches.length > 0 && (
              <span className="text-[9px] font-mono text-forest-gold font-bold">{troubledBranches.length}</span>
            )}
          </button>

          {/* Mycelium Network Toggle */}
          <button
            onClick={() => setMyceliumVisible(!isMyceliumVisible)}
            className={`p-2 rounded-lg border transition-all ${
              isMyceliumVisible 
                ? 'bg-forest-moss border-forest-fern text-forest-glow shadow-md' 
                : 'glass-panel border-forest-moss/20 text-forest-sage/60 hover:border-forest-moss/40'
            }`}
            title="Toggle HydraDB Mycelium Network"
          >
            <Network size={14} />
          </button>

          {/* Decision Overwrites Alert */}
          {decisionConflicts.length > 0 && (
            <button
              onClick={() => setShowConflictsModal(true)}
              className="p-2 rounded-lg border glass-panel border-forest-gold/40 text-forest-gold hover:bg-forest-moss/40 transition-all flex items-center gap-1 text-xs"
              title="View Decision Overwrites"
            >
              <AlertTriangle size={14} />
              <span className="text-[10px] font-mono">{decisionConflicts.length}</span>
            </button>
          )}

          <button
            onClick={() => setTodayMode(!isTodayMode)}
            className={`p-2 rounded-lg border transition-all ${
              isTodayMode 
                ? 'bg-forest-moss border-forest-fern text-forest-glow' 
                : 'glass-panel border-forest-moss/20 text-forest-sage hover:border-forest-moss/40'
            }`}
            title="Toggle Today Mode"
          >
            <Calendar size={14} />
          </button>
          
          <button
            onClick={() => setShareableMode(!isShareableMode)}
            className={`p-2 rounded-lg border transition-all ${
              isShareableMode 
                ? 'bg-forest-moss border-forest-fern text-forest-glow' 
                : 'glass-panel border-forest-moss/20 text-forest-sage hover:border-forest-moss/40'
            }`}
            title="Toggle Shareable Mode (anonymizes metadata)"
          >
            {isShareableMode ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg border glass-panel border-forest-moss/20 text-forest-sage hover:border-forest-moss/40 transition-all"
            title="Open Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* 2. INSPECTORS PANEL (Left side) */}
      <div className="flex-grow flex items-center justify-between pointer-events-none py-4">
        <div className="flex flex-col gap-4 pointer-events-auto max-w-sm w-full">
          
          {/* PROJECT INSPECTOR */}
          {selectedProjectId && currentProject && !selectedSessionId && (
            <div className="glass-panel p-5 rounded-xl flex flex-col gap-4 shadow-2xl animate-fade-in border border-forest-moss/30">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <h2 className="text-sm font-semibold tracking-wider text-forest-glow uppercase">
                    {maskProjectName(currentProject.name)}
                  </h2>
                  <span className="text-[10px] text-forest-leaf font-mono mt-0.5">
                    {maskPath(currentProject.path)}
                  </span>
                </div>
                <button onClick={() => selectProject(null)} className="text-forest-leaf hover:text-forest-glow">
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 border-y border-forest-moss/15 py-3 text-center">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-forest-sage">{projectSessions.length}</span>
                  <span className="text-[9px] uppercase tracking-wider text-forest-leaf font-mono">Sessions</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-forest-sage">
                    {projectSessions.reduce((acc, s) => acc + s.toolCallCount, 0)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-forest-leaf font-mono">Tool Calls</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-forest-sage">
                    {(projectSessions.reduce((acc, s) => acc + (s.tokenCount || 0), 0) / 1000).toFixed(0)}k
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-forest-leaf font-mono">Tokens</span>
                </div>
              </div>

              {/* Clickable Branches (Themes / Topics) */}
              {projectTopics.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-forest-leaf flex items-center gap-1">
                    <GitBranch size={10} />
                    Tree Branches (Development Themes)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {projectTopics.map(t => (
                      <button
                        key={t.id}
                        onClick={() => selectTopic(selectedTopicId === t.id ? null : t.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                          selectedTopicId === t.id
                            ? 'bg-forest-fern text-forest-glow font-bold scale-105 border border-forest-leaf'
                            : 'bg-black/40 hover:bg-forest-moss/50 text-forest-sage border border-forest-moss/20'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sessions list */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-forest-leaf">
                  Session Leaves ({selectedTopic ? `${selectedTopic.name}` : 'All'})
                </span>
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                  {projectSessions
                    .filter(s => !selectedTopicId || s.topicId === selectedTopicId)
                    .map(s => (
                      <div
                        key={s.id}
                        onClick={() => selectSession(s.id)}
                        className="p-1.5 rounded bg-black/30 hover:bg-forest-moss/40 border border-forest-moss/10 cursor-pointer flex justify-between items-center text-xs transition-colors"
                      >
                        <span className="truncate max-w-[200px] text-forest-sage">{s.title}</span>
                        <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                          s.outcome === 'success' ? 'text-forest-fern' : 'text-forest-rust'
                        }`}>
                          {s.intent}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* LLM summary */}
              <div className="text-xs italic text-forest-sage/90 leading-relaxed bg-black/20 p-2.5 rounded border border-forest-moss/10">
                "Most of your work in this repo centered on {
                  selectedTopic ? selectedTopic.name : (
                    projectSessions.length > 0 
                      ? projectSessions[0].topics.slice(0, 2).join(', ') 
                      : 'application logic'
                  )
                }."
              </div>
            </div>
          )}

          {/* SESSION INSPECTOR */}
          {selectedSessionId && selectedSession && (
            <div className="glass-panel p-5 rounded-xl flex flex-col gap-4 shadow-2xl animate-fade-in border border-forest-moss/30">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-forest-leaf">
                    {selectedSession.provider} session
                  </span>
                  <h2 className="text-xs font-bold tracking-wide text-forest-glow mt-0.5">
                    {selectedSession.title}
                  </h2>
                </div>
                <button onClick={() => selectSession(null)} className="text-forest-leaf hover:text-forest-glow">
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-2 border-y border-forest-moss/15 py-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-forest-leaf">Intent</span>
                  <span className="capitalize text-forest-sage font-semibold">{selectedSession.intent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forest-leaf">Outcome</span>
                  <span className="flex items-center gap-1">
                    {selectedSession.outcome === 'success' ? (
                      <CheckCircle2 size={12} className="text-forest-fern" />
                    ) : (
                      <AlertCircle size={12} className="text-forest-rust" />
                    )}
                    <span className="capitalize text-forest-sage font-semibold">{selectedSession.outcome}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forest-leaf">Tool calls</span>
                  <span className="text-forest-sage font-mono font-semibold">{selectedSession.toolCallCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-forest-leaf">Modified Files</span>
                  <span className="text-forest-sage font-semibold">{selectedSession.filesChanged.length}</span>
                </div>
              </div>

              {/* AI Summary block */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-forest-leaf">AI Summary</span>
                <p className="text-xs text-forest-sage leading-relaxed bg-black/25 p-2.5 rounded border border-forest-moss/10">
                  {selectedSession.summary || 'Analyzing session logs...'}
                </p>
              </div>

              {/* Files changed list */}
              {selectedSession.filesChanged.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-forest-leaf">Changed Files</span>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {selectedSession.filesChanged.map(f => (
                      <span key={f} className="text-[10px] font-mono bg-black/20 px-1.5 py-0.5 rounded text-forest-leaf border border-forest-moss/10">
                        {maskFile(f)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* 3. TIMELINE TIME-TRAVEL SCRUBBER */}
      <div className="w-full pb-3 pointer-events-auto">
        <TimelineScrubber />
      </div>

      {/* 4. BOTTOM STATS & CONTROLS */}
      <div className="flex justify-between items-end pointer-events-auto">
        <div className="flex gap-4 text-xs font-mono text-forest-leaf glass-panel px-4 py-2 rounded-lg border border-forest-moss/20">
          <div>
            <span className="text-forest-sage font-semibold">{totalStats.projectsCount}</span> projects
          </div>
          <div className="border-l border-forest-moss/30 h-4" />
          <div>
            <span className="text-forest-sage font-semibold">{totalStats.sessionsCount}</span> sessions
          </div>
          <div className="border-l border-forest-moss/30 h-4" />
          <div>
            <span className="text-forest-sage font-semibold">{totalStats.myceliumLinksCount}</span> mycelium links
          </div>
        </div>

        {/* Built By Harish Kotra & DailyBuild */}
        <div className="text-[10px] font-mono text-forest-leaf/70 hover:text-forest-leaf transition-colors hidden lg:block glass-panel px-3 py-1.5 rounded-lg border border-forest-moss/20">
          Built with 🌲 by{' '}
          <a
            href="https://harishkotra.me"
            target="_blank"
            rel="noopener noreferrer"
            className="text-forest-sage hover:text-forest-glow underline underline-offset-2 transition-colors"
          >
            Harish Kotra
          </a>
          {' • '}
          <a
            href="https://dailybuild.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-forest-sage hover:text-forest-gold underline underline-offset-2 transition-colors"
          >
            Checkout my other builds
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDailyRecap}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/50 hover:bg-black/70 text-[10px] font-mono uppercase tracking-wider text-forest-sage border border-forest-moss/20 rounded-lg backdrop-blur transition-all"
          >
            <Sparkles size={11} className="text-forest-gold animate-pulse" />
            What grew today?
          </button>

          <button
            onClick={triggerScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/50 hover:bg-black/70 text-[10px] font-mono uppercase tracking-wider text-forest-sage border border-forest-moss/20 rounded-lg backdrop-blur transition-all"
          >
            <RefreshCw size={11} className={scanning ? 'animate-spin' : ''} />
            Universal Scan
          </button>

          <div 
            onClick={() => setLive(!isLive)}
            className="flex items-center gap-2 cursor-pointer glass-panel px-4 py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest text-forest-sage border border-forest-moss/20"
          >
            <span>LIVE</span>
            <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-forest-fern live-dot' : 'bg-forest-leaf/40'}`} />
          </div>
        </div>
      </div>

      {/* 5. DECISION CONFLICTS MODAL */}
      {showConflictsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-lg glass-panel p-6 rounded-xl flex flex-col gap-4 text-forest-sage border border-forest-gold/30 shadow-2xl">
            <div className="flex justify-between items-center border-b border-forest-moss/20 pb-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-forest-gold flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-forest-gold" />
                HydraDB Decision Overwrites ({decisionConflicts.length})
              </h3>
              <button onClick={() => setShowConflictsModal(false)} className="hover:text-forest-glow">
                <X size={16} />
              </button>
            </div>
            
            <p className="text-xs text-forest-leaf">
              HydraDB tracked times where an AI coding agent revised or overwrote prior architectural decisions.
            </p>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {decisionConflicts.map(c => (
                <div key={c.id} className="p-3 bg-black/40 rounded-lg border border-forest-moss/20 flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-forest-gold">{c.agent} override</span>
                    <span className="text-[9px] font-mono text-forest-leaf">{new Date(c.timestamp).toLocaleDateString()}</span>
                  </div>
                  <span className="text-forest-sage font-medium">{c.originalDecision}</span>
                  <span className="text-[11px] text-forest-leaf italic">Override Reason: {c.newDecision}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowConflictsModal(false)}
              className="mt-2 px-4 py-1.5 bg-forest-moss hover:bg-forest-fern text-forest-glow text-xs uppercase tracking-wider border border-forest-leaf/20 rounded transition-colors self-end"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 6. DAILY RECAP MODAL */}
      {dailyRecapText && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="w-full max-w-md glass-panel p-6 rounded-xl flex flex-col gap-4 text-forest-sage border border-forest-moss/30">
            <div className="flex justify-between items-center border-b border-forest-moss/20 pb-2">
              <h3 className="text-xs font-mono uppercase tracking-wider text-forest-gold flex items-center gap-1.5">
                <Sparkles size={12} />
                Daily Forest Recap
              </h3>
              <button onClick={() => setDailyRecapText(null)} className="hover:text-forest-glow">
                <X size={16} />
              </button>
            </div>
            
            <p className="text-sm leading-relaxed whitespace-pre-line text-forest-sage italic py-2">
              {dailyRecapText}
            </p>

            <button
              onClick={() => setDailyRecapText(null)}
              className="mt-2 px-4 py-2 bg-forest-moss hover:bg-forest-fern text-forest-glow text-xs uppercase tracking-wider border border-forest-leaf/20 rounded transition-colors self-end"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* 7. CONFIG SETTINGS MODAL */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

    </div>
  );
};
