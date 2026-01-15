import fs from 'fs-extra';
import path from 'path';
import { minimatch } from 'minimatch';

/**
 * Fetch content from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - Path to fetch
 * @param {string} token - GitHub token (optional)
 * @returns {Promise<any>} JSON response
 */
export async function fetchGitHubContent(owner, repo, contentPath, token = null) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${contentPath}`;
  const headers = {
    'User-Agent': 'node.js',
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Download a file from a URL
 * @param {string} url - URL to download from
 * @param {string} destPath - Destination path
 * @param {string} token - GitHub token (optional)
 */
export async function downloadFile(url, destPath, token = null) {
  const headers = {
    'User-Agent': 'node.js'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  
  const content = await response.text();
  await fs.ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, content);
}

/**
 * Check if a file path matches any of the provided glob patterns
 * @param {string} filePath - File path to check
 * @param {string[]} patterns - Array of glob patterns
 * @returns {boolean} True if file matches any pattern
 */
function matchesGlobPatterns(filePath, patterns) {
  if (!patterns || patterns.length === 0) {
    return true;
  }
  
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  return patterns.some(pattern => minimatch(normalizedPath, pattern, { dot: true }));
}

/**
 * Recursively get all files from a GitHub directory
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} remotePath - Remote directory path
 * @param {string} subPath - Subdirectory path (for recursion)
 * @param {string[]} acceptedExtensions - Array of accepted file extensions
 * @param {string} token - GitHub token (optional)
 * @param {string[]} syncPatterns - Optional glob patterns to filter files
 * @returns {Promise<Array<{path: string, download_url: string}>>}
 */
export async function getFilesRecursively(owner, repo, remotePath, subPath = '', acceptedExtensions = [], token = null, syncPatterns = null) {
  const fullPath = subPath ? path.join(remotePath, subPath) : remotePath;
  const contents = await fetchGitHubContent(owner, repo, fullPath, token);
  
  let files = [];
  
  for (const item of contents) {
    if (item.type === 'file') {
      const relativePath = subPath ? path.join(subPath, item.name) : item.name;
      const fullRelativePath = path.join(remotePath, relativePath);
      
      // Check if file matches accepted extensions (if any specified)
      const extensionMatch = acceptedExtensions.length === 0 || acceptedExtensions.some(ext => item.name.endsWith(ext));
      
      // Check if file matches sync patterns (if any specified)
      const patternMatch = matchesGlobPatterns(fullRelativePath, syncPatterns);
      
      if (extensionMatch && patternMatch) {
        files.push({
          path: relativePath,
          download_url: item.download_url,
          sha: item.sha
        });
      }
    } else if (item.type === 'dir') {
      // Recursively get files from subdirectories
      const newSubPath = subPath ? path.join(subPath, item.name) : item.name;
      const subFiles = await getFilesRecursively(owner, repo, remotePath, newSubPath, acceptedExtensions, token, syncPatterns);
      files.push(...subFiles);
    }
  }
  
  return files;
}
