import React, { useState, useEffect } from 'react';
import { useForestStore } from '../store/forestStore.js';
import { X, Shield, Terminal, CheckCircle2, RefreshCw } from 'lucide-react';
import { HarnessDetectionResult } from '../ingestion/detector.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, saveSettings } = useForestStore();
  const [provider, setProvider] = useState(settings.provider);
  const [model, setModel] = useState(settings.model);
  const [endpoint, setEndpoint] = useState(settings.endpoint);
  const [apiKey, setApiKey] = useState('');
  const [harnesses, setHarnesses] = useState<HarnessDetectionResult[]>([]);
  const [loadingHarnesses, setLoadingHarnesses] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingHarnesses(true);
      fetch('/api/harnesses')
        .then(r => r.json())
        .then(data => setHarnesses(data))
        .catch(() => {})
        .finally(() => setLoadingHarnesses(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await saveSettings({
      provider,
      model,
      endpoint,
      apiKey: apiKey || undefined
    });
    onClose();
  };

  const detectedHarnesses = harnesses.filter(h => h.detected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto select-none" onClick={onClose}>
      <div className="w-full max-w-md glass-panel p-6 rounded-2xl flex flex-col gap-5 text-forest-sage border border-forest-moss/40 shadow-2xl animate-fade-in pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-forest-moss/20 pb-3">
          <h3 className="text-lg font-light tracking-wide text-forest-glow">Settings</h3>
          <button type="button" onClick={onClose} className="text-forest-leaf hover:text-forest-glow transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Agent sources info */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-forest-leaf uppercase tracking-wider">Detected Agent Harnesses</span>
              <span className="text-[10px] font-mono text-forest-gold px-2 py-0.5 rounded bg-black/40 border border-forest-moss/30">
                {detectedHarnesses.length} / {harnesses.length} Detected
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 rounded bg-black/30 border border-forest-moss/20">
              {loadingHarnesses ? (
                <div className="text-[10px] font-mono text-forest-leaf p-2 flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin text-forest-gold" />
                  Scanning local agent environments...
                </div>
              ) : (
                harnesses.map(h => (
                  <span
                    key={h.id}
                    className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 border ${
                      h.detected
                        ? 'bg-forest-moss/40 text-forest-glow border-forest-leaf/40 font-medium'
                        : 'bg-black/20 text-forest-leaf/50 border-forest-moss/10 opacity-60'
                    }`}
                  >
                    <Terminal size={10} className={h.detected ? 'text-forest-gold' : 'text-forest-leaf/40'} />
                    {h.name} {h.detected ? '✓' : '○'}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Intelligence Provider */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-forest-leaf uppercase tracking-wider">Intelligence Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="bg-black/40 border border-forest-moss/30 rounded p-2 text-sm focus:outline-none focus:border-forest-fern text-forest-sage"
            >
              <option value="none">Local Fallback (Rules-based)</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="lmstudio">LM Studio (Local)</option>
              <option value="openai">OpenAI (Cloud)</option>
              <option value="gemini">Gemini (Cloud)</option>
            </select>
          </div>

          {/* Model Name */}
          {provider !== 'none' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-forest-leaf uppercase tracking-wider">Model Name</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. llama3, gpt-4o-mini"
                className="bg-black/40 border border-forest-moss/30 rounded p-2 text-sm focus:outline-none focus:border-forest-fern text-forest-sage font-mono"
              />
            </div>
          )}

          {/* Custom Endpoint */}
          {['ollama', 'lmstudio'].includes(provider) && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-forest-leaf uppercase tracking-wider">Endpoint</label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="bg-black/40 border border-forest-moss/30 rounded p-2 text-sm focus:outline-none focus:border-forest-fern text-forest-sage font-mono"
              />
            </div>
          )}

          {/* Cloud API Key */}
          {['openai', 'gemini'].includes(provider) && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono text-forest-leaf uppercase tracking-wider">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key here..."
                className="bg-black/40 border border-forest-moss/30 rounded p-2 text-sm focus:outline-none focus:border-forest-fern text-forest-sage font-mono"
              />
            </div>
          )}

          {/* Privacy Note */}
          <div className="flex items-center gap-2 p-3 rounded bg-forest-moss/10 border border-forest-leaf/10 text-xs text-forest-leaf mt-2">
            <Shield size={14} className="flex-shrink-0" />
            <span>Telemetry data remains stored locally. Cloud APIs are requested strictly for code summarization.</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-forest-moss/20 pt-4 mt-2">
          <button 
            type="button"
            onClick={onClose} 
            className="px-4 py-2 border border-forest-moss/20 rounded hover:bg-black/20 text-sm text-forest-leaf hover:text-forest-glow cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={(e) => handleSave(e)} 
            className="px-4 py-2 bg-forest-moss hover:bg-forest-fern text-forest-glow border border-forest-leaf/20 rounded text-sm cursor-pointer transition-colors shadow-lg"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
