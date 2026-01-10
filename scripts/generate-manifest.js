#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const MANIFEST_PATH = path.join(ROOT_DIR, 'assets-manifest.json');

const TYPES = ['agents', 'instructions', 'prompts', 'collections', 'skills'];

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
      skills: {}
    }
  };

  for (const type of TYPES) {
    // All types use assets/<type> directory
    const dirPath = path.join(ASSETS_DIR, type);
    if (!await fs.pathExists(dirPath)) continue;

    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);
      
      // Handle Skills as directories
      if (type === 'skills' && stat.isDirectory()) {
        await processSkill(file, filePath, manifest);
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
      if (type === 'collections' && !file.endsWith('.json')) {
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
        id = file.replace('.json', '');
      } else {
        id = path.parse(file).name;
      }

      try {
        if (type === 'collections') {
          const content = await fs.readJson(filePath);
          description = content.description || '';
          title = content.name || id;
          // Normalize items to flat array format for manifest
          items = normalizeCollectionItems(content.items || []);
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

// Process a Skill directory
async function processSkill(skillName, skillPath, manifest) {
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  
  if (!await fs.pathExists(skillMdPath)) {
    console.warn(chalk.yellow(`Skipping ${skillName}: No SKILL.md found`));
    return;
  }
  
  try {
    const content = await fs.readFile(skillMdPath, 'utf8');
    const parsed = matter(content);
    
    // Get all files in the Skill directory
    const files = await getFilesRecursive(skillPath);
    
    // Store in nested structure
    manifest.assets.skills[skillName] = {
      path: `assets/skills/${skillName}`,
      description: parsed.data.description || '',
      title: parsed.data.name || skillName,
      type: 'skills',
      files: files,
      metadata: {
        ...(parsed.data.metadata || {}),
        license: parsed.data.license,
        version: parsed.data.metadata?.version
      }
    };
    
    console.log(chalk.green(`  Processed skill: ${skillName} (${files.length} files)`));
  } catch (e) {
    console.warn(chalk.yellow(`Warning: Could not process skill ${skillName}: ${e.message}`));
  }
}

generateManifest().catch(console.error);
