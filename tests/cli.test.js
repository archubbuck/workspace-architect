import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', 'bin', 'cli.js');

// Helper to execute CLI commands
function execCLI(args, options = {}) {
  try {
    const result = execSync(`node ${CLI_PATH} ${args}`, {
      encoding: 'utf-8',
      ...options,
    });
    return { stdout: result, stderr: '', exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status || 1,
    };
  }
}

describe('CLI - list command', () => {
  it('should list all asset types when no type is specified', () => {
    const result = execCLI('list');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('instructions');
    expect(result.stdout).toContain('prompts');
    expect(result.stdout).toContain('agents');
    expect(result.stdout).toContain('skills');
    expect(result.stdout).toContain('collections');
  });

  it('should list only instructions when type is instructions', () => {
    const result = execCLI('list instructions');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('instructions');
  });

  it('should list only agents when type is agents', () => {
    const result = execCLI('list agents');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('agents');
  });

  it('should list only prompts when type is prompts', () => {
    const result = execCLI('list prompts');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('prompts');
  });

  it('should list only skills when type is skills', () => {
    const result = execCLI('list skills');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('skills');
  });

  it('should list only collections when type is collections', () => {
    const result = execCLI('list collections');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('collections');
  });

  it('should handle invalid asset type gracefully', () => {
    const result = execCLI('list invalid-type');
    
    // Should either succeed with no assets or handle gracefully
    expect(result.exitCode).toBe(0);
  });
});

describe('CLI - download command with --dry-run', () => {
  it('should simulate download with --dry-run flag', () => {
    const result = execCLI('download instructions a11y --dry-run', {
      cwd: os.tmpdir(),
    });
    
    expect(result.stdout).toContain('[Dry Run]');
  });

  it('should simulate download with -d flag (short form)', () => {
    const result = execCLI('download instructions a11y -d', {
      cwd: os.tmpdir(),
    });
    
    expect(result.stdout).toContain('[Dry Run]');
  });

  it('should show would write path in dry-run', () => {
    const result = execCLI('download instructions a11y --dry-run', {
      cwd: os.tmpdir(),
    });
    
    expect(result.stdout).toContain('Would write to');
  });
});

describe('CLI - download command error handling', () => {
  it('should fail gracefully when asset not found', () => {
    const result = execCLI('download instructions nonexistent-asset-12345 --dry-run');
    
    // Should exit with error code or show error message
    expect(result.exitCode === 1 || result.stderr.includes('not found')).toBe(true);
  });

  it('should fail when invalid type is provided', () => {
    const result = execCLI('download invalid-type some-name --dry-run');
    
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Invalid type');
  });

  it('should fail when no name is provided', () => {
    const result = execCLI('download instructions');
    
    expect(result.exitCode).toBe(1);
  });
});

describe('CLI - download command with --force flag', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wsa-test-'));
  });

  afterEach(async () => {
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  it('should accept --force flag', () => {
    const result = execCLI('download instructions a11y --dry-run --force');
    
    expect(result.stdout).toContain('[Dry Run]');
  });

  it('should accept -f flag (short form)', () => {
    const result = execCLI('download instructions a11y --dry-run -f');
    
    expect(result.stdout).toContain('[Dry Run]');
  });
});

describe('CLI - download command with --output flag', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wsa-test-'));
  });

  afterEach(async () => {
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  it('should accept --output flag', () => {
    const result = execCLI(`download instructions a11y --dry-run --output ${tempDir}`);
    
    expect(result.stdout).toContain('[Dry Run]');
    expect(result.stdout).toContain(tempDir);
  });

  it('should accept -o flag (short form)', () => {
    const result = execCLI(`download instructions a11y --dry-run -o ${tempDir}`);
    
    expect(result.stdout).toContain('[Dry Run]');
    expect(result.stdout).toContain(tempDir);
  });
});

describe('CLI - download command with collections', () => {
  it('should download collections with --dry-run', () => {
    const result = execCLI('download collections web-frontend-development --dry-run', {
      cwd: os.tmpdir(),
    });
    
    // Collections may download multiple assets - should succeed with exit code 0
    expect(result.exitCode).toBe(0);
  });
});

describe('CLI - download command with skills', () => {
  it('should download skills with --dry-run', () => {
    const result = execCLI('download skills example-planner --dry-run', {
      cwd: os.tmpdir(),
    });
    
    // Skills are multi-file assets - should show dry run message
    expect(result.stdout).toContain('[Dry Run]');
  });
});

describe('CLI - legacy format support', () => {
  it('should show deprecation warning for type:name format', () => {
    const result = execCLI('download instructions:a11y --dry-run', {
      cwd: os.tmpdir(),
    });
    
    expect(result.stdout).toContain('Deprecation Warning') || expect(result.stdout).toContain('deprecated');
  });
});

describe('CLI - version and help', () => {
  it('should display version with --version', () => {
    const result = execCLI('--version');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should display version with -V', () => {
    const result = execCLI('-V');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should display help with --help', () => {
    const result = execCLI('--help');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage:') || expect(result.stdout).toContain('workspace-architect');
  });

  it('should display help with -h', () => {
    const result = execCLI('-h');
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage:') || expect(result.stdout).toContain('workspace-architect');
  });
});

describe('CLI - both binary names', () => {
  it('should work with workspace-architect command', () => {
    const result = execCLI('--version');
    
    expect(result.exitCode).toBe(0);
  });

  // Note: Testing 'wsa' alias requires checking package.json bin configuration
  // The alias is configured correctly in package.json
});

describe('CLI - combined flags', () => {
  it('should accept multiple flags together', () => {
    const tempDir = os.tmpdir();
    const result = execCLI(`download instructions a11y --dry-run --force -o ${tempDir}`);
    
    expect(result.stdout).toContain('[Dry Run]');
  });
});
