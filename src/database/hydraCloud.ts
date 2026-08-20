import { HydraDBClient } from "@hydradb/sdk";
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

dotenv.config();

const API_KEY = process.env.HYDRA_DB_API_KEY || process.env.HYDRADB_API_KEY;
const DATABASE_NAME = process.env.HYDRA_DB_DATABASE || "tracewood_workspace";

export class OfficialHydraDBEngine {
  private client: HydraDBClient | null = null;
  private isReady: boolean = false;

  constructor() {
    if (API_KEY) {
      this.client = new HydraDBClient({ token: API_KEY });
    }
  }

  public isCloudConnected(): boolean {
    return !!this.client && this.isReady;
  }

  public async initDatabase(): Promise<boolean> {
    if (!this.client) return false;

    try {
      // 1. Create database workspace if not exists
      try {
        await this.client.databases.create({
          database: DATABASE_NAME,
          databaseMetadataSchema: [
            { name: "project", dataType: "VARCHAR", enableMatch: true },
            { name: "topic", dataType: "VARCHAR", enableMatch: true },
            { name: "intent", dataType: "VARCHAR", enableMatch: true },
            { name: "provider", dataType: "VARCHAR", enableMatch: true }
          ]
        });
      } catch (err: any) {
        // 409 DATABASE_ALREADY_EXISTS is expected if already created
      }

      // 2. Poll status until infrastructure is ready for ingestion
      let attempts = 0;
      while (attempts < 10) {
        const statusRes = await this.client.databases.status({ database: DATABASE_NAME });
        if (statusRes.data?.infra?.readyForIngestion) {
          this.isReady = true;
          console.log(`✅ Connected to Official HydraDB Cloud (Database: ${DATABASE_NAME})`);
          return true;
        }
        attempts++;
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e: any) {
      console.warn(`[HydraDB Cloud] Initialization warning: ${e.message || e}`);
    }

    return false;
  }

  public async syncKnowledge(item: {
    id: string;
    title: string;
    content: string;
    project: string;
    topic: string;
    intent?: string;
    provider?: string;
    relations?: string[];
  }): Promise<boolean> {
    if (!this.client || !this.isReady) return false;

    try {
      await this.client.context.ingest({
        type: "knowledge",
        database: DATABASE_NAME,
        collection: item.project,
        appKnowledge: JSON.stringify([
          {
            id: item.id,
            database: DATABASE_NAME,
            collection: item.project,
            title: item.title,
            type: "custom",
            timestamp: new Date().toISOString(),
            content: { text: item.content },
            tenant_metadata: {
              project: item.project,
              topic: item.topic,
              intent: item.intent || "feature",
              provider: item.provider || "agent"
            },
            relations: item.relations ? { ids: item.relations } : undefined
          }
        ])
      });
      return true;
    } catch (e: any) {
      console.warn(`[HydraDB Cloud Ingest Error]: ${e.message || e}`);
      return false;
    }
  }

  public async syncMemory(userMemory: {
    id: string;
    text: string;
    collection: string;
    user_name?: string;
  }): Promise<boolean> {
    if (!this.client || !this.isReady) return false;

    try {
      await this.client.context.ingest({
        type: "memory",
        database: DATABASE_NAME,
        collection: userMemory.collection,
        memories: JSON.stringify([
          {
            id: userMemory.id,
            text: userMemory.text,
            infer: true,
            user_name: userMemory.user_name || "developer"
          }
        ])
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  public async queryContext(params: {
    query: string;
    collection?: string;
    type?: "knowledge" | "memory" | "all";
  }) {
    if (!this.client || !this.isReady) return null;

    try {
      const res = await this.client.query({
        database: DATABASE_NAME,
        collection: params.collection,
        query: params.query,
        type: params.type || "all",
        queryBy: "hybrid",
        mode: "thinking",
        graphContext: true
      });
      return res.data;
    } catch (e: any) {
      console.warn(`[HydraDB Cloud Query Error]: ${e.message || e}`);
      return null;
    }
  }

  public async submitFeedback(requestId: string, feedback: string, rating: "positive" | "negative") {
    if (!this.client || !this.isReady) return;

    try {
      await (this.client.feedback as any).submit({
        request_id: requestId,
        feedback,
        rating,
        source: "agent",
        database: DATABASE_NAME
      });
    } catch (e) {}
  }
}

export const hydraCloud = new OfficialHydraDBEngine();
