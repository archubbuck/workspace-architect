#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { loadEnv } from './utils/env-loader.js';
import { syncFromGitHub } from './utils/sync-base.js';
import { loadUpstreamConfig } from './utils/config-loader.js';
import { syncSkillsFromGitHub } from './utils/sync-skills.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnv();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
 * Display usage information
 */
function displayUsage() {
  console.log(chalk.blue.bold('\nGeneric Repository Sync Tool\n'));
  console.log('Usage: node scripts/sync-repo.js <resource-type> [options]\n');
  console.log('Resource Types:');
  console.log('  agents        - Sync agents from upstream repository');
  console.log('  instructions  - Sync instructions from upstream repository');
  console.log('  prompts       - Sync prompts from upstream repository');
  console.log('  collections   - Sync collections from upstream repository');
  console.log('  skills        - Sync Claude skills from upstream repository');
  console.log('  all           - Sync all resources\n');
  console.log('Options:');
  console.log('  --dry-run     - Simulate sync without making changes');
  console.log('  --help, -h    - Display this help message\n');
  console.log('Examples:');
  console.log('  node scripts/sync-repo.js agents');
  console.log('  node scripts/sync-repo.js skills --dry-run');
  console.log('  node scripts/sync-repo.js all\n');
}

/**
 * Parse command-line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    displayUsage();
    process.exit(0);
  }
  
  const resourceType = args[0];
  const dryRun = args.includes('--dry-run');
  
  return { resourceType, dryRun };
}

/**
 * Sync a single resource based on configuration
 */
async function syncResource(resourceType, config, dryRun) {
  const resourceConfig = config.resources[resourceType];
  
  if (!resourceConfig) {
    throw new Error(`Unknown resource type: ${resourceType}. Valid types are: ${Object.keys(config.resources).join(', ')}`);
  }
  
  // Validate repo format
  if (!resourceConfig.repo || !resourceConfig.repo.includes('/')) {
    throw new Error(`Invalid repo format for ${resourceType}: ${resourceConfig.repo}. Expected format: owner/name`);
  }
  
  const repoParts = resourceConfig.repo.split('/');
  if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
    throw new Error(`Invalid repo format for ${resourceType}: ${resourceConfig.repo}. Expected format: owner/name`);
  }
  
  const [repoOwner, repoName] = repoParts;
  const localDir = path.join(__dirname, '..', resourceConfig.localDir);
  
  // Check if this is a special directory-based sync (like skills)
  if (resourceConfig.syncMode === 'directory') {
    await syncSkillsFromGitHub({
      repoOwner,
      repoName,
      remoteDir: resourceConfig.remoteDir,
      localDir,
      token: GITHUB_TOKEN,
      syncPatterns: resourceConfig.syncPatterns || null,
      dryRun
    });
  } else {
    // Standard file-based sync
    await syncFromGitHub({
      repoOwner,
      repoName,
      remoteDir: resourceConfig.remoteDir,
      localDir,
      acceptedExtensions: resourceConfig.acceptedExtensions || [],
      resourceType,
      token: GITHUB_TOKEN,
      syncPatterns: resourceConfig.syncPatterns || null,
      dryRun
    });
  }
}

/**
 * Main sync function
 */
async function sync() {
  try {
    const { resourceType, dryRun } = parseArguments();
    
    // Load configuration
    const config = await loadUpstreamConfig();
    
    if (!config.resources) {
      throw new Error('Configuration does not contain a "resources" section. Please update upstream.config.json');
    }
    
    if (resourceType === 'all') {
      // Sync all resources
      console.log(chalk.blue.bold('\n=== Syncing All Resources ===\n'));
      const resourceTypes = Object.keys(config.resources);
      
      for (const type of resourceTypes) {
        try {
          await syncResource(type, config, dryRun);
          console.log(); // Add spacing between resources
        } catch (error) {
          console.error(chalk.red(`\nFailed to sync ${type}:`), error.message);
          process.exit(1);
        }
      }
      
      console.log(chalk.green.bold('\n✓ All resources synced successfully\n'));
    } else {
      // Sync a single resource
      await syncResource(resourceType, config, dryRun);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

sync().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
