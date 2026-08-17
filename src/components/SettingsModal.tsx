import React, { useState } from 'react';
import { useForestStore } from '../store/forestStore.js';
import { X, Shield } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSave = async () => {
    await saveSettings({
      provider,
      model,
      endpoint,
      apiKey: apiKey || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-md glass-panel p-6 rounded-xl flex flex-col gap-5 text-forest-sage">
        <div className="flex justify-between items-center border-b border-forest-moss/20 pb-3">
          <h3 className="text-lg font-light tracking-wide text-forest-glow">Settings</h3>
          <button onClick={onClose} className="hover:text-forest-glow">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Agent sources info */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-mono text-forest-leaf uppercase tracking-wider">Agent Sources</span>
            <div className="text-xs flex gap-4 text-forest-sage">
              <span>Claude Code ✓</span>
              <span>Codex ✓</span>
              <span>OpenCode ✓</span>
              <span>Pi ○</span>
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
            onClick={onClose} 
            className="px-4 py-2 border border-forest-moss/20 rounded hover:bg-black/20 text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 bg-forest-moss hover:bg-forest-fern text-forest-glow border border-forest-leaf/20 rounded text-sm transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
