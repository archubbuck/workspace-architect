#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const MANIFEST_PATH = path.join(ROOT_DIR, 'assets-manifest.json');

// Check if running in local development mode (assets folder exists)
const IS_LOCAL = await fs.pathExists(ASSETS_DIR);

/**
 * Normalize collection items to flat array format for processing.
 * Supports both old flat array format and new nested object format.
 * 
 * Old format: ["instructions:reactjs", "prompts:code-review"]
 * New format: { "instructions": ["reactjs"], "prompts": ["code-review"] }
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
  
  const flatItems = [];
  for (const item of items) {
    if (!item.path || !item.kind) continue;
    
    // Extract the type and name from the path
    // Path format: "agents/foo.agent.md" or "instructions/bar.instructions.md"
    const pathParts = item.path.split('/');
    if (pathParts.length < 2) continue;
    
    const fileName = pathParts[pathParts.length - 1];
    const type = item.kind + 's'; // Convert "agent" to "agents", "prompt" to "prompts", etc.
    
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

program
  .name('workspace-architect')
  .description('CLI to download GitHub Copilot instructions, prompts, and agents (alias: wsa)')
  .version('1.0.0');

program
  .command('list [type]')
  .description('List available assets (instructions, prompts, agents, skills, collections)')
  .action(async (type) => {
    try {
      if (type) {
        await listAssets(type);
      } else {
        const types = ['instructions', 'prompts', 'agents', 'skills', 'collections'];
        for (const t of types) {
          await listAssets(t);
        }
      }
    } catch (error) {
      console.error(chalk.red('Error listing assets:'), error.message);
      process.exit(1);
    }
  });

program
  .command('download <type> [name]')
  .description('Download an asset by type and name')
  .option('-d, --dry-run', 'Simulate the download without writing files')
  .option('-f, --force', 'Overwrite existing files without asking')
  .option('-o, --output <path>', 'Specify the output path')
  .action(async (type, name, options) => {
    try {
      // Support both new format (type name) and legacy format (type:name)
      if (!name && type.includes(':')) {
        // Legacy format: type:name - warn user to use new format
        const [assetType, assetName] = type.split(':');
        
        // Detect which command was used (workspace-architect or wsa)
        const scriptPath = process.argv[1] || '';
        const commandName = scriptPath.includes('/wsa') || scriptPath.endsWith('wsa') ? 'wsa' : 'workspace-architect';
        
        console.log(chalk.yellow(`⚠️  Deprecation Warning: The format '${type}' is deprecated.`));
        console.log(chalk.yellow(`   Please use: npx ${commandName} download ${assetType} ${assetName}`));
        console.log('');
        await downloadAsset(type, options);
      } else if (name) {
        // New format: type name
        const id = `${type}:${name}`;
        await downloadAsset(id, options);
      } else {
        throw new Error('Invalid format. Use: download <type> <name>');
      }
    } catch (error) {
      console.error(chalk.red('Error downloading asset:'), error.message);
      process.exit(1);
    }
  });

async function getManifest() {
  if (await fs.pathExists(MANIFEST_PATH)) {
    return fs.readJson(MANIFEST_PATH);
  }
  throw new Error('Manifest file not found. Please report this issue.');
}

async function listAssets(type) {
  if (IS_LOCAL) {
    // Local Development Mode
    const matter = (await import('gray-matter')).default;
    const YAML = (await import('yaml')).default;
    // All types use assets/<type> directory
    const dirPath = path.join(ASSETS_DIR, type);
    
    if (!await fs.pathExists(dirPath)) {
      console.log(chalk.yellow(`No assets found for type: ${type}`));
      return;
    }

    const files = await fs.readdir(dirPath);
    if (files.length === 0) {
      console.log(chalk.yellow(`No assets found for type: ${type}`));
      return;
    }

    console.log(chalk.blue.bold(`\nAvailable ${type}:`));
    for (const file of files) {
      // Skip .upstream-sync.json files
      if (file === '.upstream-sync.json') continue;
      
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);
      let description = '';

      try {
        if (type === 'skills' && stat.isDirectory()) {
          // For Skills, read SKILL.md from directory
          const skillMdPath = path.join(filePath, 'SKILL.md');
          if (await fs.pathExists(skillMdPath)) {
            const content = await fs.readFile(skillMdPath, 'utf8');
            const parsed = matter(content);
            description = parsed.data.description || '';
          }
        } else if (type === 'collections') {
          if (file.endsWith('.json')) {
            const content = await fs.readJson(filePath);
            description = content.description || '';
          } else if (file.endsWith('.yml') || file.endsWith('.yaml')) {
            const content = await fs.readFile(filePath, 'utf8');
            const parsed = YAML.parse(content);
            description = parsed.description || '';
          }
        } else if (!stat.isDirectory()) {
          const content = await fs.readFile(filePath, 'utf8');
          const parsed = matter(content);
          description = parsed.data.description || '';
        }
      } catch (e) {
        // Ignore errors reading metadata
      }

      const name = type === 'skills' && stat.isDirectory() ? file : 
        (type === 'collections' ? 
          file.replace('.collection.yml', '').replace('.collection.yaml', '').replace('.json', '').replace('.yml', '').replace('.yaml', '') : 
          (type === 'instructions' ?
            file.replace('.instructions.md', '') :
            (type === 'prompts' ?
              file.replace('.prompt.md', '') :
              (type === 'agents' ?
                file.replace('.agent.md', '') :
                path.parse(file).name))));
      console.log(`  - ${name}${description ? ` - ${description}` : ''}`);
    }
  } else {
    // Production Mode (Manifest)
    const manifest = await getManifest();
    const typeAssets = manifest.assets[type] || {};
    const assets = Object.entries(typeAssets)
      .map(([id, asset]) => ({
        id,
        ...asset
      }));
    
    if (assets.length === 0) {
      console.log(chalk.yellow(`No assets found for type: ${type}`));
      return;
    }

    console.log(chalk.blue.bold(`\nAvailable ${type}:`));
    for (const asset of assets) {
      const versionInfo = asset.metadata?.version ? ` (v${asset.metadata.version})` : '';
      console.log(`  - ${asset.id}${versionInfo}${asset.description ? ` - ${asset.description}` : ''}`);
    }
  }
}

async function downloadAsset(id, options) {
  const [type, name] = id.split(':');

  if (!type || !name) {
    throw new Error('Invalid ID format. Use type:name (e.g., instructions:basic-setup)');
  }

  const validTypes = ['instructions', 'prompts', 'agents', 'skills', 'collections'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Valid types are: ${validTypes.join(', ')}`);
  }

  // Handle Collections
  if (type === 'collections') {
    let items = [];
    
    if (IS_LOCAL) {
      const YAML = (await import('yaml')).default;
      
      // Try to find the collection file with various extensions
      const possibleFileNames = [
        `${name}.json`,
        `${name}.collection.yml`,
        `${name}.collection.yaml`,
        `${name}.yml`,
        `${name}.yaml`
      ];
      
      let sourcePath = null;
      let isYaml = false;
      
      for (const fileName of possibleFileNames) {
        const testPath = path.join(ASSETS_DIR, 'collections', fileName);
        if (await fs.pathExists(testPath)) {
          sourcePath = testPath;
          isYaml = fileName.endsWith('.yml') || fileName.endsWith('.yaml');
          break;
        }
      }
      
      if (!sourcePath) {
        throw new Error(`Collection not found: ${type}/${name}`);
      }
      
      if (isYaml) {
        const content = await fs.readFile(sourcePath, 'utf8');
        const parsed = YAML.parse(content);
        // Convert YAML format items to flat array
        items = convertYamlItemsToFlat(parsed.items || []);
      } else {
        const collectionContent = await fs.readJson(sourcePath);
        const rawItems = collectionContent.items || (Array.isArray(collectionContent) ? collectionContent : []);
        items = normalizeCollectionItems(rawItems);
      }
    } else {
      const manifest = await getManifest();
      const asset = manifest.assets[type]?.[name];
      
      if (!asset) {
        throw new Error(`Collection not found: ${id}`);
      }
      
      items = normalizeCollectionItems(asset.items || []);
    }

    console.log(chalk.blue(`Downloading collection: ${name}`));
    for (const assetId of items) {
      try {
        await downloadAsset(assetId, options);
      } catch (error) {
        console.error(chalk.red(`Failed to download ${assetId} from collection:`), error.message);
      }
    }
    return;
  }

  // Handle Skills (multi-file folder-based assets)
  if (type === 'skills') {
    await downloadSkill(name, options);
    return;
  }

  // Handle Single Asset
  let content = '';
  let fileName = '';

  if (IS_LOCAL) {
    // Try to find the file with various extensions
    const potentialFileNames = [
      name,
      name + '.md'
    ];
    if (type === 'agents') potentialFileNames.push(name + '.agent.md');
    if (type === 'prompts') potentialFileNames.push(name + '.prompt.md');
    if (type === 'instructions') potentialFileNames.push(name + '.instructions.md');

    // All types use assets/<type> directory
    const baseDir = path.join(ASSETS_DIR, type);
    
    let sourcePath = null;
    for (const fname of potentialFileNames) {
      const p = path.join(baseDir, fname);
      if (await fs.pathExists(p)) {
        sourcePath = p;
        fileName = fname;
        break;
      }
    }

    if (!sourcePath) {
      throw new Error(`Asset not found: ${type}/${name}`);
    }
    
    content = await fs.readFile(sourcePath, 'utf8');
  } else {
    const manifest = await getManifest();
    const asset = manifest.assets[type]?.[name];
    
    if (!asset) {
      throw new Error(`Asset not found: ${id}`);
    }
    
    fileName = path.basename(asset.path);
    const url = `https://raw.githubusercontent.com/archubbuck/workspace-architect/main/${asset.path}`;
    
    console.log(chalk.dim(`Fetching ${url}...`));
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    content = await response.text();
  }

  // Determine Destination
  let destDir;
  if (options.output) {
    destDir = path.resolve(process.cwd(), options.output);
  } else {
    destDir = path.join(process.cwd(), '.github', type);
  }

  const destPath = path.join(destDir, fileName);

  if (options.dryRun) {
    console.log(chalk.cyan(`[Dry Run] Would write to ${destPath}`));
    return;
  }

  // Ensure destination directory exists
  await fs.ensureDir(destDir);

  if (await fs.pathExists(destPath) && !options.force) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `File ${fileName} already exists in ${destDir}. Overwrite?`,
        default: false
      }
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }
  }

  await fs.writeFile(destPath, content);
  console.log(chalk.green(`Successfully downloaded ${fileName} to ${destDir}`));
}

async function downloadSkill(name, options) {
  const skillName = name;
  let skillFiles = [];
  let skillPath = '';

  if (IS_LOCAL) {
    // Local mode: copy from assets/skills
    skillPath = path.join(ASSETS_DIR, 'skills', skillName);
    
    if (!await fs.pathExists(skillPath)) {
      throw new Error(`Skill not found: skills/${skillName}`);
    }
    
    // Get all files in the skill directory
    const getAllFiles = async (dir, baseDir = dir) => {
      const files = [];
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const subFiles = await getAllFiles(fullPath, baseDir);
          files.push(...subFiles);
        } else {
          const relativePath = path.relative(baseDir, fullPath);
          files.push({ relative: relativePath, full: fullPath });
        }
      }
      return files;
    };
    
    skillFiles = await getAllFiles(skillPath);
  } else {
    // Production mode: fetch from manifest and download from GitHub
    const manifest = await getManifest();
    const asset = manifest.assets.skills?.[skillName];
    
    if (!asset) {
      throw new Error(`Skill not found: ${skillName}`);
    }
    
    skillPath = asset.path;
    skillFiles = asset.files.map(file => ({
      relative: file,
      url: `https://raw.githubusercontent.com/archubbuck/workspace-architect/main/${asset.path}/${file}`
    }));
  }

  // Determine destination
  let destDir;
  if (options.output) {
    destDir = path.resolve(process.cwd(), options.output);
  } else {
    destDir = path.join(process.cwd(), '.github', 'skills', skillName);
  }

  if (options.dryRun) {
    console.log(chalk.cyan(`[Dry Run] Would create skill directory at ${destDir}`));
    for (const file of skillFiles) {
      console.log(chalk.cyan(`  Would copy: ${file.relative}`));
    }
    return;
  }

  // Check if skill already exists
  if (await fs.pathExists(destDir) && !options.force) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Skill ${skillName} already exists in ${destDir}. Overwrite?`,
        default: false
      }
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }
  }

  console.log(chalk.blue(`Downloading skill: ${skillName}`));
  
  // Create skill directory
  await fs.ensureDir(destDir);

  // Download/copy all files
  for (const file of skillFiles) {
    const destPath = path.join(destDir, file.relative);
    const destFileDir = path.dirname(destPath);
    await fs.ensureDir(destFileDir);

    if (IS_LOCAL) {
      // Copy from local assets
      await fs.copyFile(file.full, destPath);
    } else {
      // Download from GitHub
      const response = await fetch(file.url);
      if (!response.ok) {
        console.warn(chalk.yellow(`Warning: Failed to download ${file.relative}`));
        continue;
      }
      const content = await response.text();
      await fs.writeFile(destPath, content);
    }
    
    console.log(chalk.dim(`  Downloaded: ${file.relative}`));
  }

  console.log(chalk.green(`Successfully downloaded skill ${skillName} to ${destDir} (${skillFiles.length} files)`));
}

program.parse();
