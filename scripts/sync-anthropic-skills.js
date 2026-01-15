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

// Sync all available skills from the repository
// Set to null to sync all skills, or provide an array to filter specific skills
const SKILLS_TO_SYNC = null; // null means sync all available skills

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
    const contents = await fetchGitHubContent('skills');
    
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
  const relativePath = subPath ? path.join(skillName, subPath) : skillName;
  const fullPath = path.join('skills', relativePath);
  const contents = await fetchGitHubContent(fullPath);
  
  let files = [];
  
  for (const item of contents) {
    if (item.type === 'file') {
      files.push({
        path: subPath ? path.join(subPath, item.name) : item.name,
        download_url: item.download_url
      });
    } else if (item.type === 'dir') {
      const newSubPath = subPath ? path.join(subPath, item.name) : item.name;
      const subFiles = await getSkillFiles(skillName, newSubPath);
      files.push(...subFiles);
    }
  }
  
  return files;
}

async function syncSkills() {
  console.log(chalk.blue.bold('\n=== Syncing Claude Skills from anthropics/skills ===\n'));
  
  // Ensure local skills directory exists
  await fs.ensureDir(LOCAL_SKILLS_DIR);
  
  // Load previously synced skills metadata
  const metadataPath = path.join(LOCAL_SKILLS_DIR, '.upstream-sync.json');
  let previouslySynced = new Set();
  if (await fs.pathExists(metadataPath)) {
    try {
      const metadata = await fs.readJson(metadataPath);
      previouslySynced = new Set(metadata.skills || []);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not read sync metadata, will not delete any skills'));
    }
  }
  
  // Get available skills from repository
  const availableSkills = await getAvailableSkills();
  console.log(chalk.blue(`Found ${availableSkills.length} skills in repository\n`));
  
  // Determine which skills to sync
  let skillsToSync;
  if (SKILLS_TO_SYNC === null || !Array.isArray(SKILLS_TO_SYNC)) {
    // Sync all available skills
    skillsToSync = availableSkills;
    console.log(chalk.blue(`Syncing all ${skillsToSync.length} skills...\n`));
  } else {
    // Filter to curated list
    skillsToSync = SKILLS_TO_SYNC.filter(skill => availableSkills.includes(skill));
    
    if (skillsToSync.length === 0) {
      console.log(chalk.yellow('No skills from curated list found in repository'));
      return;
    }
    
    console.log(chalk.blue(`Syncing ${skillsToSync.length} curated skills...\n`));
  }
  
  let successCount = 0;
  let failCount = 0;
  let deleteCount = 0;
  
  const syncedSkills = new Set();
  for (const skill of skillsToSync) {
    const success = await syncSkill(skill);
    if (success) {
      successCount++;
      syncedSkills.add(skill);
    } else {
      failCount++;
    }
  }
  
  // Delete local skills that no longer exist upstream, but only if they were previously synced
  console.log(chalk.blue('\nChecking for deleted skills...'));
  try {
    // Check if directory exists before reading
    if (await fs.pathExists(LOCAL_SKILLS_DIR)) {
      const localSkillDirs = await fs.readdir(LOCAL_SKILLS_DIR, { withFileTypes: true });
      
      for (const entry of localSkillDirs) {
        // Skip metadata file and only process directories
        if (entry.isDirectory() && entry.name !== '.upstream-sync.json') {
          // Only delete if:
          // 1. The skill was previously synced from upstream (tracked in metadata)
          // 2. AND it no longer exists in the upstream repository
          const wasSynced = previouslySynced.has(entry.name);
          const stillExists = availableSkills.includes(entry.name);
          
          if (wasSynced && !stillExists) {
            const skillPath = path.join(LOCAL_SKILLS_DIR, entry.name);
            try {
              await fs.remove(skillPath);
              console.log(chalk.yellow(`  Deleted skill: ${entry.name}`));
              deleteCount++;
            } catch (error) {
              console.error(chalk.red(`  ✗ Failed to delete skill ${entry.name}:`), error.message);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('Error checking for deleted skills:'), error.message);
  }
  
  // Save metadata of currently synced skills
  try {
    await fs.writeJson(metadataPath, {
      lastSync: new Date().toISOString(),
      source: `${REPO_OWNER}/${REPO_NAME}/skills`,
      skills: Array.from(syncedSkills)
    }, { spaces: 2 });
  } catch (error) {
    console.error(chalk.red('Warning: Failed to save sync metadata:'), error.message);
  }
  
  console.log(chalk.blue.bold('\n=== Sync Complete ==='));
  console.log(chalk.green(`✓ Successfully synced: ${successCount} skills`));
  if (deleteCount > 0) {
    console.log(chalk.yellow(`⚠ Deleted: ${deleteCount} skills`));
  }
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
