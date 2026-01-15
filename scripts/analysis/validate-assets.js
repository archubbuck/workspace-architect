#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '../../assets');

function truncateDescription(description, maxLength = 60) {
  if (!description) return '';
  return description.length > maxLength 
    ? description.substring(0, maxLength) + '...' 
    : description;
}

function validateMetadata(parsed, assetName, assetType) {
  const errors = [];
  const warnings = [];
  
  // Check for description field (common across all asset types)
  if (!parsed.data.description || parsed.data.description?.trim() === '') {
    errors.push('Missing required field: description');
  }
  
  // Type-specific validation
  if (assetType === 'skills') {
    // Required fields for skills
    if (!parsed.data.name) {
      errors.push('Missing required field: name');
    } else if (!/^[A-Za-z0-9_-]+$/.test(parsed.data.name)) {
      errors.push('Skill name may contain letters, numbers, hyphens, and underscores only');
    }
    
    // Optional but recommended fields for skills
    if (!parsed.data.license) {
      warnings.push('Missing recommended field: license');
    }
    
    if (!parsed.data.metadata?.version) {
      warnings.push('Missing recommended field: metadata.version');
    }
  } else if (assetType === 'agents') {
    // Agents may have model, tools, etc.
    if (!parsed.data.model && !parsed.data.tools) {
      warnings.push('Agent has neither model nor tools specified');
    }
  } else if (assetType === 'prompts') {
    // Prompts may have agent, tools, etc. However, some prompts are intentionally
    // authored as standalone content without being bound to a specific agent or
    // tool configuration. For those cases, omitting both `agent` and `tools`
    // metadata is an accepted pattern. As a result, this condition is treated
    // as a warning (for visibility) rather than a hard error.
    if (!parsed.data.agent && !parsed.data.tools) {
      warnings.push('Prompt has neither agent nor tools specified');
    }
  } else if (assetType === 'instructions') {
    // Instructions should have applyTo field
    if (!parsed.data.applyTo) {
      warnings.push('Missing recommended field: applyTo');
    }
  }
  
  return { errors, warnings };
}

async function validateSkill(skillName) {
  const skillPath = path.join(ASSETS_DIR, 'skills', skillName);
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  
  console.log(chalk.blue(`\nValidating skill: ${skillName}`));
  
  // Check if SKILL.md exists
  if (!await fs.pathExists(skillMdPath)) {
    console.log(chalk.red('  ✗ SKILL.md not found'));
    return false;
  }
  
  try {
    const content = await fs.readFile(skillMdPath, 'utf8');
    const parsed = matter(content);
    
    const { errors, warnings } = validateMetadata(parsed, skillName, 'skills');
    
    if (errors.length > 0) {
      console.log(chalk.red('  ✗ Validation failed:'));
      errors.forEach(err => console.log(chalk.red(`    - ${err}`)));
      return false;
    }
    
    if (warnings.length > 0) {
      console.log(chalk.yellow('  ⚠ Warnings:'));
      warnings.forEach(warn => console.log(chalk.yellow(`    - ${warn}`)));
    }
    
    // Count files
    const files = await getFilesRecursive(skillPath);
    
    console.log(chalk.green(`  ✓ Valid skill`));
    console.log(chalk.dim(`    Files: ${files.length}`));
    console.log(chalk.dim(`    Description: ${truncateDescription(parsed.data.description)}`));
    
    return true;
  } catch (error) {
    console.log(chalk.red(`  ✗ Error parsing SKILL.md: ${error.message}`));
    return false;
  }
}

async function validateFileAsset(fileName, assetType) {
  const filePath = path.join(ASSETS_DIR, assetType, fileName);
  
  console.log(chalk.blue(`\nValidating ${assetType.slice(0, -1)}: ${fileName}`));
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const parsed = matter(content);
    
    const { errors, warnings } = validateMetadata(parsed, fileName, assetType);
    
    if (errors.length > 0) {
      console.log(chalk.red('  ✗ Validation failed:'));
      errors.forEach(err => console.log(chalk.red(`    - ${err}`)));
      return false;
    }
    
    if (warnings.length > 0) {
      console.log(chalk.yellow('  ⚠ Warnings:'));
      warnings.forEach(warn => console.log(chalk.yellow(`    - ${warn}`)));
    }
    
    console.log(chalk.green(`  ✓ Valid ${assetType.slice(0, -1)}`));
    console.log(chalk.dim(`    Description: ${truncateDescription(parsed.data.description)}`));
    
    return true;
  } catch (error) {
    console.log(chalk.red(`  ✗ Error parsing file: ${error.message}`));
    return false;
  }
}

