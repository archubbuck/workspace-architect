import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually with improved parsing
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    // Skip empty lines and comments
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }
    
    // Split only on the first '=' to handle values with '=' in them
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      return;
    }
    
    const key = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1).trim();
    
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    if (key) {
      process.env[key] = value;
    }
  });
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'github';
const REPO_NAME = 'awesome-copilot';
const BASE_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;
const REMOTE_DIR = 'prompts';
const LOCAL_DIR = path.join(__dirname, '../assets/prompts');
// Accepted file extensions for prompts
const ACCEPTED_EXTENSIONS = ['.prompt.md', '.md'];

async function fetchGitHubContent(path) {
  const url = `${BASE_API_URL}/${path}`;
  const headers = {
    'User-Agent': 'node.js',
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

async function downloadFile(url, destPath) {
  const headers = {
    'User-Agent': 'node.js'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  
  const content = await response.text();
  await fs.ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, content);
}

async function syncPrompts() {
  console.log(chalk.blue.bold(`\n=== Syncing Prompts from ${REPO_OWNER}/${REPO_NAME} ===\n`));
  
  // Ensure local directory exists
  await fs.ensureDir(LOCAL_DIR);
  
  let successCount = 0;
  let failCount = 0;
  
  try {
    console.log(chalk.blue(`Fetching prompts from ${REMOTE_DIR}...`));
    const items = await fetchGitHubContent(REMOTE_DIR);
    
    const promptFiles = items.filter(item => 
      item.type === 'file' && ACCEPTED_EXTENSIONS.some(ext => item.name.endsWith(ext))
    );
    
    console.log(chalk.blue(`Found ${promptFiles.length} prompt files\n`));
    
    for (const item of promptFiles) {
      try {
        const destPath = path.join(LOCAL_DIR, item.name);
        await downloadFile(item.download_url, destPath);
        console.log(chalk.dim(`  Downloaded: ${item.name}`));
        successCount++;
      } catch (error) {
        console.error(chalk.red(`  ✗ Failed to download ${item.name}:`), error.message);
        failCount++;
      }
    }
  } catch (error) {
    console.error(chalk.red('Error fetching prompts:'), error.message);
    failCount++;
  }
  
  console.log(chalk.blue.bold('\n=== Sync Complete ==='));
  console.log(chalk.green(`✓ Successfully synced: ${successCount} prompts`));
  if (failCount > 0) {
    console.log(chalk.red(`✗ Failed to sync: ${failCount} prompts`));
    process.exit(1);
  }
}

syncPrompts().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
