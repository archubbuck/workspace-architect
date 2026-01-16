#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import {
  listAssets,
  downloadAsset,
} from './cli-functions.js';

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

program.parse();
