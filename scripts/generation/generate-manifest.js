#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '../..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const MANIFEST_PATH = path.join(ROOT_DIR, 'assets-manifest.json');

const TYPES = ['agents', 'instructions', 'prompts', 'collections', 'skills', 'hooks', 'plugins'];

/**
 * Normalize collection items to flat array format for manifest storage.
 * Supports both old flat array format and new nested object format.
 * 
 * @param {Array|Object} items - Collection items in either format
 * @returns {Array} Flat array of items in "type:name" format
 */
function normalizeCollectionItems(items) {
  if (!items) return [];
  
  // If it's already an array (old format), return as-is
  if (Array.isArray(items)) {
    return items;
  }
  
  // If it's an object (new format), convert to flat array
  if (typeof items === 'object') {
    const flatItems = [];
    for (const [type, names] of Object.entries(items)) {
      if (Array.isArray(names)) {
        for (const name of names) {
          flatItems.push(`${type}:${name}`);
        }
      }
    }
    return flatItems;
  }
  
  return [];
}

/**
 * Convert YAML collection items format to flat array format.
 * YAML format: [{ path: "agents/foo.agent.md", kind: "agent" }, ...]
 * Flat format: ["agents:foo", ...]
 * 
 * @param {Array} items - YAML collection items
 * @returns {Array} Flat array of items in "type:name" format
 */
function convertYamlItemsToFlat(items) {
  if (!Array.isArray(items)) return [];
  
  // Mapping of singular to plural forms for asset types
  const pluralMap = {
    'agent': 'agents',
    'instruction': 'instructions',
    'prompt': 'prompts',
    'skill': 'skills',
    'collection': 'collections',
    'hook': 'hooks',
    'plugin': 'plugins'
  };
  
  const flatItems = [];
  for (const item of items) {
    if (!item.path || !item.kind) continue;
    
    // Extract the type and name from the path
    // Path format: "agents/foo.agent.md" or "instructions/bar.instructions.md"
    const pathParts = item.path.split('/');
    if (pathParts.length < 2) continue;
    
    const fileName = pathParts[pathParts.length - 1];
    const type = pluralMap[item.kind] || item.kind + 's'; // Use mapping or fallback to simple pluralization
    
    // Extract name by removing extension
    let name = fileName
      .replace('.agent.md', '')
      .replace('.instructions.md', '')
      .replace('.prompt.md', '')
      .replace('.md', '');
    
    flatItems.push(`${type}:${name}`);
  }
  
  return flatItems;
}

// Helper function to recursively get all files in a directory
async function getFilesRecursive(dir, baseDir = dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getFilesRecursive(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      const relativePath = path.relative(baseDir, fullPath);
      files.push(relativePath);
    }
  }
  
  return files;
}

