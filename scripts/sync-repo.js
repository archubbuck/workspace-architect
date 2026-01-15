#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { loadEnv } from './utils/env-loader.js';
import { syncFromGitHub } from './utils/sync-base.js';
import { loadUpstreamConfig } from './utils/config-loader.js';
import { syncSkillsFromGitHub } from './utils/sync-skills.js';
import { spawn } from 'child_process';

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
 * Find resource configuration by searching through all repos
 */
function findResourceConfig(config, resourceType) {
  if (!config.repos || !Array.isArray(config.repos)) {
    throw new Error('Configuration does not contain a "repos" array. Please update upstream.config.json');
  }
  
  for (const repo of config.repos) {
    if (repo.assets && repo.assets[resourceType]) {
      return {
        repoName: repo.name,
        branch: repo.branch || 'main',
        asset: repo.assets[resourceType],
        resourceType
      };
    }
  }
  
  // If not found, list available resources
  const availableResources = [];
  for (const repo of config.repos) {
    if (repo.assets) {
      availableResources.push(...Object.keys(repo.assets));
    }
  }
  
  throw new Error(`Unknown resource type: ${resourceType}. Valid types are: ${availableResources.join(', ')}`);
}

/**
 * Get all available resource types from config
 */
function getAllResourceTypes(config) {
  const resourceTypes = new Set();
  
  if (config.repos && Array.isArray(config.repos)) {
    for (const repo of config.repos) {
      if (repo.assets) {
        Object.keys(repo.assets).forEach(type => resourceTypes.add(type));
      }
    }
  }
  
  return Array.from(resourceTypes);
}

/**
 * Determine accepted extensions based on resource type
 */
function getAcceptedExtensions(resourceType) {
  const extensionMap = {
    'agents': ['.agent.md', '.md'],
    'instructions': ['.instructions.md', '.md'],
    'prompts': ['.prompt.md', '.md'],
    'collections': ['.json', '.yml', '.yaml'],
    'skills': [] // Skills use directory-based sync
  };
  
  return extensionMap[resourceType] || [];
}

/**
 * Determine sync patterns based on resource type and from path
 */
function getSyncPatterns(resourceType, fromPath) {
  const patternMap = {
    'agents': [`${fromPath}/**/*.md`],
    'instructions': [`${fromPath}/**/*.md`],
    'prompts': [`${fromPath}/**/*.md`],
    'collections': [`${fromPath}/**/*.yml`, `${fromPath}/**/*.yaml`],
    'skills': [`${fromPath}/**/SKILL.md`, `${fromPath}/**/*.py`]
  };
  
  return patternMap[resourceType] || [`${fromPath}/**/*`];
}

/**
 * Sync a single resource based on configuration
 */
async function syncResource(resourceType, config, dryRun) {
  const resourceConfig = findResourceConfig(config, resourceType);
  
  // Validate repo format
  if (!resourceConfig.repoName || !resourceConfig.repoName.includes('/')) {
    throw new Error(`Invalid repo format for ${resourceType}: ${resourceConfig.repoName}. Expected format: owner/name`);
  }
  
  const repoParts = resourceConfig.repoName.split('/');
  if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
    throw new Error(`Invalid repo format for ${resourceType}: ${resourceConfig.repoName}. Expected format: owner/name`);
  }
  
  const [repoOwner, repoName] = repoParts;
  const remoteDir = resourceConfig.asset.from;
  const localDir = path.join(__dirname, '..', resourceConfig.asset.to);
  const branch = resourceConfig.branch; // Note: Currently not used - GitHub API defaults to main branch
  // TODO: Add branch support to github-utils.js functions to use ?ref=${branch} parameter
  
  // Determine if this is a directory-based sync (like skills)
  const isDirectorySync = resourceType === 'skills';
  
  if (isDirectorySync) {
    await syncSkillsFromGitHub({
      repoOwner,
      repoName,
      remoteDir,
      localDir,
      token: GITHUB_TOKEN,
      syncPatterns: getSyncPatterns(resourceType, remoteDir),
      dryRun
    });
  } else {
    // Standard file-based sync
    await syncFromGitHub({
      repoOwner,
      repoName,
      remoteDir,
      localDir,
      acceptedExtensions: getAcceptedExtensions(resourceType),
      resourceType,
      token: GITHUB_TOKEN,
      syncPatterns: getSyncPatterns(resourceType, remoteDir),
      dryRun
    });
  }
}

/**
 * Run asset validation
 * @param {string|null} resourceType - The resource type to validate, or null to validate all
 */
async function runValidation(resourceType = null) {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue.bold('\n=== Running Asset Validation ===\n'));
    
    const validationScript = path.join(__dirname, 'analysis', 'validate-assets.js');
    const args = resourceType ? [validationScript, resourceType] : [validationScript];
    const child = spawn('node', args, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Validation process exited with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(new Error(`Failed to run validation: ${error.message}`));
    });
  });
}

/**
 * Main sync function
 */
async function sync() {
  try {
    const { resourceType, dryRun } = parseArguments();
    
    // Load configuration
    const config = await loadUpstreamConfig();
    
    if (!config.repos) {
      throw new Error('Configuration does not contain a "repos" section. Please update upstream.config.json');
    }
    
    if (resourceType === 'all') {
      // Sync all resources
      console.log(chalk.blue.bold('\n=== Syncing All Resources ===\n'));
      const resourceTypes = getAllResourceTypes(config);
      
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
      
      // Run validation after syncing all resources (if not in dry-run mode)
      // When syncing all, validate all asset types
      if (!dryRun) {
        try {
          await runValidation(null); // null means validate all
        } catch (error) {
          // Validation script exited with non-zero code (fatal error, not just warnings)
          console.error(chalk.red('\n✗ Validation failed with fatal error\n'));
          throw error; // Re-throw to fail the sync process
        }
      }
    } else {
      // Sync a single resource
      await syncResource(resourceType, config, dryRun);
      
      // Run validation after syncing any asset type (if not in dry-run mode)
      // Only validate the specific resource type that was synced
      if (!dryRun) {
        try {
          await runValidation(resourceType);
        } catch (error) {
          // Validation script exited with non-zero code (fatal error, not just warnings)
          console.error(chalk.red('\n✗ Validation failed with fatal error\n'));
          throw error; // Re-throw to fail the sync process
        }
      }
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
