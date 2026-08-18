import React, { useState, useEffect } from 'react';
import { useForestStore } from '../store/forestStore.js';
import { Terminal, Shield, Check, CircleDot, Lock, RefreshCw, FolderSearch } from 'lucide-react';
import { HarnessDetectionResult } from '../ingestion/detector.js';

export const Onboarding: React.FC = () => {
  const { setOnboarded, saveSettings, fetchProjects } = useForestStore();
  const [step, setStep] = useState(1);
  const [harnesses, setHarnesses] = useState<HarnessDetectionResult[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [selectedLLM, setSelectedLLM] = useState('none');
  const [scanning, setScanning] = useState(true);
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => {
    const fetchHarnesses = async () => {
      setScanning(true);
      try {
        const res = await fetch('/api/harnesses');
        if (res.ok) {
          const data: HarnessDetectionResult[] = await res.json();
          setHarnesses(data);
          const initialPerms: Record<string, boolean> = {};
          data.forEach(h => {
            if (h.detected) initialPerms[h.id] = true;
          });
          setPermissions(initialPerms);
        }
      } catch (e) {
      } finally {
        setScanning(false);
      }
    };
    fetchHarnesses();
  }, []);

  const togglePermission = (id: string) => {
    setPermissions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleGrantAndScan = async () => {
    setIngesting(true);
    try {
      await fetch('/api/scan', { method: 'POST' });
      await fetchProjects();
    } catch (e) {}
    setIngesting(false);
    setStep(3);
  };

  const handleFinish = async () => {
    await saveSettings({
      provider: selectedLLM,
      model: selectedLLM === 'openai' ? 'gpt-4o-mini' : 'llama3',
      endpoint: selectedLLM === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'
    });
    setOnboarded(true);
  };

  const detectedCount = harnesses.filter(h => h.detected).length;
  const grantedCount = Object.values(permissions).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl select-none">
      <div className="w-full max-w-lg glass-panel p-8 rounded-2xl flex flex-col gap-6 text-forest-sage border border-forest-moss/30 shadow-2xl">
        
        {step === 1 && (
          <div className="flex flex-col gap-5 text-center items-center">
            <h1 className="text-3xl font-light tracking-widest text-forest-glow">TRACEWOOD</h1>
            <p className="text-sm text-forest-leaf max-w-sm">
              Your AI coding life, turned into a beautiful 3D forest. Local-first, private, and cinematic.
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-forest-moss/10 border border-forest-leaf/10 text-xs text-forest-leaf text-left w-full mt-2">
              <Shield size={16} className="text-forest-fern flex-shrink-0" />
              <span>We seamlessly detect installed AI coding agent harnesses and ask for your explicit permission before reading telemetry.</span>
            </div>
            <button
              onClick={() => setStep(2)}
              className="mt-2 px-6 py-2.5 bg-forest-moss text-forest-glow hover:bg-forest-fern border border-forest-leaf/20 rounded-lg text-sm tracking-wider uppercase transition-colors"
            >
              Scan & Detect Harnesses
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-light text-forest-glow tracking-wide">Agent Harness Detection</h2>
                <span className="text-xs font-mono text-forest-gold px-2 py-0.5 rounded bg-black/40 border border-forest-moss/30">
                  {detectedCount} Detected ({grantedCount} Granted)
                </span>
              </div>
              <p className="text-xs text-forest-leaf mt-1">
                Grant permission for Tracewood to visualize telemetry from your detected AI coding environments.
              </p>
            </div>
            
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 py-1">
              {scanning ? (
                <div className="flex items-center justify-center gap-2 py-8 text-forest-leaf font-mono text-xs">
                  <RefreshCw size={14} className="animate-spin text-forest-gold" />
                  <span>Deep scanning local directories for agent telemetry...</span>
                </div>
              ) : (
                harnesses.map((h) => {
                  const isGranted = !!permissions[h.id];
                  return (
                    <div
                      key={h.id}
                      onClick={() => h.detected && togglePermission(h.id)}
                      className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                        !h.detected
                          ? 'opacity-40 border-forest-moss/10 bg-black/10 cursor-not-allowed'
                          : isGranted
                          ? 'bg-forest-moss/30 border-forest-leaf/40 cursor-pointer text-forest-glow'
                          : 'bg-black/20 border-forest-moss/20 hover:border-forest-moss/40 cursor-pointer text-forest-sage/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Terminal size={15} className={h.detected ? 'text-forest-gold' : 'text-forest-leaf/40'} />
                        <div className="flex flex-col truncate">
                          <span className="text-xs font-medium truncate">{h.name}</span>
                          <span className="text-[10px] font-mono text-forest-leaf truncate">{h.path}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {h.detected ? (
                          <button
                            type="button"
                            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors border ${
                              isGranted
                                ? 'bg-forest-fern text-forest-glow border-forest-leaf'
                                : 'bg-black/40 text-forest-leaf border-forest-moss/30 hover:text-forest-sage'
                            }`}
                          >
                            {isGranted ? 'Permission Granted' : 'Grant Access'}
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-forest-leaf/50">Not Detected</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-between items-center mt-2 border-t border-forest-moss/20 pt-3">
              <button onClick={() => setStep(1)} className="text-xs hover:underline text-forest-leaf">Back</button>
              <button
                onClick={handleGrantAndScan}
                disabled={ingesting || scanning}
                className="px-6 py-2.5 bg-forest-moss text-forest-glow hover:bg-forest-fern border border-forest-leaf/20 rounded-lg text-sm tracking-wider uppercase transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {ingesting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Ingesting telemetry...</span>
                  </>
                ) : (
                  <span>Visualize Telemetry</span>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-light text-forest-glow tracking-wide">Choose your AI intelligence</h2>
              <p className="text-xs text-forest-leaf">Extracts developer topics and intent from session prompts.</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'none', label: 'Local Fallback (No LLM)', desc: 'Rule-based analysis' },
                { id: 'ollama', label: 'Ollama', desc: 'Local model on 11434' },
                { id: 'lmstudio', label: 'LM Studio', desc: 'Local model on 1234' },
                { id: 'openai', label: 'OpenAI Cloud', desc: 'Requires API key' },
                { id: 'gemini', label: 'Gemini Cloud', desc: 'Requires API key' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedLLM(opt.id)}
                  className={`p-3 rounded-lg border text-left flex flex-col gap-0.5 transition-all ${
                    selectedLLM === opt.id
                      ? 'border-forest-fern bg-forest-moss/20 text-forest-glow'
                      : 'border-forest-moss/20 bg-black/10 text-forest-sage/80 hover:border-forest-moss/40'
                  }`}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-[10px] text-forest-leaf">{opt.desc}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-forest-moss/10 border border-forest-leaf/10 text-xs text-forest-leaf">
              <Shield size={14} className="flex-shrink-0 text-forest-fern" />
              <span>Data stays entirely local. Cloud providers are contacted only when explicitly configured.</span>
            </div>

            <div className="flex justify-between items-center mt-2 border-t border-forest-moss/20 pt-3">
              <button onClick={() => setStep(2)} className="text-xs hover:underline text-forest-leaf">Back</button>
              <button
                onClick={handleFinish}
                className="px-6 py-2.5 bg-forest-moss text-forest-glow hover:bg-forest-fern border border-forest-leaf/20 rounded-lg text-sm tracking-wider uppercase transition-colors"
              >
                Enter the Forest
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
