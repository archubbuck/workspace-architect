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

program
  .name('github-copilot-packed')
  .description('CLI to download GitHub Copilot instructions, prompts, and chat modes')
  .version('1.0.0');

program
  .command('list [type]')
  .description('List available assets (instructions, prompts, chatmodes, collections)')
  .action(async (type) => {
    try {
      if (type) {
        await listAssets(type);
      } else {
        const types = ['instructions', 'prompts', 'chatmodes', 'collections'];
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
  .command('download <id>')
  .description('Download an asset (format: type:name)')
  .option('-d, --dry-run', 'Simulate the download without writing files')
  .option('-f, --force', 'Overwrite existing files without asking')
  .option('-o, --output <path>', 'Specify the output path')
  .action(async (id, options) => {
    try {
      await downloadAsset(id, options);
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
      const filePath = path.join(dirPath, file);
      let description = '';

      try {
        if (type === 'collections') {
          const content = await fs.readJson(filePath);
          description = content.description || '';
        } else {
          const content = await fs.readFile(filePath, 'utf8');
          const parsed = matter(content);
          description = parsed.data.description || '';
        }
      } catch (e) {
        // Ignore errors reading metadata
      }

      const name = path.parse(file).name;
      console.log(`  - ${name}${description ? ` - ${description}` : ''}`);
    }
  } else {
    // Production Mode (Manifest)
    const manifest = await getManifest();
    const assets = Object.entries(manifest.assets)
      .filter(([key, asset]) => asset.type === type)
      .map(([key, asset]) => ({
        id: key.split(':')[1],
        ...asset
      }));
    
    if (assets.length === 0) {
      console.log(chalk.yellow(`No assets found for type: ${type}`));
      return;
    }

    console.log(chalk.blue.bold(`\nAvailable ${type}:`));
    for (const asset of assets) {
      console.log(`  - ${asset.id}${asset.description ? ` - ${asset.description}` : ''}`);
    }
  }
}

async function downloadAsset(id, options) {
  const [type, name] = id.split(':');

  if (!type || !name) {
    throw new Error('Invalid ID format. Use type:name (e.g., instructions:basic-setup)');
  }

  const validTypes = ['instructions', 'prompts', 'chatmodes', 'collections'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type: ${type}. Valid types are: ${validTypes.join(', ')}`);
  }

  // Handle Collections
  if (type === 'collections') {
    let items = [];
    
    if (IS_LOCAL) {
      let fileName = name;
      if (!path.extname(name)) fileName += '.json';
      const sourcePath = path.join(ASSETS_DIR, type, fileName);
      
      if (!await fs.pathExists(sourcePath)) {
        throw new Error(`Collection not found: ${type}/${fileName}`);
      }
      
      const collectionContent = await fs.readJson(sourcePath);
      items = collectionContent.items || (Array.isArray(collectionContent) ? collectionContent : []);
    } else {
      const manifest = await getManifest();
      const key = `${type}:${name}`;
      const asset = manifest.assets[key];
      
      if (!asset) {
        throw new Error(`Collection not found: ${id}`);
      }
      
      items = asset.items || [];
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

  // Handle Single Asset
  let content = '';
  let fileName = '';

  if (IS_LOCAL) {
    // Try to find the file with various extensions
    const potentialFileNames = [
      name,
      name + '.md'
    ];
    if (type === 'chatmodes') potentialFileNames.push(name + '.chatmode.md');
    if (type === 'prompts') potentialFileNames.push(name + '.prompt.md');
    if (type === 'instructions') potentialFileNames.push(name + '.instructions.md');

    let sourcePath = null;
    for (const fname of potentialFileNames) {
      const p = path.join(ASSETS_DIR, type, fname);
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
    const key = `${type}:${name}`;
    const asset = manifest.assets[key];
    
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

program.parse();
