import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { loadEnv } from '../utils/env-loader.js';
import { fetchGitHubContent, downloadFile } from '../utils/github-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'anthropics';
const REPO_NAME = 'skills';
const LOCAL_SKILLS_DIR = path.join(__dirname, '../../assets/skills');

// Sync all available skills from the repository
// Set to null to sync all skills, or provide an array to filter specific skills
const SKILLS_TO_SYNC = null; // null means sync all available skills

async function getAvailableSkills() {
  try {
    console.log(chalk.blue('Fetching available skills from anthropics/skills...'));
    const contents = await fetchGitHubContent(REPO_OWNER, REPO_NAME, 'skills', GITHUB_TOKEN);
    
    // Filter to directories only (skills are directories)
    const skillDirs = contents.filter(item => item.type === 'dir');
    return skillDirs.map(dir => dir.name);
  } catch (error) {
    console.error(chalk.red('Error fetching available skills:'), error.message);
    return [];
  }
}

async function getSkillFiles(skillName, subPath) {
  const relativePath = subPath ? path.join(skillName, subPath) : skillName;
  const fullPath = path.join('skills', relativePath);
  const contents = await fetchGitHubContent(REPO_OWNER, REPO_NAME, fullPath, GITHUB_TOKEN);
  
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
      await downloadFile(file.download_url, destPath, GITHUB_TOKEN);
      console.log(chalk.dim(`  Downloaded: ${file.path}`));
    }
    
    console.log(chalk.green(`  ✓ Successfully synced ${skillName} (${files.length} files)`));
    return true;
  } catch (error) {
    console.error(chalk.red(`  ✗ Failed to sync ${skillName}:`), error.message);
    return false;
  }
}

async function syncSkills() {
  console.log(chalk.blue.bold('\n=== Syncing Claude Skills from anthropics/skills ===\n'));
  
  // Ensure local skills directory exists
  await fs.ensureDir(LOCAL_SKILLS_DIR);
  
  // Load previously synced skills metadata
  const metadataPath = path.join(LOCAL_SKILLS_DIR, '.upstream-sync.json');
  let previouslySynced = new Set();
  let previousMetadata = null;
  if (await fs.pathExists(metadataPath)) {
    try {
      previousMetadata = await fs.readJson(metadataPath);
      previouslySynced = new Set(previousMetadata.files || []);
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
  
  // Delete local skills that are no longer relevant, but only if they were previously synced:
  // 1. If syncing all skills, delete ones that no longer exist upstream.
  // 2. If in curated mode, also delete ones that are not in the current curated list.
  console.log(chalk.blue('\nChecking for deleted skills...'));
  
  // Determine if we're in curated mode
  const isCuratedMode = (SKILLS_TO_SYNC !== null && Array.isArray(SKILLS_TO_SYNC));
  
  let localSkillDirs = [];
  try {
    // Check if directory exists before reading
    if (await fs.pathExists(LOCAL_SKILLS_DIR)) {
      localSkillDirs = await fs.readdir(LOCAL_SKILLS_DIR, { withFileTypes: true });
      
      for (const entry of localSkillDirs) {
        // Skip metadata file and only process directories
        if (entry.isDirectory() && entry.name !== '.upstream-sync.json') {
          // Only delete if:
          // 1. The skill was previously synced from upstream (tracked in metadata)
          // 2a. It no longer exists in the upstream repository, OR
          // 2b. We're in curated mode and it's not in the current curated list
          const wasSynced = previouslySynced.has(entry.name);
          const existsUpstream = availableSkills.includes(entry.name);
          const inCuratedList = skillsToSync.includes(entry.name);
          
          if (wasSynced && (!existsUpstream || (isCuratedMode && !inCuratedList))) {
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
  
  // Save metadata of currently synced skills - accumulate with previous metadata
  // Only update lastSync if the file list has changed
  try {
    // Start with previously synced skills and add newly synced ones
    const allSyncedSkills = new Set(previouslySynced);
    syncedSkills.forEach(skill => allSyncedSkills.add(skill));
    
    // Reuse localSkillDirs if available, otherwise read directory
    if (localSkillDirs.length === 0 && await fs.pathExists(LOCAL_SKILLS_DIR)) {
      localSkillDirs = await fs.readdir(LOCAL_SKILLS_DIR, { withFileTypes: true });
    }
    
    const currentSkills = new Set(
      localSkillDirs
        .filter(entry => entry.isDirectory() && entry.name !== '.upstream-sync.json')
        .map(entry => entry.name)
    );
    
    // Only keep skills in metadata that still exist locally
    const finalSkills = Array.from(allSyncedSkills).filter(skill => currentSkills.has(skill)).sort();
    const previousFiles = previousMetadata?.files ? [...previousMetadata.files].sort() : [];
    
    // Check if file lists are different
    const filesChanged = finalSkills.length !== previousFiles.length ||
      finalSkills.some((file, index) => file !== previousFiles[index]);
    
    const metadata = {
      lastSync: filesChanged ? new Date().toISOString() : (previousMetadata?.lastSync ?? new Date().toISOString()),
      source: `${REPO_OWNER}/${REPO_NAME}/skills`,
      files: finalSkills
    };
    
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
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
