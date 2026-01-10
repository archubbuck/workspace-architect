#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const COLLECTIONS_DIR = path.join(ROOT_DIR, 'assets/collections');

/**
 * Convert flat array format to nested object format.
 * 
 * Old format: ["instructions:reactjs", "prompts:code-review", "agents:expert-architect"]
 * New format: { "instructions": ["reactjs"], "prompts": ["code-review"], "agents": ["expert-architect"] }
 * 
 * @param {Array} items - Flat array of items in "type:name" format
 * @returns {Object} Nested object with type keys
 */
function itemsToNestedFormat(items) {
  if (!Array.isArray(items)) {
    // Already in nested format or invalid
    return items;
  }
  
  const nested = {};
  
  for (const item of items) {
    if (typeof item !== 'string' || !item.includes(':')) {
      console.warn(chalk.yellow(`  Warning: Invalid item format: ${item}`));
      continue;
    }
    
    const [type, name] = item.split(':');
    if (!type || !name) {
      console.warn(chalk.yellow(`  Warning: Could not parse item: ${item}`));
      continue;
    }
    
    if (!nested[type]) {
      nested[type] = [];
    }
    nested[type].push(name);
  }
  
  return nested;
}

/**
 * Check if items are already in nested format
 */
function isNestedFormat(items) {
  return items && typeof items === 'object' && !Array.isArray(items);
}

async function migrateCollections() {
  console.log(chalk.blue.bold('\n=== Migrating Collection Files to New Format ===\n'));
  
  if (!await fs.pathExists(COLLECTIONS_DIR)) {
    console.error(chalk.red(`Collections directory not found: ${COLLECTIONS_DIR}`));
    process.exit(1);
  }
  
  const files = await fs.readdir(COLLECTIONS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(chalk.blue(`Found ${jsonFiles.length} JSON collection file(s)\n`));
  
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const file of jsonFiles) {
    const filePath = path.join(COLLECTIONS_DIR, file);
    
    try {
      const content = await fs.readJson(filePath);
      
      if (!content.items) {
        console.log(chalk.yellow(`  ⊘ Skipped ${file}: No items field`));
        skippedCount++;
        continue;
      }
      
      if (isNestedFormat(content.items)) {
        console.log(chalk.dim(`  ✓ Skipped ${file}: Already in nested format`));
        skippedCount++;
        continue;
      }
      
      // Migrate to nested format
      const oldItems = content.items;
      content.items = itemsToNestedFormat(oldItems);
      
      // Write back to file with proper formatting
      await fs.writeJson(filePath, content, { spaces: 2 });
      
      console.log(chalk.green(`  ✓ Migrated ${file}: ${oldItems.length} items converted`));
      migratedCount++;
      
    } catch (error) {
      console.error(chalk.red(`  ✗ Error processing ${file}:`), error.message);
      errorCount++;
    }
  }
  
  console.log(chalk.blue.bold('\n=== Migration Complete ==='));
  console.log(chalk.green(`✓ Migrated: ${migratedCount} collections`));
  console.log(chalk.dim(`⊘ Skipped: ${skippedCount} collections`));
  
  if (errorCount > 0) {
    console.log(chalk.red(`✗ Errors: ${errorCount} collections`));
    process.exit(1);
  }
}

migrateCollections().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
