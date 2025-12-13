import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'github';
const REPO_NAME = 'awesome-copilot';
const BASE_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

const MAPPINGS = [
  { remote: 'agents', local: '.github/agents' },
  { remote: 'instructions', local: 'assets/instructions' },
  { remote: 'prompts', local: 'assets/prompts' },
  { remote: 'collections', local: 'assets/collections' }
];

const FILES_TO_DELETE = [
  'basic-setup.md',
  'assets/instructions/basic-setup.md'
];

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

async function downloadFile(downloadUrl, localPath) {
  const headers = {
    'User-Agent': 'node.js'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }
  
  const response = await fetch(downloadUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to download ${downloadUrl}: ${response.statusText}`);
  }
  const content = await response.text();
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(localPath, content);
  console.log(`${chalk.green('Downloaded:')} ${localPath}`);
}

async function sync() {
  console.log(chalk.blue('Starting sync...'));
  
  // Delete legacy files
  for (const file of FILES_TO_DELETE) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`${chalk.red('Deleted:')} ${file}`);
    }
  }

  const errors = [];
  
  // Sync folders
  for (const mapping of MAPPINGS) {
    console.log(chalk.yellow(`Syncing ${mapping.remote} to ${mapping.local}...`));
    try {
      const items = await fetchGitHubContent(mapping.remote);
      
      for (const item of items) {
        if (item.type === 'file') {
          // Filter files based on expected extensions
          const shouldDownload = 
            (mapping.remote === 'agents' && item.name.endsWith('.agent.md')) ||
            (mapping.remote === 'instructions' && item.name.endsWith('.instructions.md')) ||
            (mapping.remote === 'prompts' && item.name.endsWith('.prompt.md')) ||
            (mapping.remote === 'collections' && item.name.endsWith('.json'));
          
          if (shouldDownload) {
            const localFilePath = path.join(__dirname, '..', mapping.local, item.name);
            await downloadFile(item.download_url, localFilePath);
          } else {
            console.log(`${chalk.gray('Skipped:')} ${item.name} (unexpected file type)`);
          }
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error syncing ${mapping.remote}:`), error.message);
      errors.push({ mapping: mapping.remote, error: error.message });
    }
  }
  
  if (errors.length > 0) {
    console.error(chalk.red(`\n❌ Sync failed with ${errors.length} error(s):`));
    errors.forEach(({ mapping, error }) => {
      console.error(chalk.red(`  - ${mapping}: ${error}`));
    });
    process.exit(1);
  }
  
  console.log(chalk.blue('✅ Sync complete!'));
}

sync().catch(error => {
  console.error(chalk.red('Fatal error during sync:'), error);
  process.exit(1);
});
