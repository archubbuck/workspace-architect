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

// Expanded stop words
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'it', 'as', 'from', 'mode', 'chat', 'prompt', 'instruction', 'file', 'use', 'using', 'create', 'make', 'expert', 'guide', 'help', 'code', 'generate', 'write', 'user', 'system', 'assistant', 'response', 'output', 'input', 'example', 'task', 'context', 'role', 'act', 'like', 'you', 'your', 'my', 'i', 'me', 'we', 'us', 'our', 'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'must', 'do', 'does', 'did', 'done', 'doing', 'have', 'has', 'had', 'having', 'get', 'gets', 'got', 'getting', 'go', 'goes', 'went', 'gone', 'going', 'say', 'says', 'said', 'saying', 'tell', 'tells', 'told', 'telling', 'ask', 'asks', 'asked', 'asking', 'answer', 'answers', 'answered', 'answering', 'question', 'questions', 'questioning', 'problem', 'problems', 'issue', 'issues', 'solution', 'solutions', 'solve', 'solves', 'solved', 'solving', 'fix', 'fixes', 'fixed', 'fixing', 'bug', 'bugs', 'error', 'errors', 'warning', 'warnings', 'info', 'information', 'data', 'value', 'values', 'variable', 'variables', 'function', 'functions', 'method', 'methods', 'class', 'classes', 'object', 'objects', 'array', 'arrays', 'string', 'strings', 'number', 'numbers', 'boolean', 'booleans', 'true', 'false', 'null', 'undefined', 'nan', 'infinity'
]);

// Simple Stemmer
function stem(word) {
  if (word.length < 4) return word;
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && word.length > 3) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) return word.slice(0, -1);
  if (word.endsWith('ing') && word.length > 4) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 3) return word.slice(0, -2);
  if (word.endsWith('ly') && word.length > 4) return word.slice(0, -2);
  return word;
}

function getTokens(text) {
  if (!text) return [];
  // Normalize text: split camelCase, snake_case, kebab-case
  const normalized = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_.]/g, ' ');
    
  return normalized
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t))
    .map(t => stem(t));
}

// Custom TF-IDF Implementation
class TfIdf {
  constructor() {
    this.documents = []; // Array of { termCounts: Map<Term, Count>, totalTerms: number }
    this.docFrequencies = new Map(); // Term -> DocCount
  }

  addDocument(tokens) {
    const termCounts = new Map();
    const uniqueTerms = new Set(tokens);
    
    for (const token of tokens) {
      termCounts.set(token, (termCounts.get(token) || 0) + 1);
    }
    
    this.documents.push({ termCounts, totalTerms: tokens.length });
    
    for (const term of uniqueTerms) {
      this.docFrequencies.set(term, (this.docFrequencies.get(term) || 0) + 1);
    }
  }

  getTfIdfVector(docIndex) {
    const doc = this.documents[docIndex];
    const vector = {};
    const totalDocs = this.documents.length;
    
    for (const [term, count] of doc.termCounts) {
      const tf = count / doc.totalTerms;
      const df = this.docFrequencies.get(term) || 0;
      const idf = Math.log(1 + (totalDocs / (1 + df))); // Smooth IDF
      vector[term] = tf * idf;
    }
    return vector;
  }
  
  // Helper to create a vector for a new set of tokens (like a query or profile)
  // using the existing IDF stats
  getVectorForTokens(tokens) {
    const termCounts = new Map();
    for (const token of tokens) {
      termCounts.set(token, (termCounts.get(token) || 0) + 1);
    }
    
    const vector = {};
    const totalDocs = this.documents.length;
    
    for (const [term, count] of termCounts) {
      const tf = count / tokens.length;
      const df = this.docFrequencies.get(term) || 0;
      const idf = Math.log(1 + (totalDocs / (1 + df)));
      vector[term] = tf * idf;
    }
    return vector;
  }
}

