#!/usr/bin/env node
import { hydra } from '../src/database/hydra.js';
import { hydraBolt } from '../src/database/hydraBolt.js';

console.log('🌲 Syncing Tracewood Graph to Native HydraDB Bolt Server...');

await hydra.init();
const statements = hydraBolt.generateCypherStatements();
console.log(`Generated ${statements.length} OpenCypher graph statements.`);

const result = await hydraBolt.exportToBolt();
console.log(`Status: ${result.message}`);
console.log('✅ Export complete.');
