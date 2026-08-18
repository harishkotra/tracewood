import React, { useState } from 'react';
import { useForestStore } from '../store/forestStore.js';
import { ShieldAlert, X, Radio, Search, CheckCircle } from 'lucide-react';

export const BlastRadiusModal: React.FC = () => {
  const {
    isBlastRadiusModalOpen,
    setBlastRadiusModalOpen,
    activeBlastRadius,
    triggerBlastRadius,
    clearBlastRadius,
    knownPackages,
    projects
  } = useForestStore();

  const [query, setQuery] = useState('');

  if (!isBlastRadiusModalOpen) return null;

  const popularDefaults = knownPackages.slice(0, 10);

  const handleSimulate = (pkg: string) => {
    triggerBlastRadius(pkg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-lg glass-panel p-6 rounded-2xl flex flex-col gap-4 text-forest-sage border border-forest-rust/40 shadow-2xl animate-fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-forest-moss/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-forest-rust/20 text-forest-rust border border-forest-rust/30">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-forest-glow font-bold">
                Supply Chain & Dependency Blast Radius
              </h3>
              <span className="text-[10px] text-forest-leaf">
                Transitive dependency impact simulation
              </span>
            </div>
          </div>
          <button onClick={() => setBlastRadiusModalOpen(false)} className="text-forest-leaf hover:text-forest-glow">
            <X size={16} />
          </button>
        </div>

        {/* Custom search */}
        <div className="flex gap-2">
          <div className="flex-grow flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg border border-forest-moss/30 text-xs text-forest-sage">
            <Search size={13} className="text-forest-leaf" />
            <input
              type="text"
              placeholder="Search package (e.g. express, react, lodash)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && query && handleSimulate(query)}
              className="bg-transparent outline-none w-full text-xs text-forest-glow"
            />
          </div>
          <button
            onClick={() => query && handleSimulate(query)}
            className="px-3 py-2 bg-forest-moss hover:bg-forest-fern text-forest-glow text-xs uppercase tracking-wider font-mono rounded-lg border border-forest-leaf/30 transition-all"
          >
            Simulate
          </button>
        </div>

        {/* Quick select detected packages */}
        {popularDefaults.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-forest-leaf">
              Detected Workspace Dependencies
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {popularDefaults.map((pkg) => (
                <button
                  key={pkg.name}
                  onClick={() => handleSimulate(pkg.name)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-all flex items-center gap-1.5 ${
                    activeBlastRadius?.packageName === pkg.name
                      ? 'bg-forest-rust text-white font-bold shadow-md'
                      : 'bg-black/40 hover:bg-forest-moss/50 text-forest-sage border border-forest-moss/20'
                  }`}
                >
                  <span>{pkg.name}</span>
                  <span className="text-[9px] opacity-70">({pkg.projectCount} repos)</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Simulation Result Card */}
        {activeBlastRadius && (
          <div className="p-4 rounded-xl bg-forest-rust/10 border border-forest-rust/30 flex flex-col gap-2.5 animate-fade-in">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-bold text-forest-rust uppercase flex items-center gap-1">
                <Radio size={12} className="animate-pulse" />
                Active Simulation: {activeBlastRadius.packageName}
              </span>
              <span className="text-xs font-mono font-bold text-forest-glow">
                {activeBlastRadius.blastPercentage}% Blast Radius
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-forest-moss/20">
              <div
                className="bg-forest-rust h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(5, activeBlastRadius.blastPercentage)}%` }}
              />
            </div>

            <div className="flex flex-col gap-1 text-[11px] text-forest-sage">
              <span className="text-[10px] font-mono uppercase tracking-wider text-forest-leaf">
                Exposed Repositories ({activeBlastRadius.affectedProjectIds.length} of {projects.length}):
              </span>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                {activeBlastRadius.affectedProjectNames.map((name) => (
                  <span key={name} className="px-2 py-0.5 rounded bg-black/50 text-forest-gold border border-forest-moss/20 text-[10px] font-mono">
                    🌲 {name}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={clearBlastRadius}
              className="self-end px-3 py-1 bg-black/40 hover:bg-black/60 text-forest-sage text-[10px] font-mono uppercase tracking-wider rounded border border-forest-moss/30 transition-colors"
            >
              Clear Simulation
            </button>
          </div>
        )}

        {!activeBlastRadius && (
          <div className="text-xs text-forest-leaf/80 italic p-3 bg-black/20 rounded-lg border border-forest-moss/10 flex items-center gap-2">
            <CheckCircle size={14} className="text-forest-fern flex-none" />
            <span>Select or search a package to simulate supply chain vulnerabilities and observe the 3D shockwave in your forest.</span>
          </div>
        )}

      </div>
    </div>
  );
};
