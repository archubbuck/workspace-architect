import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Load upstream configuration from upstream.config.json
 * @param {string} configPath - Path to the config file (optional)
 * @returns {Promise<Object|null>} Configuration object or null if not found
 */
export async function loadUpstreamConfig(configPath = null) {
  // Default config path is in the project root
  const defaultConfigPath = path.join(process.cwd(), 'upstream.config.json');
  const finalConfigPath = configPath || defaultConfigPath;
  
  try {
    if (await fs.pathExists(finalConfigPath)) {
      const config = await fs.readJson(finalConfigPath);
      console.log(chalk.blue(`Loaded upstream config from: ${finalConfigPath}`));
      return config;
    }
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Failed to load config from ${finalConfigPath}:`), error.message);
  }
  
  return null;
}

/**
 * Find upstream repo configuration by repo identifier
 * @param {Object} config - The upstream configuration object
 * @param {string} repoOwner - Repository owner
 * @param {string} repoName - Repository name
 * @returns {Object|null} Repo config or null if not found
 */
export function findRepoConfig(config, repoOwner, repoName) {
  if (!config || !config.upstreamRepos || !Array.isArray(config.upstreamRepos)) {
    return null;
  }
  
  const repoIdentifier = `${repoOwner}/${repoName}`;
  return config.upstreamRepos.find(repo => repo.repo === repoIdentifier) || null;
}
