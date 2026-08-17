import { describe, it, expect, beforeEach } from 'vitest';
import { HydraGraphEngine } from '../database/hydra.js';

describe('HydraDB Graph Core Engine', () => {
  let engine: HydraGraphEngine;

  beforeEach(() => {
    engine = new HydraGraphEngine();
  });

  it('creates nodes and links edges correctly', () => {
    engine.addNode({
      id: 'proj_1',
      type: 'Project',
      label: 'Tracewood',
      properties: { path: '/path/to/tracewood' },
      timestamp: new Date().toISOString()
    });

    engine.addNode({
      id: 'topic_1',
      type: 'Topic',
      label: 'Authentication',
      properties: { projectId: 'proj_1' },
      timestamp: new Date().toISOString()
    });

    const edge = engine.addEdge('proj_1', 'topic_1', 'CONTAINS');
    expect(edge.type).toBe('CONTAINS');
    expect(engine.getNode('proj_1')?.label).toBe('Tracewood');
  });

  it('computes underground mycelium links between projects sharing semantic themes', () => {
    // Project A with Auth & UI
    engine.addNode({ id: 'pA', type: 'Project', label: 'FrontendApp', properties: {}, timestamp: '2026-08-17' });
    engine.addNode({ id: 'tA1', type: 'Topic', label: 'Auth', properties: {}, timestamp: '2026-08-17' });
    engine.addEdge('pA', 'tA1', 'CONTAINS');

    // Project B with Auth & Database
    engine.addNode({ id: 'pB', type: 'Project', label: 'BackendAPI', properties: {}, timestamp: '2026-08-17' });
    engine.addNode({ id: 'tB1', type: 'Topic', label: 'Auth', properties: {}, timestamp: '2026-08-17' });
    engine.addEdge('pB', 'tB1', 'CONTAINS');

    const links = engine.getMyceliumLinks();
    expect(links.length).toBe(1);
    expect(links[0].sourceProjectId).toBe('pA');
    expect(links[0].targetProjectId).toBe('pB');
    expect(links[0].topic).toBe('auth');
    expect(links[0].strength).toBeGreaterThan(0);
  });

  it('records and retrieves decision overwrites correctly', () => {
    engine.addNode({
      id: 'dec_1',
      type: 'DecisionNode',
      label: 'Initial JWT architecture',
      properties: { description: 'Used short lived tokens' },
      timestamp: '2026-08-15'
    });

    engine.addNode({
      id: 'sess_2',
      type: 'Session',
      label: 'Migration to Session Cookies',
      properties: { projectId: 'proj_1', provider: 'claude' },
      timestamp: '2026-08-17'
    });

    engine.addEdge('sess_2', 'dec_1', 'OVERWROTE', { reason: 'Switched from JWT to secure httpOnly cookies' });

    const conflicts = engine.getDecisionConflicts();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].originalDecision).toBe('Used short lived tokens');
    expect(conflicts[0].newDecision).toBe('Switched from JWT to secure httpOnly cookies');
    expect(conflicts[0].agent).toBe('claude');
  });
});
