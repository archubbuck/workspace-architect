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

async function getFilesRecursively(remotePath, subPath = '') {
  const fullPath = subPath ? path.join(remotePath, subPath) : remotePath;
  const contents = await fetchGitHubContent(fullPath);
  
  let files = [];
  
  for (const item of contents) {
    if (item.type === 'file') {
      // Check if file matches accepted extensions
      if (ACCEPTED_EXTENSIONS.some(ext => item.name.endsWith(ext))) {
        files.push({
          path: subPath ? path.join(subPath, item.name) : item.name,
          download_url: item.download_url
        });
      }
    } else if (item.type === 'dir') {
      // Recursively get files from subdirectories
      const newSubPath = subPath ? path.join(subPath, item.name) : item.name;
      const subFiles = await getFilesRecursively(remotePath, newSubPath);
      files.push(...subFiles);
    }
  }
  
  return files;
}

async function getLocalFiles(directory, baseDir = directory) {
  // Check if directory exists first
  if (!await fs.pathExists(directory)) {
    return [];
  }
  
  const entries = await fs.readdir(directory, { withFileTypes: true });
  let files = [];
  
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    // Skip metadata file
    if (entry.name === '.upstream-sync.json') {
      continue;
    }
    if (entry.isDirectory()) {
      const subFiles = await getLocalFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() && ACCEPTED_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      files.push(path.relative(baseDir, fullPath));
    }
  }
  
  return files;
}

async function syncPrompts() {
  console.log(chalk.blue.bold(`\n=== Syncing Prompts from ${REPO_OWNER}/${REPO_NAME} ===\n`));
  
  // Ensure local directory exists
  await fs.ensureDir(LOCAL_DIR);
  
  // Load previously synced files metadata
  const metadataPath = path.join(LOCAL_DIR, '.upstream-sync.json');
  let previouslySynced = new Set();
  if (await fs.pathExists(metadataPath)) {
    try {
      const metadata = await fs.readJson(metadataPath);
      previouslySynced = new Set(metadata.files || []);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not read sync metadata, will not delete any files'));
    }
  }
  
  let successCount = 0;
  let failCount = 0;
  let deleteCount = 0;
  
  try {
    console.log(chalk.blue(`Fetching prompts from ${REMOTE_DIR}...`));
    const files = await getFilesRecursively(REMOTE_DIR);
    
    console.log(chalk.blue(`Found ${files.length} prompt file(s)\n`));
    
    // Track remote file paths
    const remoteFilePaths = new Set(files.map(f => f.path));
    
    for (const file of files) {
      try {
        const destPath = path.join(LOCAL_DIR, file.path);
        await downloadFile(file.download_url, destPath);
        console.log(chalk.dim(`  Downloaded: ${file.path}`));
        successCount++;
      } catch (error) {
        console.error(chalk.red(`  ✗ Failed to download ${file.path}:`), error.message);
        failCount++;
      }
    }
    
    // Delete local files that no longer exist upstream, but only if they were previously synced
    console.log(chalk.blue(`\nChecking for deleted files...`));
    const localFiles = await getLocalFiles(LOCAL_DIR);
    
    for (const localFile of localFiles) {
      if (!remoteFilePaths.has(localFile) && previouslySynced.has(localFile)) {
        const filePath = path.join(LOCAL_DIR, localFile);
        try {
          await fs.remove(filePath);
          console.log(chalk.yellow(`  Deleted: ${localFile}`));
          deleteCount++;
        } catch (error) {
          console.error(chalk.red(`  ✗ Failed to delete ${localFile}:`), error.message);
        }
      }
    }
    
    // Save metadata of currently synced files
    try {
      await fs.writeJson(metadataPath, {
        lastSync: new Date().toISOString(),
        source: `${REPO_OWNER}/${REPO_NAME}/${REMOTE_DIR}`,
        files: Array.from(remoteFilePaths)
      }, { spaces: 2 });
    } catch (error) {
      console.error(chalk.red('Warning: Failed to save sync metadata:'), error.message);
    }
  } catch (error) {
    console.error(chalk.red('Error fetching prompts:'), error.message);
    failCount++;
  }
  
  console.log(chalk.blue.bold('\n=== Sync Complete ==='));
  console.log(chalk.green(`✓ Successfully synced: ${successCount} prompts`));
  if (deleteCount > 0) {
    console.log(chalk.yellow(`⚠ Deleted: ${deleteCount} prompts`));
  }
  if (failCount > 0) {
    console.log(chalk.red(`✗ Failed to sync: ${failCount} prompts`));
    process.exit(1);
  }
}

syncPrompts().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
