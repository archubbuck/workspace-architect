#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');

const DIRS = {
  collections: path.join(ASSETS_DIR, 'collections'),
  chatmodes: path.join(ASSETS_DIR, 'chatmodes'),
  instructions: path.join(ASSETS_DIR, 'instructions'),
  prompts: path.join(ASSETS_DIR, 'prompts'),
};

// Simple stop words list
const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'it', 'as', 'from', 'mode', 'chat', 'prompt', 'instruction', 'file', 'use', 'using', 'create', 'make', 'expert', 'guide', 'help']);

function tokenize(text) {
  if (!text) return [];
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
    .replace(/[-_.]/g, ' ') // Split kebab-case and snake_case
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

async function loadAssets(type) {
  const dir = DIRS[type];
  if (!await fs.pathExists(dir)) return [];
  
  const files = await fs.readdir(dir);
  const assets = [];

  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(dir, file);
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = matter(content);
    const id = file.replace(/\.(chatmode|instructions|prompt)\.md$/, '');
    
    assets.push({
      id,
      type,
      filename: file,
      data: parsed.data,
      content: parsed.content,
      tokens: new Set([
        ...tokenize(id),
        ...tokenize(parsed.data.title || ''),
        ...tokenize(parsed.data.description || ''),
        // ...tokenize(parsed.content).slice(0, 100) // Maybe too noisy?
      ])
    });
  }
  return assets;
}

async function loadCollections() {
  const dir = DIRS.collections;
  if (!await fs.pathExists(dir)) return [];

  const files = await fs.readdir(dir);
  const collections = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    const filePath = path.join(dir, file);
    const content = await fs.readJson(filePath);
    
    collections.push({
      filename: file,
      filePath,
      data: content,
      tokens: new Set([
        ...tokenize(file.replace('.json', '')),
        ...tokenize(content.description || '')
      ])
    });
  }
  return collections;
}

function calculateScore(collection, asset, allAssetsMap) {
  // 1. Check if already in collection
  const assetKey = `${asset.type}:${asset.id}`;
  if (collection.data.items && collection.data.items.includes(assetKey)) return 0;

  let score = 0;
  
  // 2. Match against collection metadata
  for (const token of asset.tokens) {
    if (collection.tokens.has(token)) {
      score += 3; // Strong match with collection name/desc
    }
  }

  // 3. Match against existing items in collection (Contextual relevance)
  // If the collection contains "azure-expert", and the asset is "azure-functions", they share "azure".
  const existingItemTokens = new Set();
  if (collection.data.items) {
    for (const itemKey of collection.data.items) {
      const existingAsset = allAssetsMap.get(itemKey);
      if (existingAsset) {
        for (const t of existingAsset.tokens) {
          existingItemTokens.add(t);
        }
      }
    }
  }

  for (const token of asset.tokens) {
    if (existingItemTokens.has(token)) {
      score += 1; // Match with sibling items
    }
  }

  return score;
}

async function main() {
  program
    .name('analyze-collections')
    .description('Analyze collections and suggest missing assets')
    .option('-f, --fix', 'Automatically add high-confidence matches to collections')
    .option('-t, --threshold <number>', 'Score threshold for suggestions', '4')
    .parse(process.argv);

  const options = program.opts();
  const threshold = parseInt(options.threshold, 10);

  console.log(chalk.blue('Loading assets...'));

  const [chatmodes, instructions, prompts] = await Promise.all([
    loadAssets('chatmodes'),
    loadAssets('instructions'),
    loadAssets('prompts')
  ]);

  const allAssets = [...chatmodes, ...instructions, ...prompts];
  const allAssetsMap = new Map(allAssets.map(a => [`${a.type}:${a.id}`, a]));

  console.log(chalk.blue(`Loaded ${allAssets.length} assets.`));

  const collections = await loadCollections();
  console.log(chalk.blue(`Loaded ${collections.length} collections.`));

  console.log(chalk.yellow('\nAnalyzing...'));

  for (const collection of collections) {
    const suggestions = [];

    for (const asset of allAssets) {
      const score = calculateScore(collection, asset, allAssetsMap);
      if (score >= threshold) {
        suggestions.push({ asset, score });
      }
    }

    if (suggestions.length > 0) {
      suggestions.sort((a, b) => b.score - a.score);
      
      console.log(chalk.green(`\nCollection: ${collection.filename}`));
      console.log(chalk.dim(collection.data.description || 'No description'));
      
      const newItems = [];

      for (const { asset, score } of suggestions) {
        const assetKey = `${asset.type}:${asset.id}`;
        console.log(`  [${score}] ${chalk.cyan(assetKey)} - ${chalk.dim(asset.data.description || asset.data.title || '')}`);
        newItems.push(assetKey);
      }

      if (options.fix) {
        if (!collection.data.items) collection.data.items = [];
        collection.data.items.push(...newItems);
        // Remove duplicates just in case
        collection.data.items = [...new Set(collection.data.items)];
        
        await fs.writeJson(collection.filePath, collection.data, { spaces: 2 });
        console.log(chalk.magenta(`  -> Added ${newItems.length} items to ${collection.filename}`));
      }
    }
  }
  
  console.log(chalk.blue('\nDone.'));
}

main().catch(console.error);
