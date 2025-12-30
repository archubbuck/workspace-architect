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
const REPO_OWNER = 'anthropics';
const REPO_NAME = 'skills';
const BASE_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;
const LOCAL_SKILLS_DIR = path.join(__dirname, '../assets/skills');

// Curated list of skills to sync (top valuable ones)
const SKILLS_TO_SYNC = [
  'playwright-tester',
  'code-reviewer',
  'document-processor',
  'data-analyzer',
  'api-integration',
  'security-auditor',
  'performance-optimizer',
  'test-generator',
  'documentation-writer',
  'refactoring-assistant'
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

async function getAvailableSkills() {
  try {
    console.log(chalk.blue('Fetching available skills from anthropics/skills...'));
    const contents = await fetchGitHubContent('');
    
    // Filter to directories only (skills are directories)
    const skillDirs = contents.filter(item => item.type === 'dir');
    return skillDirs.map(dir => dir.name);
  } catch (error) {
    console.error(chalk.red('Error fetching available skills:'), error.message);
    return [];
  }
}

async function syncSkill(skillName) {
  console.log(chalk.blue(`\nSyncing skill: ${skillName}`));
  
  try {
    // Get all files in the skill directory recursively
    const files = await getSkillFiles(skillName, '');
    
    if (files.length === 0) {
      console.warn(chalk.yellow(`  No files found for skill: ${skillName}`));
      return false;
    }
    
    // Check if SKILL.md exists
    if (!files.some(f => f.path === 'SKILL.md')) {
      console.warn(chalk.yellow(`  Skipping ${skillName}: No SKILL.md found`));
      return false;
    }
    
    // Download all files
    for (const file of files) {
      const destPath = path.join(LOCAL_SKILLS_DIR, skillName, file.path);
      await downloadFile(file.download_url, destPath);
      console.log(chalk.dim(`  Downloaded: ${file.path}`));
    }
    
    console.log(chalk.green(`  ✓ Successfully synced ${skillName} (${files.length} files)`));
    return true;
  } catch (error) {
    console.error(chalk.red(`  ✗ Failed to sync ${skillName}:`), error.message);
    return false;
  }
}

async function getSkillFiles(skillName, subPath) {
  const fullPath = subPath ? `${skillName}/${subPath}` : skillName;
  const contents = await fetchGitHubContent(fullPath);
  
  let files = [];
  
  for (const item of contents) {
    if (item.type === 'file') {
      files.push({
        path: subPath ? `${subPath}/${item.name}` : item.name,
        download_url: item.download_url
      });
    } else if (item.type === 'dir') {
      const relativePath = subPath ? `${subPath}/${item.name}` : item.name;
      const subFiles = await getSkillFiles(skillName, relativePath);
      files.push(...subFiles);
    }
  }
  
  return files;
}

async function syncSkills() {
  console.log(chalk.blue.bold('\n=== Syncing Claude Skills from anthropics/skills ===\n'));
  
  // Ensure local skills directory exists
  await fs.ensureDir(LOCAL_SKILLS_DIR);
  
  // Get available skills from repository
  const availableSkills = await getAvailableSkills();
  console.log(chalk.blue(`Found ${availableSkills.length} skills in repository\n`));
  
  // Filter to curated list
  const skillsToSync = SKILLS_TO_SYNC.filter(skill => availableSkills.includes(skill));
  
  if (skillsToSync.length === 0) {
    console.log(chalk.yellow('No skills from curated list found in repository'));
    return;
  }
  
  console.log(chalk.blue(`Syncing ${skillsToSync.length} curated skills...\n`));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const skill of skillsToSync) {
    const success = await syncSkill(skill);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(chalk.blue.bold('\n=== Sync Complete ==='));
  console.log(chalk.green(`✓ Successfully synced: ${successCount} skills`));
  if (failCount > 0) {
    console.log(chalk.red(`✗ Failed to sync: ${failCount} skills`));
  }
  
  if (failCount > 0) {
    process.exit(1);
  }
}

syncSkills().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
