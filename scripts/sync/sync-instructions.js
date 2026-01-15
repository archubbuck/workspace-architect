import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from '../utils/env-loader.js';
import { syncFromGitHub } from '../utils/sync-base.js';
import { loadUpstreamConfig, findRepoConfig } from '../utils/config-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const LOCAL_DIR = path.join(__dirname, '../../assets/instructions');

// Parse command-line arguments for --dry-run flag
const dryRun = process.argv.includes('--dry-run');

async function syncInstructions() {
  // Load upstream config - required
  const config = await loadUpstreamConfig();
  const repoConfig = findRepoConfig(config, 'github', 'awesome-copilot');
  
  await syncFromGitHub({
    repoOwner: 'github',
    repoName: 'awesome-copilot',
    remoteDir: 'instructions',
    localDir: LOCAL_DIR,
    acceptedExtensions: ['.instructions.md', '.md'],
    resourceType: 'instructions',
    token: GITHUB_TOKEN,
    syncPatterns: repoConfig.syncPatterns || null,
    dryRun
  });
}

syncInstructions().catch(error => {
  console.error(error);
  process.exit(1);
});
