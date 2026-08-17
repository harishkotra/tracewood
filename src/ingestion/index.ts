import { runUniversalScan } from './universal/index.js';
import fs from 'fs/promises';
import path from 'path';
import { IntelligenceConfig } from '../intelligence/provider/index.js';

const configPath = path.resolve(process.cwd(), 'config.json');

export async function saveIntelligenceConfig(config: IntelligenceConfig): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function runScan() {
  return runUniversalScan();
}
