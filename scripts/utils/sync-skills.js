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
 * Sync a single directory-based asset
 */
async function syncAsset(repoOwner, repoName, remoteDir, assetName, localDir, token, dryRun, requiredFile = 'SKILL.md') {
  console.log(chalk.blue(`\nSyncing asset: ${assetName}`));
  
  try {
    // Get all files in the asset directory recursively
    const files = await getSkillFiles(repoOwner, repoName, remoteDir, assetName, '', token);
    
    if (files.length === 0) {
      console.warn(chalk.yellow(`  No files found for asset: ${assetName}`));
      return false;
    }
    
    // Check if required file exists (SKILL.md for skills, README.md for hooks/plugins)
    if (!files.some(f => f.path === requiredFile)) {
      console.warn(chalk.yellow(`  Skipping ${assetName}: No ${requiredFile} found`));
      return false;
    }
    
    // Download all files
    for (const file of files) {
      const destPath = path.join(localDir, assetName, file.path);
      if (dryRun) {
        console.log(chalk.dim(`  [DRY RUN] Would download: ${file.path}`));
      } else {
        await downloadFile(file.download_url, destPath, token);
        console.log(chalk.dim(`  Downloaded: ${file.path}`));
      }
    }
    
    if (dryRun) {
      console.log(chalk.green(`  ✓ [DRY RUN] Would sync ${assetName} (${files.length} files)`));
    } else {
      console.log(chalk.green(`  ✓ Successfully synced ${assetName} (${files.length} files)`));
    }
    return true;
  } catch (error) {
    console.error(chalk.red(`  ✗ Failed to sync ${assetName}:`), error.message);
    return false;
  }
}

/**
 * Deprecated: Use syncAsset instead
 * Kept for backwards compatibility if needed
 */
async function syncSkill(repoOwner, repoName, remoteDir, skillName, localDir, token, dryRun) {
  return syncAsset(repoOwner, repoName, remoteDir, skillName, localDir, token, dryRun, 'SKILL.md');
}

