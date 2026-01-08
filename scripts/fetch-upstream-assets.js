/**
 * @deprecated This script is deprecated in favor of individual sync scripts.
 * Use the following scripts instead:
 * - npm run sync-agents
 * - npm run sync-instructions
 * - npm run sync-prompts
 * - npm run sync-collections
 * 
 * This wrapper is kept for backward compatibility and convenience.
 */

import { spawn } from 'child_process';
import chalk from 'chalk';

const SYNC_SCRIPTS = [
  'sync-agents',
  'sync-instructions',
  'sync-prompts',
  'sync-collections'
];

async function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`\nRunning ${scriptName}...\n`));
    
    const child = spawn('npm', ['run', scriptName], {
      stdio: 'inherit',
      env: process.env
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${scriptName} exited with code ${code}`));
      } else {
        resolve();
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runAllSyncs() {
  console.log(chalk.yellow.bold('\n⚠️  This script is deprecated. Consider using individual sync scripts.\n'));
  console.log(chalk.blue.bold('=== Running All Sync Scripts ===\n'));
  
  const errors = [];
  
  for (const script of SYNC_SCRIPTS) {
    try {
      await runScript(script);
    } catch (error) {
      console.error(chalk.red(`\n✗ Failed: ${script}`), error.message);
      errors.push({ script, error: error.message });
    }
  }
  
  console.log(chalk.blue.bold('\n=== All Syncs Complete ==='));
  
  if (errors.length > 0) {
    console.error(chalk.red(`\n❌ ${errors.length} script(s) failed:`));
    errors.forEach(({ script, error }) => {
      console.error(chalk.red(`  - ${script}: ${error}`));
    });
    process.exit(1);
  }
  
  console.log(chalk.green('✅ All syncs completed successfully!'));
}

runAllSyncs().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
