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

const TYPES = ['agents', 'instructions', 'prompts', 'collections'];

async function generateManifest() {
  console.log(chalk.blue('Generating assets manifest...'));
  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    assets: {}
  };

  for (const type of TYPES) {
    // All types use assets/<type> directory
    const dirPath = path.join(ASSETS_DIR, type);
    if (!await fs.pathExists(dirPath)) continue;

    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);
      
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

      const key = `${type}:${id}`;

      try {
        if (type === 'collections') {
          const content = await fs.readJson(filePath);
          description = content.description || '';
          title = content.name || id;
          items = content.items || [];
        } else if (file.endsWith('.md')) {
          const content = await fs.readFile(filePath, 'utf8');
          const parsed = matter(content);
          description = parsed.data.description || '';
          title = parsed.data.title || id;
        }
      } catch (e) {
        console.warn(chalk.yellow(`Warning: Could not parse ${filePath}: ${e.message}`));
      }

      manifest.assets[key] = {
        path: `assets/${type}/${file}`,
        description,
        title,
        type,
        items: type === 'collections' ? items : undefined
      };
    }
  }

  await fs.writeJson(MANIFEST_PATH, manifest, { spaces: 2 });
  console.log(chalk.blue(`Manifest generated at ${MANIFEST_PATH} with ${chalk.green(Object.keys(manifest.assets).length)} assets.`));
}

generateManifest().catch(console.error);
