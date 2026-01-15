import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fetchGitHubContent, downloadFile } from './github-utils.js';

/**
 * Get all available skill directories from the repository
 */
async function getAvailableSkills(repoOwner, repoName, remoteDir, token) {
  try {
    console.log(chalk.blue(`Fetching available skills from ${repoOwner}/${repoName}...`));
    const contents = await fetchGitHubContent(repoOwner, repoName, remoteDir, token);
    
    // Filter to directories only (skills are directories)
    const skillDirs = contents.filter(item => item.type === 'dir');
    return skillDirs.map(dir => dir.name);
  } catch (error) {
    console.error(chalk.red('Error fetching available skills:'), error.message);
    return [];
  }
}

/**
 * Get all files in a skill directory recursively
 */
async function getSkillFiles(repoOwner, repoName, remoteDir, skillName, subPath, token) {
  const relativePath = subPath ? path.join(skillName, subPath) : skillName;
  const fullPath = path.join(remoteDir, relativePath);
  const contents = await fetchGitHubContent(repoOwner, repoName, fullPath, token);
  
  let files = [];
  
  for (const item of contents) {
    if (item.type === 'file') {
      files.push({
        path: subPath ? path.join(subPath, item.name) : item.name,
        download_url: item.download_url
      });
    } else if (item.type === 'dir') {
      const newSubPath = subPath ? path.join(subPath, item.name) : item.name;
      const subFiles = await getSkillFiles(repoOwner, repoName, remoteDir, skillName, newSubPath, token);
      files.push(...subFiles);
    }
  }
  
  return files;
}

/**
 * Sync a single skill directory
 */
async function syncSkill(repoOwner, repoName, remoteDir, skillName, localDir, token, dryRun) {
  console.log(chalk.blue(`\nSyncing skill: ${skillName}`));
  
  try {
    // Get all files in the skill directory recursively
    const files = await getSkillFiles(repoOwner, repoName, remoteDir, skillName, '', token);
    
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
      const destPath = path.join(localDir, skillName, file.path);
      if (dryRun) {
        console.log(chalk.dim(`  [DRY RUN] Would download: ${file.path}`));
      } else {
        await downloadFile(file.download_url, destPath, token);
        console.log(chalk.dim(`  Downloaded: ${file.path}`));
      }
    }
    
    if (dryRun) {
      console.log(chalk.green(`  ✓ [DRY RUN] Would sync ${skillName} (${files.length} files)`));
    } else {
      console.log(chalk.green(`  ✓ Successfully synced ${skillName} (${files.length} files)`));
    }
    return true;
  } catch (error) {
    console.error(chalk.red(`  ✗ Failed to sync ${skillName}:`), error.message);
    return false;
  }
}

/**
 * Generic sync function for directory-based resources (like Claude Skills)
 * @param {Object} config - Configuration object
 * @param {string} config.repoOwner - GitHub repository owner
 * @param {string} config.repoName - GitHub repository name
 * @param {string} config.remoteDir - Remote directory to sync from
 * @param {string} config.localDir - Local directory to sync to
 * @param {string} config.token - GitHub token (optional)
 * @param {string[]} config.syncPatterns - Optional glob patterns to filter files
 * @param {boolean} config.dryRun - If true, simulate actions without making changes (default: false)
 */
