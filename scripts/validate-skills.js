#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.join(__dirname, '../assets/skills');

function validateSkillMetadata(parsed, skillName) {
  const errors = [];
  const warnings = [];
  
  // Required fields
  if (!parsed.data.name) {
    errors.push('Missing required field: name');
  } else if (!/^[a-z0-9-]+$/.test(parsed.data.name)) {
    errors.push('Skill name must be lowercase with hyphens only');
  }
  
  if (!parsed.data.description) {
    errors.push('Missing required field: description');
  }
  
  // Optional but recommended fields
  if (!parsed.data.license) {
    warnings.push('Missing recommended field: license');
  }
  
  if (!parsed.data.metadata?.version) {
    warnings.push('Missing recommended field: metadata.version');
  }
  
  return { errors, warnings };
}

async function validateSkill(skillName) {
  const skillPath = path.join(SKILLS_DIR, skillName);
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
    
    const { errors, warnings } = validateSkillMetadata(parsed, skillName);
    
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
    console.log(chalk.dim(`    Description: ${parsed.data.description.substring(0, 60)}...`));
    
    return true;
  } catch (error) {
    console.log(chalk.red(`  ✗ Error parsing SKILL.md: ${error.message}`));
    return false;
  }
}

async function getFilesRecursive(dir, baseDir = dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getFilesRecursive(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      files.push(path.relative(baseDir, fullPath));
    }
  }
  
  return files;
}

async function validateAllSkills() {
  console.log(chalk.blue.bold('=== Validating Claude Skills ==='));
  
  if (!await fs.pathExists(SKILLS_DIR)) {
    console.log(chalk.yellow('No skills directory found'));
    return;
  }
  
  const skills = await fs.readdir(SKILLS_DIR);
  const skillDirs = [];
  
  for (const item of skills) {
    const itemPath = path.join(SKILLS_DIR, item);
    const stat = await fs.stat(itemPath);
    if (stat.isDirectory()) {
      skillDirs.push(item);
    }
  }
  
  if (skillDirs.length === 0) {
    console.log(chalk.yellow('No skills found'));
    return;
  }
  
  console.log(chalk.blue(`Found ${skillDirs.length} skills\n`));
  
  let validCount = 0;
  let invalidCount = 0;
  
  for (const skill of skillDirs) {
    const isValid = await validateSkill(skill);
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  }
  
  console.log(chalk.blue.bold('\n=== Validation Complete ==='));
  console.log(chalk.green(`✓ Valid skills: ${validCount}`));
  if (invalidCount > 0) {
    console.log(chalk.red(`✗ Invalid skills: ${invalidCount}`));
    process.exit(1);
  }
}

validateAllSkills().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
