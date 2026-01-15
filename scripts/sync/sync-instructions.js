import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from '../utils/env-loader.js';
import { syncFromGitHub } from '../utils/sync-base.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const LOCAL_DIR = path.join(__dirname, '../../assets/instructions');

async function syncInstructions() {
  await syncFromGitHub({
    repoOwner: 'github',
    repoName: 'awesome-copilot',
    remoteDir: 'instructions',
    localDir: LOCAL_DIR,
    acceptedExtensions: ['.instructions.md', '.md'],
    resourceType: 'instructions',
    token: GITHUB_TOKEN
  });
}

syncInstructions().catch(error => {
  console.error(error);
  process.exit(1);
});
