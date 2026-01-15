import fs from 'fs-extra';
import path from 'path';

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
    if (entry.name === '.upstream-sync.json') {
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
