import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from '../utils/env-loader.js';
import { syncFromGitHub } from '../utils/sync-base.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const LOCAL_DIR = path.join(__dirname, '../../assets/agents');

async function syncAgents() {
  await syncFromGitHub({
    repoOwner: 'github',
    repoName: 'awesome-copilot',
    remoteDir: 'agents',
    localDir: LOCAL_DIR,
    acceptedExtensions: ['.agent.md', '.md'],
    resourceType: 'agents',
    token: GITHUB_TOKEN
  });
}

syncAgents().catch(error => {
  console.error(error);
  process.exit(1);
});
