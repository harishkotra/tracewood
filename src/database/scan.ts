import { runScan } from '../ingestion/index.js';

async function main() {
  console.log("🔍 Scanning local directories for agent activity...");
  try {
    const result = await runScan();
    console.log(`✅ Scan finished: Found ${result.newProjectsCount} new projects and ${result.newSessionsCount} new sessions.`);
  } catch (err) {
    console.error("❌ Scan failed:", err);
    process.exit(1);
  }
}

main();
