import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fetchGitHubContent, downloadFile, getFilesRecursively } from './github-utils.js';
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
 */
export async function syncFromGitHub(config) {
  const {
    repoOwner,
    repoName,
    remoteDir,
    localDir,
    acceptedExtensions,
    resourceType,
    token = null
  } = config;

  console.log(chalk.blue.bold(`\n=== Syncing ${resourceType} from ${repoOwner}/${repoName} ===\n`));
  
  // Ensure local directory exists
  await fs.ensureDir(localDir);
  
  // Load previously synced files metadata
  const metadataPath = path.join(localDir, '.upstream-sync.json');
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
    console.log(chalk.blue(`Fetching ${resourceType} from ${remoteDir}...`));
    const files = await getFilesRecursively(repoOwner, repoName, remoteDir, '', acceptedExtensions, token);
    
    console.log(chalk.blue(`Found ${files.length} ${resourceType} file(s)\n`));
    
    // Track remote file paths
    const remoteFilePaths = new Set(files.map(f => f.path));
    
    for (const file of files) {
      try {
        const destPath = path.join(localDir, file.path);
        await downloadFile(file.download_url, destPath, token);
        console.log(chalk.dim(`  Downloaded: ${file.path}`));
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
        source: `${repoOwner}/${repoName}/${remoteDir}`,
        files: Array.from(remoteFilePaths)
      }, { spaces: 2 });
    } catch (error) {
      console.error(chalk.red('Warning: Failed to save sync metadata:'), error.message);
    }
  } catch (error) {
    console.error(chalk.red(`Error fetching ${resourceType}:`), error.message);
    failCount++;
  }
  
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
