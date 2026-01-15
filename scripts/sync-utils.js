import fs from 'fs-extra';
import path from 'path';
import { spawnSync } from 'child_process';

// Metadata file name used for tracking sync state
const METADATA_FILENAME = '.upstream-sync.json';

/**
 * Recursively get all files in a directory that match accepted extensions,
 * excluding the metadata file.
 * 
 * @param {string} directory - The directory to scan
 * @param {string[]} acceptedExtensions - Array of file extensions to include (e.g., ['.md', '.agent.md'])
 * @param {string} baseDir - Base directory for relative path calculation (defaults to directory)
 * @returns {Promise<string[]>} Array of relative file paths
 */
export async function getLocalFiles(directory, acceptedExtensions, baseDir = directory) {
  // Check if directory exists first
  if (!await fs.pathExists(directory)) {
    return [];
  }
  
  const entries = await fs.readdir(directory, { withFileTypes: true });
  let files = [];
  
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    // Skip metadata file
    if (entry.name === METADATA_FILENAME) {
      continue;
    }
    if (entry.isDirectory()) {
      const subFiles = await getLocalFiles(fullPath, acceptedExtensions, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() && acceptedExtensions.some(ext => entry.name.endsWith(ext))) {
      files.push(path.relative(baseDir, fullPath));
    }
  }
  
  return files;
}

/**
 * Check if there are any git changes in the specified directory.
 * Excludes the .upstream-sync.json metadata file.
 * 
 * @param {string} directory - The directory to check (must be an absolute path)
 * @returns {boolean} True if there are changes, false otherwise
 */
export function hasGitChanges(directory) {
  try {
    // Validate that directory is an absolute path to prevent path traversal
    if (!path.isAbsolute(directory)) {
      console.error('Directory must be an absolute path:', directory);
      return false;
    }
    
    // Get git status for the directory, using spawn to avoid shell injection
    const result = spawnSync('git', ['status', '--porcelain', '--', directory], {
      encoding: 'utf-8'
    });
    
    if (result.error) {
      console.error('Git command error:', result.error.message);
      return false;
    }
    
    if (result.status !== 0) {
      if (result.stderr) {
        console.error('Git status failed:', result.stderr);
      }
      return false;
    }
    
    // Filter out lines that refer to .upstream-sync.json files
    // Git status --porcelain format: "XY filename" where X and Y are status characters
    // Examples: " M filename" (modified), "?? filename" (untracked), "A  filename" (added)
    const filteredLines = result.stdout
      .split('\n')
      .filter(line => {
        if (!line.trim()) return false;
        // Extract filename from git status line
        // First 2 chars are status codes, then a space, then filename
        if (line.length < 3) return false;
        const filename = line.substring(3);
        const basename = path.basename(filename);
        return basename !== METADATA_FILENAME;
      });
    return filteredLines.length > 0;
  } catch (error) {
    console.error('Error checking git changes:', error.message);
    return false;
  }
}