function extractBoostedContent(content) {
  if (!content) return '';
  
  let boosted = '';
  
  // Headers
  const headers = content.match(/^#+\s+(.*)$/gm);
  if (headers) {
    boosted += headers.map(h => h.replace(/^#+\s+/, '')).join(' ') + ' ';
  }
  
  // Bold text
  const bold = content.match(/\*\*(.*?)\*\*/g);
  if (bold) {
    boosted += bold.map(b => b.replace(/\*\*/g, '')).join(' ') + ' ';
  }
  
  return boosted;
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
    
    // Boosted content (headers, bold) is repeated to increase term frequency
    const boosted = extractBoostedContent(parsed.content);
    const fullText = `${id} ${parsed.data.title || ''} ${parsed.data.description || ''} ${boosted} ${boosted} ${parsed.content}`;
    
    assets.push({
      id,
      type,
      key: `${type}:${id}`,
      filename: file,
      data: parsed.data,
      fullText,
      tokens: getTokens(fullText)
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
      // Initial tokens from metadata
      tokens: getTokens(`${file.replace('.json', '')} ${content.description || ''}`)
    });
  }
  return collections;
}

function calculateTfIdfVectors(assets) {
  const tfidf = new TfIdf();
  
  assets.forEach(asset => {
    tfidf.addDocument(asset.tokens);
  });
  
  // Build vectors for each asset
  const assetVectors = new Map();
  
  assets.forEach((asset, index) => {
    const vector = tfidf.getTfIdfVector(index);
    assetVectors.set(asset.key, vector);
  });
  
  return { tfidf, assetVectors };
}

function cosineSimilarity(vecA, vecB) {
  const terms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  
  for (const term of terms) {
    const valA = vecA[term] || 0;
    const valB = vecB[term] || 0;
    dotProduct += valA * valB;
    magA += valA * valA;
    magB += valB * valB;
  }
  
  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

function getCollectionProfileVector(collection, allAssetsMap, assetVectors, tfidf) {
  // Start with collection's own metadata tokens
  // We use the global TF-IDF model to get the vector for these tokens
  const baseVector = tfidf.getVectorForTokens(collection.tokens);
  
  // Boost metadata importance
  for (const key in baseVector) {
    baseVector[key] *= 2;
  }

  // Aggregate vectors of existing items
  const existingItems = collection.data.items || [];
  if (existingItems.length === 0) return baseVector;

  const combinedVector = { ...baseVector };
  
  for (const itemKey of existingItems) {
    const assetVector = assetVectors.get(itemKey);
    if (assetVector) {
      for (const [term, score] of Object.entries(assetVector)) {
        combinedVector[term] = (combinedVector[term] || 0) + score;
      }
    }
  }
  
  return combinedVector;
}

function subtractVector(vecA, vecB) {
  const result = { ...vecA };
  for (const [term, valB] of Object.entries(vecB)) {
    if (result[term]) {
      result[term] -= valB;
      if (result[term] <= 0.0001) delete result[term]; // Remove if effectively zero
    }
  }
  return result;
}

async function main() {
  program
    .name('analyze-collections')
    .description('Analyze collections and suggest missing assets using TF-IDF and Cosine Similarity')
    .option('-a, --add', 'Automatically add high-confidence matches to collections')
    .option('-r, --remove', 'Automatically remove low-confidence items from collections')
    .option('--add-threshold <number>', 'Similarity threshold for adding (0.0 to 1.0)', '0.2')
    .option('--remove-threshold <number>', 'Similarity threshold for removing (0.0 to 1.0)', '0.05')
    .parse(process.argv);

  const options = program.opts();
  const addThreshold = parseFloat(options.addThreshold);
  const removeThreshold = parseFloat(options.removeThreshold);

  console.log(chalk.blue('Loading assets...'));

  const [chatmodes, instructions, prompts] = await Promise.all([
    loadAssets('chatmodes'),
    loadAssets('instructions'),
    loadAssets('prompts')
  ]);

  const allAssets = [...chatmodes, ...instructions, ...prompts];
  const allAssetsMap = new Map(allAssets.map(a => [a.key, a]));

  console.log(chalk.blue(`Loaded ${allAssets.length} assets.`));

  const collections = await loadCollections();
  console.log(chalk.blue(`Loaded ${collections.length} collections.`));

  console.log(chalk.yellow('\nCalculating TF-IDF vectors...'));
  const { tfidf, assetVectors } = calculateTfIdfVectors(allAssets);

  console.log(chalk.yellow('Analyzing collections...'));

  for (const collection of collections) {
    const profileVector = getCollectionProfileVector(collection, allAssetsMap, assetVectors, tfidf);
    let isModified = false;
    
    console.log(chalk.green(`\nCollection: ${collection.filename}`));
    console.log(chalk.dim(collection.data.description || 'No description'));

    // --- PRUNING PHASE ---
    const existingItems = collection.data.items || [];
    const outliers = [];

    for (const itemKey of existingItems) {
      const assetVector = assetVectors.get(itemKey);
      
      if (!assetVector) {
        console.log(chalk.red(`  [MISSING] ${itemKey} (File not found)`));
        // We don't auto-prune missing files unless explicitly asked, but for now let's just flag them
        continue;
      }

      // "Leave-One-Out" Validation:
      // Check how well this item fits the collection *without* itself included in the profile.
      // This prevents an item from validating itself.
      const profileMinusItem = subtractVector(profileVector, assetVector);
      const score = cosineSimilarity(profileMinusItem, assetVector);

      if (score < removeThreshold) {
        outliers.push({ key: itemKey, score });
      }
    }

    if (outliers.length > 0) {
      outliers.sort((a, b) => a.score - b.score);
      console.log(chalk.yellow(`  Outliers (Low Similarity < ${removeThreshold}):`));
      
      for (const { key, score } of outliers) {
        console.log(`    [${score.toFixed(3)}] ${chalk.red(key)}`);
      }

      if (options.remove) {
        const keysToRemove = new Set(outliers.map(o => o.key));
        collection.data.items = collection.data.items.filter(k => !keysToRemove.has(k));
        console.log(chalk.red(`    -> Removed ${outliers.length} items`));
        isModified = true;
      }
    }

    // --- SUGGESTION PHASE ---
    const suggestions = [];

    for (const asset of allAssets) {
      // Skip if already in collection
      if (collection.data.items && collection.data.items.includes(asset.key)) continue;

      const assetVector = assetVectors.get(asset.key);
      const score = cosineSimilarity(profileVector, assetVector);
      
      if (score >= addThreshold) {
        suggestions.push({ asset, score });
      }
    }

    if (suggestions.length > 0) {
      suggestions.sort((a, b) => b.score - a.score);
      
      const newItems = [];
      const topSuggestions = suggestions.slice(0, 10); // Limit to top 10

      for (const { asset, score } of topSuggestions) {
        console.log(`  [${score.toFixed(3)}] ${chalk.cyan(asset.key)} - ${chalk.dim(asset.data.title || asset.id)}`);
        newItems.push(asset.key);
      }

      if (options.add) {
        if (!collection.data.items) collection.data.items = [];
        collection.data.items.push(...newItems);
        collection.data.items = [...new Set(collection.data.items)]; // Dedupe
        console.log(chalk.magenta(`    -> Added ${newItems.length} items`));
        isModified = true;
      }
    }

    // --- SAVE ---
    if (isModified) {
      await fs.writeJson(collection.filePath, collection.data, { spaces: 2 });
      console.log(chalk.blue(`    -> Saved changes to ${collection.filename}`));
    }
  }
  
  console.log(chalk.blue('\nDone.'));
}

main().catch(console.error);
