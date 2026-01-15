import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Load upstream configuration from upstream.config.json
 * @param {string} configPath - Path to the config file (optional)
 * @returns {Promise<Object|null>} Configuration object or null if not found
 * @throws {Error} If config file is not found or cannot be read
 */
export async function loadUpstreamConfig(configPath = null) {
  // Default config path is in the project root
  const defaultConfigPath = path.join(process.cwd(), 'upstream.config.json');
  const finalConfigPath = configPath || defaultConfigPath;
  
  if (!await fs.pathExists(finalConfigPath)) {
    throw new Error(`Upstream config file not found: ${finalConfigPath}`);
  }
  
  try {
    const config = await fs.readJson(finalConfigPath);
    console.log(chalk.blue(`Loaded upstream config from: ${finalConfigPath}`));
    return config;
  } catch (error) {
    throw new Error(`Failed to load config from ${finalConfigPath}: ${error.message}`);
  }
}

/**
 * Find upstream repo configuration by repo identifier
 * @param {Object} config - The upstream configuration object
 * @param {string} repoOwner - Repository owner
 * @param {string} repoName - Repository name
 * @returns {Object|null} Repo config or null if not found
 * @throws {Error} If repo config is not found in the configuration
 */
export function findRepoConfig(config, repoOwner, repoName) {
  if (!config || !config.upstreamRepos || !Array.isArray(config.upstreamRepos)) {
    throw new Error('Invalid upstream configuration: missing upstreamRepos array');
  }
  
  const repoIdentifier = `${repoOwner}/${repoName}`;
  const repoConfig = config.upstreamRepos.find(repo => repo.repo === repoIdentifier);
  
  if (!repoConfig) {
    throw new Error(`No configuration found for repository: ${repoIdentifier}`);
  }
  
  return repoConfig;
}
