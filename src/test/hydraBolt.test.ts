import { describe, it, expect, beforeEach } from 'vitest';
import { hydraBolt } from '../database/hydraBolt.js';
import { hydra } from '../database/hydra.js';

describe('HydraDB Bolt Client & Cypher Statement Exporter', () => {
  beforeEach(() => {
    hydra.clear();
    hydra.addNode({
      id: 'proj_bolt',
      type: 'Project',
      label: 'Bolt Test Repo',
      properties: { path: '/path/bolt' },
      timestamp: new Date().toISOString()
    });
    hydra.addNode({
      id: 'pkg_bolt',
      type: 'Package',
      label: 'react',
      properties: { version: '^19.0.0' },
      timestamp: new Date().toISOString()
    });
    hydra.addEdge('proj_bolt', 'pkg_bolt', 'DEPENDS_ON');
  });

  it('generates valid OpenCypher statements for nodes and edges', () => {
    const statements = hydraBolt.generateCypherStatements();
    expect(statements.length).toBe(3);
    expect(statements[0]).toContain('MERGE (n:Project {id: "proj_bolt"})');
    expect(statements[1]).toContain('MERGE (n:Package {id: "pkg_bolt"})');
    expect(statements[2]).toContain('MATCH (a {id: "proj_bolt"}), (b {id: "pkg_bolt"}) MERGE (a)-[r:DEPENDS_ON]->(b);');
  });

  it('attempts Bolt connection gracefully', async () => {
    const result = await hydraBolt.exportToBolt();
    expect(result.cypherCount).toBe(3);
    expect(typeof result.message).toBe('string');
  });
});