async function getFilesRecursive(dir, baseDir = dir) {
  const files = [];
  let entries;

  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Failed to read directory "${dir}": ${error.message}`);
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        const subFiles = await getFilesRecursive(fullPath, baseDir);
        files.push(...subFiles);
      } else {
        files.push(path.relative(baseDir, fullPath));
      }
    } catch (error) {
      throw new Error(`Failed to process path "${fullPath}": ${error.message}`);
    }
  }
  
  return files;
}

async function validateAssetType(assetType) {
  const assetDir = path.join(ASSETS_DIR, assetType);
  
  if (!await fs.pathExists(assetDir)) {
    console.log(chalk.yellow(`No ${assetType} directory found`));
    return { valid: 0, invalid: 0 };
  }
  
  const items = await fs.readdir(assetDir);
  let validCount = 0;
  let invalidCount = 0;
  
  if (assetType === 'skills') {
    // Skills are directories with SKILL.md files
    const skillDirs = [];
    for (const item of items) {
      const itemPath = path.join(assetDir, item);
      const stat = await fs.stat(itemPath);
      if (stat.isDirectory()) {
        skillDirs.push(item);
      }
    }
    
    if (skillDirs.length === 0) {
      console.log(chalk.yellow(`No ${assetType} found`));
      return { valid: 0, invalid: 0 };
    }
    
    console.log(chalk.blue(`Found ${skillDirs.length} ${assetType}\n`));
    
    for (const skill of skillDirs) {
      const isValid = await validateSkill(skill);
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }
  } else {
    // Agents, instructions, prompts are individual markdown files
    const suffix = assetType === 'agents' ? '.agent.md' : 
                   assetType === 'instructions' ? '.instructions.md' : 
                   assetType === 'prompts' ? '.prompt.md' : '.md';
    
    const assetFiles = items.filter(item => item.endsWith(suffix) && !item.startsWith('.'));
    
    if (assetFiles.length === 0) {
      console.log(chalk.yellow(`No ${assetType} found`));
      return { valid: 0, invalid: 0 };
    }
    
    console.log(chalk.blue(`Found ${assetFiles.length} ${assetType}\n`));
    
    for (const file of assetFiles) {
      const isValid = await validateFileAsset(file, assetType);
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }
  }
  
  return { valid: validCount, invalid: invalidCount };
}

async function validateAllAssets(assetTypesToValidate = null) {
  // If no specific types provided, validate all
  const allAssetTypes = ['agents', 'instructions', 'prompts', 'skills'];
  
  // Determine which asset types to validate
  let typesToValidate;
  if (!assetTypesToValidate) {
    // No parameter provided, validate all
    typesToValidate = allAssetTypes;
  } else if (Array.isArray(assetTypesToValidate)) {
    // Array provided, use as-is
    typesToValidate = assetTypesToValidate;
  } else {
    // Single type provided, convert to array
    typesToValidate = [assetTypesToValidate];
  }
  
  // Check if validating all asset types by comparing arrays
  const isValidatingAll = typesToValidate.length === allAssetTypes.length &&
    typesToValidate.every(type => allAssetTypes.includes(type));
  
  if (isValidatingAll) {
    console.log(chalk.blue.bold('=== Validating All Assets ===\n'));
  } else {
    console.log(chalk.blue.bold(`=== Validating ${typesToValidate.join(', ')} ===\n`));
  }
  
  let totalValid = 0;
  let totalInvalid = 0;
  const results = {};
  
  for (const assetType of typesToValidate) {
    console.log(chalk.cyan.bold(`\n--- Validating ${assetType.toUpperCase()} ---`));
    const { valid, invalid } = await validateAssetType(assetType);
    results[assetType] = { valid, invalid };
    totalValid += valid;
    totalInvalid += invalid;
  }
  
  console.log(chalk.blue.bold('\n=== Validation Summary ==='));
  for (const [type, counts] of Object.entries(results)) {
    console.log(chalk.cyan(`\n${type.toUpperCase()}:`));
    console.log(chalk.green(`  ✓ Valid: ${counts.valid}`));
    if (counts.invalid > 0) {
      console.log(chalk.yellow(`  ⚠ Invalid: ${counts.invalid}`));
    }
  }
  
  console.log(chalk.blue.bold('\n=== Overall Summary ==='));
  console.log(chalk.green(`✓ Total valid assets: ${totalValid}`));
  if (totalInvalid > 0) {
    console.log(chalk.yellow(`⚠ Total invalid assets: ${totalInvalid}`));
    console.log(chalk.yellow('\n⚠ Warning: Some assets failed validation. These assets will be excluded from the release.'));
    console.log(chalk.yellow('Review the errors above and fix the invalid assets.'));
  } else {
    console.log(chalk.green('\n✅ All assets passed validation!'));
  }
}

// Support command-line usage
const args = process.argv.slice(2);
const assetTypeArg = args[0] || null;

validateAllAssets(assetTypeArg).catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
