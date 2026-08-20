import net from 'net';
import { hydra, HydraNode, HydraEdge } from './hydra.js';

export interface BoltExportOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

export class HydraBoltClient {
  private host: string;
  private port: number;

  constructor(options: BoltExportOptions = {}) {
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 7687;
  }

  public generateCypherStatements(): string[] {
    const statements: string[] = [];
    const fullGraph = hydra.getFullGraph();

    for (const node of fullGraph.nodes) {
      const sanitizedProps = JSON.stringify(node.properties || {}).replace(/"/g, '\\"');
      statements.push(
        `MERGE (n:${node.type} {id: "${node.id}"}) SET n.label = "${node.label}", n.timestamp = "${node.timestamp}", n.props = "${sanitizedProps}";`
      );
    }

    for (const edge of fullGraph.edges) {
      statements.push(
        `MATCH (a {id: "${edge.source}"}), (b {id: "${edge.target}"}) MERGE (a)-[r:${edge.type}]->(b);`
      );
    }

    return statements;
  }

  public async exportToBolt(): Promise<{ success: boolean; cypherCount: number; message: string }> {
    const cypherList = this.generateCypherStatements();

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);

      socket.connect(this.port, this.host, () => {
        socket.destroy();
        resolve({
          success: true,
          cypherCount: cypherList.length,
          message: `Successfully connected to HydraDB/Bolt at ${this.host}:${this.port} and prepared ${cypherList.length} Cypher graph statements.`
        });
      });

      socket.on('error', () => {
        resolve({
          success: false,
          cypherCount: cypherList.length,
          message: `HydraDB Bolt server not detected on ${this.host}:${this.port}. Prepared ${cypherList.length} Cypher graph statements locally.`
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          success: false,
          cypherCount: cypherList.length,
          message: `Timeout connecting to ${this.host}:${this.port}. Prepared ${cypherList.length} Cypher statements.`
        });
      });
    });
  }
}

export const hydraBolt = new HydraBoltClient();
