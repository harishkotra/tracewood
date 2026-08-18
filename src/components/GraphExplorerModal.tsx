import React, { useState, useEffect } from 'react';
import { useForestStore } from '../store/forestStore.js';
import { Network, Search, X, Layers, GitBranch, ShieldAlert, Cpu } from 'lucide-react';
import { HydraNode, HydraEdge } from '../database/hydra.js';

export const GraphExplorerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [nodeType, setNodeType] = useState<string>('');
  const [edgeType, setEdgeType] = useState<string>('');
  const [nodes, setNodes] = useState<HydraNode[]>([]);
  const [edges, setEdges] = useState<HydraEdge[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchGraph = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (nodeType) params.append('nodeType', nodeType);
        if (edgeType) params.append('edgeType', edgeType);
        if (searchTerm) params.append('q', searchTerm);

        const res = await fetch(`/api/graph/query?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [isOpen, searchTerm, nodeType, edgeType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md pointer-events-auto select-none">
      <div className="w-full max-w-2xl glass-panel p-6 rounded-2xl flex flex-col gap-4 text-forest-sage border border-forest-moss/40 shadow-2xl animate-fade-in max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-forest-moss/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-forest-moss/30 text-forest-gold border border-forest-leaf/30">
              <Network size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wider text-forest-glow uppercase font-mono">
                HydraDB Graph Traversal Explorer
              </h3>
              <span className="text-[10px] text-forest-leaf">
                Live Sub-Graph Traversal ({nodes.length} Nodes, {edges.length} Edges)
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-forest-leaf hover:text-forest-glow transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Query Controls */}
        <div className="grid grid-cols-3 gap-2">
          {/* Search term */}
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-forest-moss/30 text-xs">
            <Search size={13} className="text-forest-leaf flex-shrink-0" />
            <input
              type="text"
              placeholder="Search graph..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent outline-none text-forest-glow text-xs font-mono w-full"
            />
          </div>

          {/* Node Type filter */}
          <select
            value={nodeType}
            onChange={(e) => setNodeType(e.target.value)}
            className="bg-black/40 text-forest-sage px-3 py-1.5 rounded-lg border border-forest-moss/30 text-xs font-mono outline-none"
          >
            <option value="">All Node Types</option>
            <option value="Project">Project</option>
            <option value="Topic">Topic</option>
            <option value="Session">Session</option>
            <option value="DecisionNode">DecisionNode</option>
            <option value="Package">Package</option>
          </select>

          {/* Edge Type filter */}
          <select
            value={edgeType}
            onChange={(e) => setEdgeType(e.target.value)}
            className="bg-black/40 text-forest-sage px-3 py-1.5 rounded-lg border border-forest-moss/30 text-xs font-mono outline-none"
          >
            <option value="">All Edge Types</option>
            <option value="CONTAINS">CONTAINS</option>
            <option value="DEPENDS_ON">DEPENDS_ON</option>
            <option value="OVERWROTE">OVERWROTE</option>
            <option value="SHARED_PATTERN_WITH">SHARED_PATTERN_WITH</option>
          </select>
        </div>

        {/* Results Graph Grid */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-1 py-1 max-h-[50vh]">
          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-forest-leaf animate-pulse">
              Traversing HydraDB graph index...
            </div>
          ) : nodes.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-forest-leaf/60">
              No matching graph nodes found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {nodes.map(node => (
                <div
                  key={node.id}
                  className="p-3 rounded-xl bg-black/30 border border-forest-moss/20 flex flex-col gap-1.5 text-xs transition-all hover:border-forest-leaf/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-forest-moss/30 text-forest-gold border border-forest-leaf/20">
                      {node.type}
                    </span>
                    <span className="text-[9px] font-mono text-forest-leaf opacity-60">
                      {new Date(node.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="font-semibold text-forest-glow truncate">{node.label}</span>
                  {node.properties && (
                    <div className="text-[10px] font-mono text-forest-leaf bg-black/40 p-1.5 rounded border border-forest-moss/10 truncate">
                      {JSON.stringify(node.properties)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-forest-moss/20 text-xs font-mono text-forest-leaf">
          <span>Powered by HydraDB Graph Traversal Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-forest-moss hover:bg-forest-fern text-forest-glow text-xs uppercase tracking-wider rounded border border-forest-leaf/20 transition-colors"
          >
            Close Explorer
          </button>
        </div>

      </div>
    </div>
  );
};