/**
 * Generic sync function for directory-based resources (like Skills, Hooks, Plugins)
 * @param {Object} config - Configuration object
 * @param {string} config.repoOwner - GitHub repository owner
 * @param {string} config.repoName - GitHub repository name
 * @param {string} config.remoteDir - Remote directory to sync from
 * @param {string} config.localDir - Local directory to sync to
 * @param {string} config.resourceType - Type of resource (skills, hooks, plugins)
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
    resourceType = 'skills', // Default to 'skills' for backward compatibility
    token = null,
    syncPatterns = null,
    dryRun = false
  } = config;

  if (dryRun) {
    console.log(chalk.blue.bold(`\n=== [DRY RUN] Syncing ${resourceType} from ${repoOwner}/${repoName} ===\n`));
    console.log(chalk.yellow('⚠ Dry-run mode: No files will be modified\n'));
  } else {
    console.log(chalk.blue.bold(`\n=== Syncing ${resourceType} from ${repoOwner}/${repoName} ===\n`));
  }
  
  // Ensure local directory exists
  if (!dryRun) {
    await fs.ensureDir(localDir);
  }
  
  // Load previously synced assets metadata
  const metadataPath = path.join(localDir, '.upstream-sync.json');
  let previouslySynced = new Set();
  let previousMetadata = null;
  const currentSource = `${repoOwner}/${repoName}/${remoteDir}`;
  
  if (await fs.pathExists(metadataPath)) {
    try {
      previousMetadata = await fs.readJson(metadataPath);
      
      // Support both old format (single source) and new format (multiple sources)
      if (previousMetadata.sources && Array.isArray(previousMetadata.sources)) {
        // New format: find files from the current source
        const sourceEntry = previousMetadata.sources.find(s => s.source === currentSource);
        if (sourceEntry) {
          previouslySynced = new Set(sourceEntry.files || []);
        }
      } else if (previousMetadata.source && previousMetadata.files) {
        // Old format: migrate to new format if source matches
        if (previousMetadata.source === currentSource) {
          previouslySynced = new Set(previousMetadata.files || []);
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not read sync metadata, will not delete any ${resourceType}`));
    }
  }
  
  // Get available assets from repository
  const availableAssets = await getAvailableSkills(repoOwner, repoName, remoteDir, token);
  console.log(chalk.blue(`Found ${availableAssets.length} ${resourceType} in repository\n`));
  
  // Sync all available assets
  const assetsToSync = availableAssets;
  console.log(chalk.blue(`Syncing all ${assetsToSync.length} ${resourceType}...\n`));
  
  let successCount = 0;
  let failCount = 0;
  let deleteCount = 0;
  
  // Determine the required metadata file based on resource type
  const requiredFile = resourceType === 'skills' ? 'SKILL.md' : 'README.md';
  
  const syncedAssets = new Set();
  for (const asset of assetsToSync) {
    const success = await syncAsset(repoOwner, repoName, remoteDir, asset, localDir, token, dryRun, requiredFile);
    if (success) {
      successCount++;
      syncedAssets.add(asset);
    } else {
      failCount++;
    }
  }
  
  // Delete local assets that no longer exist upstream
  console.log(chalk.blue(`\nChecking for deleted ${resourceType}...`));
  
  let localAssetDirs = [];
  try {
    if (await fs.pathExists(localDir)) {
      localAssetDirs = await fs.readdir(localDir, { withFileTypes: true });
      
      for (const entry of localAssetDirs) {
        // Note: entry.name !== '.upstream-sync.json' is defensive - the metadata file
        // should be a file, not a directory, but we check explicitly to be safe
        if (entry.isDirectory() && entry.name !== '.upstream-sync.json') {
          const wasSynced = previouslySynced.has(entry.name);
          const existsUpstream = availableAssets.includes(entry.name);
          
          if (wasSynced && !existsUpstream) {
            const assetPath = path.join(localDir, entry.name);
            try {
              if (dryRun) {
                console.log(chalk.yellow(`  [DRY RUN] Would delete ${resourceType.slice(0, -1)}: ${entry.name}`));
              } else {
                await fs.remove(assetPath);
                console.log(chalk.yellow(`  Deleted ${resourceType.slice(0, -1)}: ${entry.name}`));
              }
              deleteCount++;
            } catch (error) {
              console.error(chalk.red(`  ✗ Failed to delete ${resourceType.slice(0, -1)} ${entry.name}:`), error.message);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error checking for deleted ${resourceType}:`), error.message);
  }
  
  // Save metadata of currently synced assets
  if (!dryRun) {
    try {
      const allSyncedAssets = new Set(previouslySynced);
      syncedAssets.forEach(asset => allSyncedAssets.add(asset));
      
      if (localAssetDirs.length === 0 && await fs.pathExists(localDir)) {
        localAssetDirs = await fs.readdir(localDir, { withFileTypes: true });
      }
      
      const currentAssets = new Set(
        localAssetDirs
          // Note: entry.name !== '.upstream-sync.json' is defensive - the metadata file
          // should be a file, not a directory, but we check explicitly to be safe
          .filter(entry => entry.isDirectory() && entry.name !== '.upstream-sync.json')
          .map(entry => entry.name)
      );
      
      const finalAssets = Array.from(allSyncedAssets).filter(asset => currentAssets.has(asset)).sort();
      
      // Prepare sources array - migrate old format or update existing new format
      let sources = [];
      
      // Load existing sources from new format or convert from old format
      if (previousMetadata) {
        if (previousMetadata.sources && Array.isArray(previousMetadata.sources)) {
          // New format: copy existing sources
          sources = [...previousMetadata.sources];
        } else if (previousMetadata.source && previousMetadata.files) {
          // Old format: convert to new format
          sources = [{
            source: previousMetadata.source,
            lastSync: previousMetadata.lastSync,
            files: previousMetadata.files
          }];
        }
      }
      
      // Find or create entry for current source
      const existingSourceIndex = sources.findIndex(s => s.source === currentSource);
      const previousFiles = existingSourceIndex >= 0 
        ? [...sources[existingSourceIndex].files].sort()
        : [];
      
      const filesChanged = finalSkills.length !== previousFiles.length ||
        finalSkills.some((file, index) => file !== previousFiles[index]);
      
      const sourceEntry = {
        source: currentSource,
        lastSync: filesChanged 
          ? new Date().toISOString() 
          : (existingSourceIndex >= 0 ? sources[existingSourceIndex].lastSync : new Date().toISOString()),
        files: finalSkills
      };
      
      // Update or add the source entry
      if (existingSourceIndex >= 0) {
        sources[existingSourceIndex] = sourceEntry;
      } else {
        sources.push(sourceEntry);
      }
      
      // Create new metadata structure
      const metadata = { sources };
      
      await fs.writeJson(metadataPath, metadata, { spaces: 2 });
    } catch (error) {
      console.error(chalk.red('Warning: Failed to save sync metadata:'), error.message);
    }
  } else {
    console.log(chalk.dim('\n[DRY RUN] Would update sync metadata'));
  }
  
  if (dryRun) {
    console.log(chalk.blue.bold('\n=== [DRY RUN] Sync Complete ==='));
    console.log(chalk.green(`✓ Would sync: ${successCount} ${resourceType}`));
    if (deleteCount > 0) {
      console.log(chalk.yellow(`⚠ Would delete: ${deleteCount} ${resourceType}`));
    }
    if (failCount > 0) {
      console.log(chalk.red(`✗ Failed to sync: ${failCount} ${resourceType}`));
      process.exit(1);
    }
  } else {
    console.log(chalk.blue.bold('\n=== Sync Complete ==='));
    console.log(chalk.green(`✓ Successfully synced: ${successCount} ${resourceType}`));
    if (deleteCount > 0) {
      console.log(chalk.yellow(`⚠ Deleted: ${deleteCount} ${resourceType}`));
    }
    if (failCount > 0) {
      console.log(chalk.red(`✗ Failed to sync: ${failCount} ${resourceType}`));
      process.exit(1);
    }
  }
}
