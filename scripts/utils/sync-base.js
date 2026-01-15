import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { downloadFile, getFilesRecursively } from './github-utils.js';
import { getLocalFiles } from './sync-utils.js';

/**
 * Generic sync function for syncing files from a GitHub repository
 * @param {Object} config - Configuration object
 * @param {string} config.repoOwner - GitHub repository owner
 * @param {string} config.repoName - GitHub repository name
 * @param {string} config.remoteDir - Remote directory to sync from
 * @param {string} config.localDir - Local directory to sync to
 * @param {string[]} config.acceptedExtensions - Array of accepted file extensions
 * @param {string} config.resourceType - Type of resource being synced (for logging)
 * @param {string} config.token - GitHub token (optional)
 * @param {string[]} config.syncPatterns - Optional glob patterns to filter files
 * @param {boolean} config.dryRun - If true, simulate actions without making changes (default: false)
 */
export async function syncFromGitHub(config) {
  const {
    repoOwner,
    repoName,
    remoteDir,
    localDir,
    acceptedExtensions,
    resourceType,
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
  
  // Load previously synced files metadata
  const metadataPath = path.join(localDir, '.upstream-sync.json');
  let previouslySynced = new Set();
  let previousMetadata = null;
  if (await fs.pathExists(metadataPath)) {
    try {
      previousMetadata = await fs.readJson(metadataPath);
      previouslySynced = new Set(previousMetadata.files || []);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not read sync metadata, will not delete any files'));
    }
  }
  
  let successCount = 0;
  let failCount = 0;
  let deleteCount = 0;
  
  try {
    console.log(chalk.blue(`Fetching ${resourceType} from ${remoteDir}...`));
    if (syncPatterns && syncPatterns.length > 0) {
      console.log(chalk.dim(`  Using sync patterns: ${syncPatterns.join(', ')}`));
    }
    const files = await getFilesRecursively(repoOwner, repoName, remoteDir, '', acceptedExtensions, token, syncPatterns);
    
    console.log(chalk.blue(`Found ${files.length} ${resourceType} file(s)\n`));
    
    // Track remote file paths
    const remoteFilePaths = new Set(files.map(f => f.path));
    
    for (const file of files) {
      try {
        const destPath = path.join(localDir, file.path);
        if (dryRun) {
          console.log(chalk.dim(`  [DRY RUN] Would download: ${file.path}`));
        } else {
          await downloadFile(file.download_url, destPath, token);
          console.log(chalk.dim(`  Downloaded: ${file.path}`));
        }
        successCount++;
      } catch (error) {
        console.error(chalk.red(`  ✗ Failed to download ${file.path}:`), error.message);
        failCount++;
      }
    }
    
    // Delete local files that no longer exist upstream, but only if they were previously synced
    console.log(chalk.blue(`\nChecking for deleted files...`));
    const localFiles = await getLocalFiles(localDir, acceptedExtensions);
    
    for (const localFile of localFiles) {
      if (!remoteFilePaths.has(localFile) && previouslySynced.has(localFile)) {
        const filePath = path.join(localDir, localFile);
        try {
          if (dryRun) {
            console.log(chalk.yellow(`  [DRY RUN] Would delete: ${localFile}`));
          } else {
            await fs.remove(filePath);
            console.log(chalk.yellow(`  Deleted: ${localFile}`));
          }
          deleteCount++;
        } catch (error) {
          console.error(chalk.red(`  ✗ Failed to delete ${localFile}:`), error.message);
        }
      }
    }
    
    // Save metadata of currently synced files
    // Only update lastSync if the file list has changed
    if (!dryRun) {
      try {
        const currentFiles = Array.from(remoteFilePaths).sort();
        const previousFiles = previousMetadata?.files ? [...previousMetadata.files].sort() : [];
        
        // Check if file lists are different
        // Note: If files fail to download, they won't be in remoteFilePaths, so the comparison
        // may show files changed. However, when failCount > 0 the script exits with code 1 in the
        // failure handling section, preventing the metadata from being committed by CI/workflows.
        const filesChanged = currentFiles.length !== previousFiles.length ||
          currentFiles.some((file, index) => file !== previousFiles[index]);
        
        const metadata = {
          lastSync: filesChanged ? new Date().toISOString() : (previousMetadata?.lastSync ?? new Date().toISOString()),
          source: `${repoOwner}/${repoName}/${remoteDir}`,
          files: currentFiles
        };
        
        await fs.writeJson(metadataPath, metadata, { spaces: 2 });
      } catch (error) {
        console.error(chalk.red('Warning: Failed to save sync metadata:'), error.message);
      }
    } else {
      console.log(chalk.dim('\n[DRY RUN] Would update sync metadata'));
    }
  } catch (error) {
    console.error(chalk.red(`Error fetching ${resourceType}:`), error.message);
    failCount++;
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