async function generateManifest() {
  console.log(chalk.blue('Generating assets manifest...'));
  const manifest = {
    version: '2.0.0', // Bump version to indicate nested structure
    generatedAt: new Date().toISOString(),
    assets: {
      agents: {},
      instructions: {},
      prompts: {},
      collections: {},
      skills: {},
      hooks: {},
      plugins: {}
    }
  };

  for (const type of TYPES) {
    // All types use assets/<type> directory
    const dirPath = path.join(ASSETS_DIR, type);
    if (!await fs.pathExists(dirPath)) continue;

    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      // Skip .upstream-sync.json files
      if (file === '.upstream-sync.json') continue;
      
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);
      
      // Handle Skills, Hooks, and Plugins as directories
      if ((type === 'skills' || type === 'hooks' || type === 'plugins') && stat.isDirectory()) {
        await processDirectoryAsset(type, file, filePath, manifest);
        continue;
      }
      
      if (stat.isDirectory()) continue;
      
      // Skip files that don't match expected patterns
      if (type === 'agents' && !file.endsWith('.agent.md')) {
        console.warn(chalk.yellow(`Skipping unexpected file in agents: ${file}`));
        continue;
      }
      if (type === 'instructions' && !file.endsWith('.instructions.md')) {
        console.warn(chalk.yellow(`Skipping unexpected file in instructions: ${file}`));
        continue;
      }
      if (type === 'prompts' && !file.endsWith('.prompt.md')) {
        console.warn(chalk.yellow(`Skipping unexpected file in prompts: ${file}`));
        continue;
      }
      if (type === 'collections' && !(file.endsWith('.json') || file.endsWith('.yml') || file.endsWith('.yaml'))) {
        console.warn(chalk.yellow(`Skipping unexpected file in collections: ${file}`));
        continue;
      }
      
      let id = file;
      let description = '';
      let title = '';
      let items = []; // For collections
      
      // Remove extensions for ID
      if (type === 'agents') {
        id = file.replace('.agent.md', '');
      } else if (type === 'instructions') {
        id = file.replace('.instructions.md', '');
      } else if (type === 'prompts') {
        id = file.replace('.prompt.md', '');
      } else if (type === 'collections') {
        // Handle both .json and .yml/.yaml files, plus legacy .collection.yml/.yaml
        id = file.replace(/\.(collection\.)?(yml|yaml|json)$/, '');
      } else {
        id = path.parse(file).name;
      }

      try {
        if (type === 'collections') {
          if (file.endsWith('.json')) {
            // Handle JSON collections
            const content = await fs.readJson(filePath);
            description = content.description || '';
            title = content.name || id;
            // Normalize items to flat array format for manifest
            items = normalizeCollectionItems(content.items || []);
          } else if (file.endsWith('.yml') || file.endsWith('.yaml')) {
            // Handle YAML collections
            const content = await fs.readFile(filePath, 'utf8');
            const parsed = YAML.parse(content);
            description = parsed.description || '';
            title = parsed.name || id;
            // Convert YAML format items to flat array format
            items = convertYamlItemsToFlat(parsed.items || []);
          }
        } else if (file.endsWith('.md')) {
          const content = await fs.readFile(filePath, 'utf8');
          const parsed = matter(content);
          description = parsed.data.description || '';
          title = parsed.data.title || id;
        }
      } catch (e) {
        console.warn(chalk.yellow(`Warning: Could not parse ${filePath}: ${e.message}`));
      }

      // Store in nested structure
      manifest.assets[type][id] = {
        path: `assets/${type}/${file}`,
        description,
        title,
        type,
        items: type === 'collections' ? items : undefined
      };
    }
  }

  // Count total assets
  const totalAssets = Object.values(manifest.assets).reduce((sum, typeAssets) => sum + Object.keys(typeAssets).length, 0);
  await fs.writeJson(MANIFEST_PATH, manifest, { spaces: 2 });
  console.log(chalk.blue(`Manifest generated at ${MANIFEST_PATH} with ${chalk.green(totalAssets)} assets.`));
}

// Process a directory-based asset (Skill, Hook, or Plugin)
async function processDirectoryAsset(assetType, assetName, assetPath, manifest) {
  // Determine the key file to read for metadata
  let metadataFile;
  if (assetType === 'skills') {
    metadataFile = 'SKILL.md';
  } else if (assetType === 'hooks' || assetType === 'plugins') {
    metadataFile = 'README.md';
  } else {
    console.warn(chalk.yellow(`Unknown directory asset type: ${assetType}`));
    return;
  }
  
  const metadataPath = path.join(assetPath, metadataFile);
  
  if (!await fs.pathExists(metadataPath)) {
    console.warn(chalk.yellow(`Skipping ${assetName}: No ${metadataFile} found`));
    return;
  }
  
  try {
    const content = await fs.readFile(metadataPath, 'utf8');
    const parsed = matter(content);
    
    // Get all files in the asset directory
    const files = await getFilesRecursive(assetPath);
    
    // Store in nested structure
    manifest.assets[assetType][assetName] = {
      path: `assets/${assetType}/${assetName}`,
      description: parsed.data.description || '',
      title: parsed.data.name || assetName,
      type: assetType,
      files: files,
      metadata: {
        ...(parsed.data.metadata || {}),
        license: parsed.data.license,
        version: parsed.data.metadata?.version
      }
    };
    
    console.log(chalk.green(`  Processed ${assetType.slice(0, -1)}: ${assetName} (${files.length} files)`));
  } catch (e) {
    console.warn(chalk.yellow(`Warning: Could not process ${assetType.slice(0, -1)} ${assetName}: ${e.message}`));
  }
}

// Deprecated: Use processDirectoryAsset instead
// Kept for backwards compatibility if needed
async function processSkill(skillName, skillPath, manifest) {
  return processDirectoryAsset('skills', skillName, skillPath, manifest);
}

generateManifest().catch(console.error);
