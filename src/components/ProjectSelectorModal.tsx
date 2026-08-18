import React from 'react';
import { useForestStore } from '../store/forestStore.js';
import { FolderCheck, CheckSquare, Square, X, Filter } from 'lucide-react';

export const ProjectSelectorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { projects, selectedProjectIds, toggleProjectSelected, selectAllProjects, deselectAllProjects } = useForestStore();

  if (!isOpen) return null;

  const allSelected = projects.length > 0 && selectedProjectIds.length === projects.length;
  const noneSelected = selectedProjectIds.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto select-none">
      <div className="w-full max-w-md glass-panel p-6 rounded-xl flex flex-col gap-4 text-forest-sage border border-forest-moss/30 shadow-2xl animate-fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-forest-moss/20 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-forest-gold" />
            <h3 className="text-sm font-semibold tracking-wider text-forest-glow uppercase">
              Visualize Projects ({selectedProjectIds.length} / {projects.length})
            </h3>
          </div>
          <button onClick={onClose} className="text-forest-leaf hover:text-forest-glow transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-forest-leaf">
          Select which projects to render in your 3D forest canvas. Unselected projects will be filtered out of the visual scene.
        </p>

        {/* Quick Select Actions */}
        <div className="flex justify-between items-center text-xs font-mono py-1 border-b border-forest-moss/10">
          <button
            onClick={selectAllProjects}
            disabled={allSelected}
            className="hover:text-forest-glow text-forest-leaf disabled:opacity-40 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={deselectAllProjects}
            disabled={noneSelected}
            className="hover:text-forest-glow text-forest-leaf disabled:opacity-40 transition-colors"
          >
            Deselect All
          </button>
        </div>

        {/* Project List */}
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
          {projects.map((p) => {
            const isSelected = selectedProjectIds.includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => toggleProjectSelected(p.id)}
                className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-forest-moss/30 border-forest-leaf/40 text-forest-glow'
                    : 'bg-black/20 border-forest-moss/10 text-forest-leaf hover:border-forest-moss/30 hover:text-forest-sage'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FolderCheck size={14} className={isSelected ? 'text-forest-fern' : 'text-forest-leaf/50'} />
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-medium truncate">{p.name}</span>
                    <span className="text-[10px] font-mono opacity-60 truncate">{p.path}</span>
                  </div>
                </div>
                <div>
                  {isSelected ? (
                    <CheckSquare size={16} className="text-forest-fern flex-shrink-0" />
                  ) : (
                    <Square size={16} className="text-forest-leaf/40 flex-shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-forest-moss/20">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-forest-moss hover:bg-forest-fern text-forest-glow text-xs font-mono uppercase tracking-wider border border-forest-leaf/20 rounded transition-colors"
          >
            Apply & Close
          </button>
        </div>

      </div>
    </div>
  );
};
