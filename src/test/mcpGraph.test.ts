import { describe, it, expect, beforeEach } from 'vitest';
import { hydra } from '../database/hydra.js';

describe('HydraDB Graph Traversal & MCP Enhancements', () => {
  beforeEach(() => {
    hydra.clear();
    hydra.addNode({
      id: 'proj_alpha',
      type: 'Project',
      label: 'Tracewood Core',
      properties: { path: '/path/tracewood' },
      timestamp: new Date().toISOString()
    });
    hydra.addNode({
      id: 'pkg_express',
      type: 'Package',
      label: 'express',
      properties: { version: '^4.18.2' },
      timestamp: new Date().toISOString()
    });
    hydra.addNode({
      id: 'pkg_expres',
      type: 'Package',
      label: 'expres',
      properties: { version: '^4.18.0' },
      timestamp: new Date().toISOString()
    });
    hydra.addEdge('proj_alpha', 'pkg_express', 'DEPENDS_ON');
    hydra.addEdge('proj_alpha', 'pkg_expres', 'DEPENDS_ON');
  });

  it('detects typosquatting package variants via Levenshtein distance', () => {
    const variants = hydra.detectTyposquats('express');
    expect(variants).toContain('expres');
  });

  it('performs sub-graph queries by nodeType and searchTerm', () => {
    const result = hydra.queryGraph({
      nodeType: 'Package',
      searchTerm: 'exp'
    });
    expect(result.nodes.length).toBe(2);
    expect(result.nodes.map(n => n.label)).toEqual(expect.arrayContaining(['express', 'expres']));
  });
});