export async function syncSkillsFromGitHub(config) {
  const {
    repoOwner,
    repoName,
    remoteDir,
    localDir,
    token = null,
    syncPatterns = null,
    dryRun = false
  } = config;

  if (dryRun) {
    console.log(chalk.blue.bold(`\n=== [DRY RUN] Syncing skills from ${repoOwner}/${repoName} ===\n`));
    console.log(chalk.yellow('⚠ Dry-run mode: No files will be modified\n'));
  } else {
    console.log(chalk.blue.bold(`\n=== Syncing skills from ${repoOwner}/${repoName} ===\n`));
  }
  
  // Ensure local directory exists
  if (!dryRun) {
    await fs.ensureDir(localDir);
  }
  
  // Load previously synced skills metadata
  const metadataPath = path.join(localDir, '.upstream-sync.json');
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
  const availableSkills = await getAvailableSkills(repoOwner, repoName, remoteDir, token);
  console.log(chalk.blue(`Found ${availableSkills.length} skills in repository\n`));
  
  // Sync all available skills
  const skillsToSync = availableSkills;
  console.log(chalk.blue(`Syncing all ${skillsToSync.length} skills...\n`));
  
  let successCount = 0;
  let failCount = 0;
  let deleteCount = 0;
  
  const syncedSkills = new Set();
  for (const skill of skillsToSync) {
    const success = await syncSkill(repoOwner, repoName, remoteDir, skill, localDir, token, dryRun);
    if (success) {
      successCount++;
      syncedSkills.add(skill);
    } else {
      failCount++;
    }
  }
  
  // Delete local skills that no longer exist upstream
  console.log(chalk.blue('\nChecking for deleted skills...'));
  
  let localSkillDirs = [];
  try {
    if (await fs.pathExists(localDir)) {
      localSkillDirs = await fs.readdir(localDir, { withFileTypes: true });
      
      for (const entry of localSkillDirs) {
        // Note: entry.name !== '.upstream-sync.json' is defensive - the metadata file
        // should be a file, not a directory, but we check explicitly to be safe
        if (entry.isDirectory() && entry.name !== '.upstream-sync.json') {
          const wasSynced = previouslySynced.has(entry.name);
          const existsUpstream = availableSkills.includes(entry.name);
          
          if (wasSynced && !existsUpstream) {
            const skillPath = path.join(localDir, entry.name);
            try {
              if (dryRun) {
                console.log(chalk.yellow(`  [DRY RUN] Would delete skill: ${entry.name}`));
              } else {
                await fs.remove(skillPath);
                console.log(chalk.yellow(`  Deleted skill: ${entry.name}`));
              }
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
  if (!dryRun) {
    try {
      const allSyncedSkills = new Set(previouslySynced);
      syncedSkills.forEach(skill => allSyncedSkills.add(skill));
      
      if (localSkillDirs.length === 0 && await fs.pathExists(localDir)) {
        localSkillDirs = await fs.readdir(localDir, { withFileTypes: true });
      }
      
      const currentSkills = new Set(
        localSkillDirs
          // Note: entry.name !== '.upstream-sync.json' is defensive - the metadata file
          // should be a file, not a directory, but we check explicitly to be safe
          .filter(entry => entry.isDirectory() && entry.name !== '.upstream-sync.json')
          .map(entry => entry.name)
      );
      
      const finalSkills = Array.from(allSyncedSkills).filter(skill => currentSkills.has(skill)).sort();
      const previousFiles = previousMetadata?.files ? [...previousMetadata.files].sort() : [];
      
      const filesChanged = finalSkills.length !== previousFiles.length ||
        finalSkills.some((file, index) => file !== previousFiles[index]);
      
      const metadata = {
        lastSync: filesChanged ? new Date().toISOString() : (previousMetadata?.lastSync ?? new Date().toISOString()),
        source: `${repoOwner}/${repoName}/${remoteDir}`,
        files: finalSkills
      };
      
      await fs.writeJson(metadataPath, metadata, { spaces: 2 });
    } catch (error) {
      console.error(chalk.red('Warning: Failed to save sync metadata:'), error.message);
    }
  } else {
    console.log(chalk.dim('\n[DRY RUN] Would update sync metadata'));
  }
  
  if (dryRun) {
    console.log(chalk.blue.bold('\n=== [DRY RUN] Sync Complete ==='));
    console.log(chalk.green(`✓ Would sync: ${successCount} skills`));
    if (deleteCount > 0) {
      console.log(chalk.yellow(`⚠ Would delete: ${deleteCount} skills`));
    }
    if (failCount > 0) {
      console.log(chalk.red(`✗ Failed to sync: ${failCount} skills`));
      process.exit(1);
    }
  } else {
    console.log(chalk.blue.bold('\n=== Sync Complete ==='));
    console.log(chalk.green(`✓ Successfully synced: ${successCount} skills`));
    if (deleteCount > 0) {
      console.log(chalk.yellow(`⚠ Deleted: ${deleteCount} skills`));
    }
    if (failCount > 0) {
      console.log(chalk.red(`✗ Failed to sync: ${failCount} skills`));
      process.exit(1);
    }
  }
}
