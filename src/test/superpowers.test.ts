import { describe, it, expect, beforeEach } from 'vitest';
import { HydraGraphEngine } from '../database/hydra.js';

describe('4 HydraDB Superpowers Engine Tests', () => {
  let engine: HydraGraphEngine;

  beforeEach(() => {
    engine = new HydraGraphEngine();
  });

  it('Superpower 1: computes dependency blast radius correctly across repositories', () => {
    engine.addNode({ id: 'p1', type: 'Project', label: 'AppOne', properties: {}, timestamp: '2026-08-18' });
    engine.addNode({ id: 'p2', type: 'Project', label: 'AppTwo', properties: {}, timestamp: '2026-08-18' });
    engine.addNode({ id: 'p3', type: 'Project', label: 'AppThree', properties: {}, timestamp: '2026-08-18' });

    engine.addNode({ id: 'pkg_express', type: 'Package', label: 'express', properties: {}, timestamp: '2026-08-18' });
    
    // AppOne & AppTwo depend on express
    engine.addEdge('p1', 'pkg_express', 'DEPENDS_ON');
    engine.addEdge('p2', 'pkg_express', 'DEPENDS_ON');

    const result = engine.getDependencyBlastRadius('express');
    expect(result.packageName).toBe('express');
    expect(result.affectedProjectIds).toEqual(['p1', 'p2']);
    expect(result.blastPercentage).toBe(67); // 2 out of 3 = 67%
  });

  it('Superpower 2: builds subterranean graph nodes & links correctly', () => {
    engine.addNode({ id: 'proj_a', type: 'Project', label: 'Core', properties: {}, timestamp: '2026-08-18' });
    engine.addNode({ id: 'top_auth', type: 'Topic', label: 'Auth', properties: { projectId: 'proj_a' }, timestamp: '2026-08-18' });
    engine.addEdge('proj_a', 'top_auth', 'CONTAINS');

    const fullGraph = engine.getFullGraph();
    expect(fullGraph.nodes.length).toBe(2);
    expect(fullGraph.edges.length).toBe(1);
    expect(fullGraph.edges[0].type).toBe('CONTAINS');
  });

  it('Superpower 4: detects troubled branches with high failure rates', () => {
    engine.addNode({ id: 'proj_1', type: 'Project', label: 'PaymentService', properties: {}, timestamp: '2026-08-18' });
    engine.addNode({ id: 'top_checkout', type: 'Topic', label: 'Checkout', properties: { projectId: 'proj_1' }, timestamp: '2026-08-18' });
    engine.addEdge('proj_1', 'top_checkout', 'CONTAINS');

    // Add failed sessions
    engine.addNode({ id: 's1', type: 'Session', label: 'Fix stripe error', properties: { outcome: 'failed', toolCallCount: 15 }, timestamp: '2026-08-18' });
    engine.addNode({ id: 's2', type: 'Session', label: 'Retry stripe error', properties: { outcome: 'failed', toolCallCount: 30 }, timestamp: '2026-08-18' });
    engine.addEdge('top_checkout', 's1', 'CONTAINS');
    engine.addEdge('top_checkout', 's2', 'CONTAINS');

    const troubled = engine.getTroubledBranches();
    expect(troubled.length).toBe(1);
    expect(troubled[0].topicName).toBe('Checkout');
    expect(troubled[0].failedCount).toBe(2);
    expect(troubled[0].failureRate).toBe(100);

    const healed = engine.diagnoseAndHealBranch('top_checkout');
    expect(healed.diagnosis).toContain('Checkout');
    expect(healed.suggestedFix).toBeDefined();
  });
});
