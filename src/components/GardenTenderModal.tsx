import React, { useState } from 'react';
import { useForestStore } from '../store/forestStore.js';
import { Sparkles, X, Wrench, AlertOctagon, CheckCircle2, RefreshCw } from 'lucide-react';

export const GardenTenderModal: React.FC = () => {
  const {
    isGardenTenderOpen,
    setGardenTenderOpen,
    troubledBranches,
    selectedTroubledTopic,
    selectTroubledBranch,
    healBranch
  } = useForestStore();

  const [isHealing, setIsHealing] = useState(false);
  const [healingResult, setHealingResult] = useState<{ diagnosis: string; suggestedFix: string } | null>(null);

  if (!isGardenTenderOpen) return null;

  const current = selectedTroubledTopic || (troubledBranches.length > 0 ? troubledBranches[0] : null);

  const handleHeal = async (topicId: string) => {
    setIsHealing(true);
    const result = await healBranch(topicId);
    setHealingResult(result);
    setIsHealing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-xl glass-panel p-6 rounded-2xl flex flex-col gap-4 text-forest-sage border border-forest-moss/40 shadow-2xl animate-fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-forest-moss/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-forest-gold/20 text-forest-gold border border-forest-gold/30">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-forest-glow font-bold">
                Tend the Garden (Autonomous Refactor Agent)
              </h3>
              <span className="text-[10px] text-forest-leaf">
                Detects tangled branches with high agent churn & proposes clean refactors
              </span>
            </div>
          </div>
          <button onClick={() => setGardenTenderOpen(false)} className="text-forest-leaf hover:text-forest-glow">
            <X size={16} />
          </button>
        </div>

        {/* Troubled branches selector */}
        {troubledBranches.length > 0 ? (
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-forest-leaf">
              Troubled Branches ({troubledBranches.length} detected)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {troubledBranches.map(b => (
                <div
                  key={b.topicId}
                  onClick={() => {
                    selectTroubledBranch(b);
                    setHealingResult(null);
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                    current?.topicId === b.topicId
                      ? 'bg-forest-moss border-forest-leaf text-forest-glow shadow-md'
                      : 'bg-black/40 hover:bg-forest-moss/40 border-forest-moss/20 text-forest-sage'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span>{b.topicName}</span>
                    <span className="text-[10px] font-mono text-forest-rust">{b.failureRate}% failure</span>
                  </div>
                  <span className="text-[10px] font-mono text-forest-leaf truncate">in {b.projectName}</span>
                </div>
              ))}
            </div>

            {/* Diagnostic Card for selected branch */}
            {current && (
              <div className="p-4 rounded-xl bg-black/40 border border-forest-moss/30 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-forest-gold uppercase font-mono">
                  <AlertOctagon size={14} className="text-forest-gold" />
                  Diagnosis: {current.topicName} in {current.projectName}
                </div>
                
                <p className="text-xs leading-relaxed text-forest-sage">
                  {current.reason}
                </p>

                {healingResult && (
                  <div className="p-3 rounded-lg bg-forest-fern/10 border border-forest-fern/30 flex flex-col gap-1.5 animate-fade-in">
                    <span className="text-[10px] font-mono uppercase text-forest-fern font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> AI Healing Suggestion Generated
                    </span>
                    <p className="text-xs text-forest-sage italic leading-relaxed">
                      "{healingResult.suggestedFix}"
                    </p>
                  </div>
                )}

                <button
                  onClick={() => handleHeal(current.topicId)}
                  disabled={isHealing}
                  className="self-end flex items-center gap-1.5 px-4 py-2 bg-forest-moss hover:bg-forest-fern text-forest-glow text-xs uppercase font-mono tracking-wider rounded-lg border border-forest-leaf/30 transition-all shadow-md"
                >
                  {isHealing ? <RefreshCw size={12} className="animate-spin" /> : <Wrench size={12} />}
                  {healingResult ? 'Healed & Pruned' : 'Prune & Heal Branch'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-forest-leaf/90 italic p-6 bg-black/20 rounded-xl border border-forest-moss/10 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 size={24} className="text-forest-fern" />
            <span className="text-forest-glow font-medium">Your forest is thriving!</span>
            <span className="text-[11px] text-forest-leaf">No tangled branches or high error rates detected across your coding history.</span>
          </div>
        )}

      </div>
    </div>
  );
};
