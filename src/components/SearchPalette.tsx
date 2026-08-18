import React, { useState, useEffect, useMemo } from 'react';
import { useForestStore } from '../store/forestStore.js';
import { Search, FolderTree, GitBranch, Leaf, Package, X, ArrowRight } from 'lucide-react';

export const SearchPalette: React.FC = () => {
  const {
    isSearchOpen,
    setSearchOpen,
    projects,
    topics,
    sessions,
    knownPackages,
    selectProject,
    selectTopic,
    selectSession
  } = useForestStore();

  const [query, setQuery] = useState('');

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  // Aggregate and filter results
  const results = useMemo(() => {
    if (!query.trim()) {
      return {
        matchedProjects: projects.slice(0, 4),
        matchedSessions: [],
        matchedTopics: [],
        matchedPackages: knownPackages.slice(0, 4)
      };
    }

    const q = query.toLowerCase();

    // 1. Projects
    const matchedProjects = projects.filter(p => 
      p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)
    ).slice(0, 5);

    // 2. Topics
    const allTopics: Array<{ id: string; name: string; projectId: string; projectName: string }> = [];
    Object.entries(topics).forEach(([pId, tList]) => {
      const proj = projects.find(p => p.id === pId);
      tList.forEach(t => {
        allTopics.push({ id: t.id, name: t.name, projectId: pId, projectName: proj?.name || 'Project' });
      });
    });
    const matchedTopics = allTopics.filter(t => t.name.toLowerCase().includes(q)).slice(0, 5);

    // 3. Sessions
    const allSessionsList: Array<{ id: string; title: string; projectId: string; intent: string; provider: string }> = [];
    Object.entries(sessions).forEach(([pId, sList]) => {
      sList.forEach(s => {
        allSessionsList.push({
          id: s.id,
          title: s.title || 'Session',
          projectId: pId,
          intent: s.intent || 'feature',
          provider: s.provider || 'claude'
        });
      });
    });
    const matchedSessions = allSessionsList.filter(s => 
      s.title.toLowerCase().includes(q) || s.intent.toLowerCase().includes(q) || s.provider.toLowerCase().includes(q)
    ).slice(0, 6);

    // 4. Packages
    const matchedPackages = knownPackages.filter(pkg => pkg.name.toLowerCase().includes(q)).slice(0, 4);

    return { matchedProjects, matchedSessions, matchedTopics, matchedPackages };
  }, [query, projects, topics, sessions, knownPackages]);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-md pointer-events-auto">
      <div className="w-full max-w-xl glass-panel rounded-2xl border border-forest-moss/40 shadow-2xl overflow-hidden animate-fade-in flex flex-col">
        
        {/* Search input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-forest-moss/20 bg-black/40">
          <Search size={16} className="text-forest-gold" />
          <input
            type="text"
            autoFocus
            placeholder="Search projects, sessions, themes, packages... (ESC to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-sm text-forest-glow placeholder-forest-leaf/50 font-mono"
          />
          <button onClick={() => setSearchOpen(false)} className="text-forest-leaf hover:text-forest-glow">
            <X size={16} />
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto p-3 flex flex-col gap-3">
          
          {/* Projects */}
          {results.matchedProjects.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-forest-leaf px-2 flex items-center gap-1.5">
                <FolderTree size={11} />
                Project Trees
              </span>
              {results.matchedProjects.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    selectProject(p.id);
                    setSearchOpen(false);
                  }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-forest-moss/40 cursor-pointer text-xs transition-colors group"
                >
                  <span className="text-forest-glow font-medium">🌲 {p.name}</span>
                  <span className="text-[10px] text-forest-leaf font-mono flex items-center gap-1 group-hover:text-forest-gold">
                    Fly to Tree <ArrowRight size={10} />
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Topics / Branches */}
          {results.matchedTopics.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-forest-leaf px-2 flex items-center gap-1.5">
                <GitBranch size={11} />
                Branches (Themes)
              </span>
              {results.matchedTopics.map(t => (
                <div
                  key={t.id}
                  onClick={() => {
                    selectProject(t.projectId);
                    selectTopic(t.id);
                    setSearchOpen(false);
                  }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-forest-moss/40 cursor-pointer text-xs transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-forest-sage font-medium">{t.name}</span>
                    <span className="text-[10px] text-forest-leaf font-mono opacity-80">in {t.projectName}</span>
                  </div>
                  <span className="text-[10px] text-forest-leaf font-mono flex items-center gap-1 group-hover:text-forest-gold">
                    Zoom Branch <ArrowRight size={10} />
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Sessions */}
          {results.matchedSessions.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-forest-leaf px-2 flex items-center gap-1.5">
                <Leaf size={11} />
                Session Leaves
              </span>
              {results.matchedSessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => {
                    selectProject(s.projectId);
                    selectSession(s.id);
                    setSearchOpen(false);
                  }}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-forest-moss/40 cursor-pointer text-xs transition-colors group"
                >
                  <div className="flex flex-col">
                    <span className="text-forest-sage font-medium truncate max-w-sm">{s.title}</span>
                    <span className="text-[9px] font-mono text-forest-leaf">{s.provider} • {s.intent}</span>
                  </div>
                  <span className="text-[10px] text-forest-leaf font-mono flex items-center gap-1 group-hover:text-forest-gold">
                    Inspect Leaf <ArrowRight size={10} />
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Packages */}
          {results.matchedPackages.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-forest-leaf px-2 flex items-center gap-1.5">
                <Package size={11} />
                Packages & Dependencies
              </span>
              <div className="flex flex-wrap gap-1.5 px-2">
                {results.matchedPackages.map(pkg => (
                  <span
                    key={pkg.name}
                    className="px-2 py-0.5 rounded bg-black/40 text-[10px] font-mono text-forest-sage border border-forest-moss/20"
                  >
                    {pkg.name} ({pkg.projectCount} repos)
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-black/40 border-t border-forest-moss/20 flex justify-between items-center text-[10px] font-mono text-forest-leaf">
          <span>Navigate with mouse or arrow keys</span>
          <span>Press <kbd className="px-1 py-0.5 bg-forest-moss/40 rounded text-forest-glow">ESC</kbd> to close</span>
        </div>

      </div>
    </div>
  );
};
