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
const LOCAL_DIR = path.join(__dirname, '../../assets/prompts');

async function syncPrompts() {
  // Load upstream config - required
  const config = await loadUpstreamConfig();
  const repoConfig = findRepoConfig(config, 'github', 'awesome-copilot');
  
  await syncFromGitHub({
    repoOwner: 'github',
    repoName: 'awesome-copilot',
    remoteDir: 'prompts',
    localDir: LOCAL_DIR,
    acceptedExtensions: ['.prompt.md', '.md'],
    resourceType: 'prompts',
    token: GITHUB_TOKEN,
    syncPatterns: repoConfig.syncPatterns || null
  });
}

syncPrompts().catch(error => {
  console.error(error);
  process.exit(1);
});
