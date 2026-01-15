import fs from 'fs-extra';
import path from 'path';

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
 * Recursively get all files from a GitHub directory
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} remotePath - Remote directory path
 * @param {string} subPath - Subdirectory path (for recursion)
 * @param {string[]} acceptedExtensions - Array of accepted file extensions
 * @param {string} token - GitHub token (optional)
 * @returns {Promise<Array<{path: string, download_url: string}>>}
 */
export async function getFilesRecursively(owner, repo, remotePath, subPath = '', acceptedExtensions = [], token = null) {
  const fullPath = subPath ? path.join(remotePath, subPath) : remotePath;
  const contents = await fetchGitHubContent(owner, repo, fullPath, token);
  
  let files = [];
  
  for (const item of contents) {
    if (item.type === 'file') {
      // Check if file matches accepted extensions (if any specified)
      if (acceptedExtensions.length === 0 || acceptedExtensions.some(ext => item.name.endsWith(ext))) {
        files.push({
          path: subPath ? path.join(subPath, item.name) : item.name,
          download_url: item.download_url
        });
      }
    } else if (item.type === 'dir') {
      // Recursively get files from subdirectories
      const newSubPath = subPath ? path.join(subPath, item.name) : item.name;
      const subFiles = await getFilesRecursively(owner, repo, remotePath, newSubPath, acceptedExtensions, token);
      files.push(...subFiles);
    }
  }
  
  return files;
}
