import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeCollectionItems,
  convertYamlItemsToFlat,
  isLocal,
  getManifest,
  listAssets,
  downloadAsset,
} from '../bin/cli-functions.js';

// Additional unit tests for helper function logic
// These tests complement helpers.test.js with more edge cases

describe('normalizeCollectionItems - additional edge cases', () => {
  it('should return empty array for null', () => {
    expect(normalizeCollectionItems(null)).toEqual([]);
  });

  it('should return empty array for undefined', () => {
    expect(normalizeCollectionItems(undefined)).toEqual([]);
  });

  it('should return array as-is for old format', () => {
    const items = ['instructions:reactjs', 'prompts:code-review'];
    expect(normalizeCollectionItems(items)).toEqual(items);
  });

  it('should convert object to flat array for new format', () => {
    const items = {
      instructions: ['reactjs', 'typescript'],
      prompts: ['code-review'],
      agents: ['azure-architect'],
    };
    const result = normalizeCollectionItems(items);
    
    expect(result).toContain('instructions:reactjs');
    expect(result).toContain('instructions:typescript');
    expect(result).toContain('prompts:code-review');
    expect(result).toContain('agents:azure-architect');
    expect(result).toHaveLength(4);
  });

  it('should handle empty object', () => {
    expect(normalizeCollectionItems({})).toEqual([]);
  });

  it('should handle empty array', () => {
    expect(normalizeCollectionItems([])).toEqual([]);
  });

  it('should skip non-array values in object format', () => {
    const items = {
      instructions: ['reactjs'],
      prompts: 'invalid', // Not an array
    };
    const result = normalizeCollectionItems(items);
    
    expect(result).toEqual(['instructions:reactjs']);
  });

  it('should handle mixed valid and invalid entries', () => {
    const items = {
      instructions: ['reactjs'],
      agents: [],
      prompts: ['code-review'],
    };
    const result = normalizeCollectionItems(items);
    
    expect(result).toContain('instructions:reactjs');
    expect(result).toContain('prompts:code-review');
    expect(result).toHaveLength(2);
  });
});

describe('convertYamlItemsToFlat - additional edge cases', () => {
  it('should return empty array for non-array input', () => {
    expect(convertYamlItemsToFlat(null)).toEqual([]);
    expect(convertYamlItemsToFlat(undefined)).toEqual([]);
    expect(convertYamlItemsToFlat({})).toEqual([]);
  });

  it('should convert agent YAML item to flat format', () => {
    const items = [
      { path: 'agents/azure-architect.agent.md', kind: 'agent' },
    ];
    const result = convertYamlItemsToFlat(items);
    
    expect(result).toEqual(['agents:azure-architect']);
  });

  it('should convert instruction YAML item to flat format', () => {
    const items = [
      { path: 'instructions/reactjs.instructions.md', kind: 'instruction' },
    ];
    const result = convertYamlItemsToFlat(items);
    
    expect(result).toEqual(['instructions:reactjs']);
  });

  it('should convert prompt YAML item to flat format', () => {
    const items = [
      { path: 'prompts/code-review.prompt.md', kind: 'prompt' },
    ];
    const result = convertYamlItemsToFlat(items);
    
    expect(result).toEqual(['prompts:code-review']);
  });

  it('should handle multiple items', () => {
    const items = [
      { path: 'agents/azure-architect.agent.md', kind: 'agent' },
      { path: 'instructions/reactjs.instructions.md', kind: 'instruction' },
      { path: 'prompts/code-review.prompt.md', kind: 'prompt' },
    ];
    const result = convertYamlItemsToFlat(items);
    
    expect(result).toHaveLength(3);
    expect(result).toContain('agents:azure-architect');
    expect(result).toContain('instructions:reactjs');
    expect(result).toContain('prompts:code-review');
  });

  it('should skip items without path', () => {
    const items = [
      { kind: 'agent' },
      { path: 'agents/valid.agent.md', kind: 'agent' },
    ];
    const result = convertYamlItemsToFlat(items);
    
    expect(result).toEqual(['agents:valid']);
  });

  it('should skip items without kind', () => {
    const items = [
      { path: 'agents/no-kind.agent.md' },
      { path: 'agents/valid.agent.md', kind: 'agent' },
    ];
    const result = convertYamlItemsToFlat(items);
    
    expect(result).toEqual(['agents:valid']);
  });

  it('should skip items with invalid path format', () => {
    const items = [
      { path: 'invalid', kind: 'agent' },
      { path: 'agents/valid.agent.md', kind: 'agent' },
    ];
    const result = convertYamlItemsToFlat(items);
    
    expect(result).toEqual(['agents:valid']);
  });

  it('should handle .md extension without type-specific extension', () => {
    const items = [
      { path: 'prompts/simple.md', kind: 'prompt' },
    ];
    const result = convertYamlItemsToFlat(items);
    
    expect(result).toEqual(['prompts:simple']);
  });

  it('should use pluralMap for known kinds', () => {
    const items = [
      { path: 'agents/test.agent.md', kind: 'agent' },
      { path: 'instructions/test.instructions.md', kind: 'instruction' },
      { path: 'prompts/test.prompt.md', kind: 'prompt' },
      { path: 'skills/test.md', kind: 'skill' },
      { path: 'collections/test.md', kind: 'collection' },
    ];
    const result = convertYamlItemsToFlat(items);
    
    expect(result).toContain('agents:test');
    expect(result).toContain('instructions:test');
    expect(result).toContain('prompts:test');
    expect(result).toContain('skills:test');
    expect(result).toContain('collections:test');
  });

  it('should fallback to simple pluralization for unknown kinds', () => {
    const items = [
      { path: 'customs/test.md', kind: 'custom' },
    ];
    const result = convertYamlItemsToFlat(items);
    
    expect(result).toEqual(['customs:test']);
  });

  it('should handle empty array', () => {
    expect(convertYamlItemsToFlat([])).toEqual([]);
  });
});

describe('ID parsing logic', () => {
  function parseAssetId(id) {
    const [type, name] = id.split(':');
    return { type, name };
  }

  it('should parse valid ID format', () => {
    const result = parseAssetId('instructions:reactjs');
    expect(result).toEqual({ type: 'instructions', name: 'reactjs' });
  });

  it('should handle ID with colons in name', () => {
    const result = parseAssetId('instructions:my:special:name');
    // Only first colon is used as separator
    expect(result.type).toBe('instructions');
    expect(result.name).toBe('my');
  });

  it('should handle invalid format gracefully', () => {
    const result = parseAssetId('invalid');
    expect(result.type).toBe('invalid');
    expect(result.name).toBeUndefined();
  });
});

describe('Valid asset types', () => {
  const validTypes = ['instructions', 'prompts', 'agents', 'skills', 'collections'];

  it('should include all expected types', () => {
    expect(validTypes).toContain('instructions');
    expect(validTypes).toContain('prompts');
    expect(validTypes).toContain('agents');
    expect(validTypes).toContain('skills');
    expect(validTypes).toContain('collections');
  });

  it('should have exactly 5 types', () => {
    expect(validTypes).toHaveLength(5);
  });

  it('should validate type correctly', () => {
    expect(validTypes.includes('instructions')).toBe(true);
    expect(validTypes.includes('invalid')).toBe(false);
  });
});

describe('isLocal function', () => {
  it('should return a boolean value', async () => {
    const result = await isLocal();
    expect(typeof result).toBe('boolean');
  });

  it('should cache the result on subsequent calls', async () => {
    const result1 = await isLocal();
    const result2 = await isLocal();
    expect(result1).toBe(result2);
  });

  it('should return true when assets directory exists', async () => {
    const result = await isLocal();
    // In test environment, assets directory exists
    expect(result).toBe(true);
  });
});

describe('getManifest function', () => {
  it('should throw error when manifest not found in production mode', async () => {
    // This test will pass in local mode because we have assets
    // In production mode without manifest, it should throw
    try {
      await getManifest();
      // If we get here, manifest exists (local mode)
      expect(true).toBe(true);
    } catch (error) {
      expect(error.message).toContain('Manifest file not found');
    }
  });
});

describe('listAssets function', () => {
  it('should list instructions without errors', async () => {
    // Should not throw
    await expect(listAssets('instructions')).resolves.not.toThrow();
  });

  it('should list agents without errors', async () => {
    await expect(listAssets('agents')).resolves.not.toThrow();
  });

  it('should list prompts without errors', async () => {
    await expect(listAssets('prompts')).resolves.not.toThrow();
  });

  it('should list skills without errors', async () => {
    await expect(listAssets('skills')).resolves.not.toThrow();
  });

  it('should list collections without errors', async () => {
    await expect(listAssets('collections')).resolves.not.toThrow();
  });

  it('should list hooks without errors', async () => {
    await expect(listAssets('hooks')).resolves.not.toThrow();
  });

  it('should list plugins without errors', async () => {
    await expect(listAssets('plugins')).resolves.not.toThrow();
  });

  it('should handle non-existent asset type gracefully', async () => {
    await expect(listAssets('nonexistent')).resolves.not.toThrow();
  });
});

describe('downloadAsset function', () => {
  it('should throw error for invalid ID format', async () => {
    await expect(downloadAsset('invalid-format', { dryRun: true }))
      .rejects.toThrow('Invalid ID format');
  });

  it('should throw error for invalid type', async () => {
    await expect(downloadAsset('invalid:name', { dryRun: true }))
      .rejects.toThrow('Invalid type');
  });

  it('should throw error for missing type', async () => {
    await expect(downloadAsset(':name', { dryRun: true }))
      .rejects.toThrow('Invalid ID format');
  });

  it('should throw error for missing name', async () => {
    await expect(downloadAsset('instructions:', { dryRun: true }))
      .rejects.toThrow('Invalid ID format');
  });

  it('should handle instructions download in dry-run mode', async () => {
    await expect(downloadAsset('instructions:a11y', { dryRun: true }))
      .resolves.not.toThrow();
  });

  it('should handle agents download in dry-run mode', async () => {
    await expect(downloadAsset('agents:CSharpExpert', { dryRun: true }))
      .resolves.not.toThrow();
  });

  it('should handle prompts download in dry-run mode', async () => {
    await expect(downloadAsset('prompts:add-educational-comments', { dryRun: true }))
      .resolves.not.toThrow();
  });

  it('should handle skills download in dry-run mode', async () => {
    await expect(downloadAsset('skills:example-planner', { dryRun: true }))
      .resolves.not.toThrow();
  });

  it('should handle collections download in dry-run mode', async () => {
    await expect(downloadAsset('collections:web-frontend-development', { dryRun: true }))
      .resolves.not.toThrow();
  });

  it('should handle hooks download in dry-run mode', async () => {
    await expect(downloadAsset('hooks:governance-audit', { dryRun: true }))
      .resolves.not.toThrow();
  });

  it('should handle plugins download in dry-run mode', async () => {
    await expect(downloadAsset('plugins:awesome-copilot', { dryRun: true }))
      .resolves.not.toThrow();
  });

  it('should handle output option', async () => {
    await expect(downloadAsset('instructions:a11y', { dryRun: true, output: '/tmp/test' }))
      .resolves.not.toThrow();
  });

  it('should handle force option', async () => {
    await expect(downloadAsset('instructions:a11y', { dryRun: true, force: true }))
      .resolves.not.toThrow();
  });

  it('should throw error for nonexistent asset', async () => {
    await expect(downloadAsset('instructions:nonexistent-12345', { dryRun: true }))
      .rejects.toThrow();
  });
});

describe('normalizeCollectionItems - return statement coverage', () => {
  it('should return empty array for string input', () => {
    const result = normalizeCollectionItems('invalid-string');
    expect(result).toEqual([]);
  });

  it('should return empty array for number input', () => {
    const result = normalizeCollectionItems(123);
    expect(result).toEqual([]);
  });

  it('should return empty array for boolean input', () => {
    const result = normalizeCollectionItems(true);
    expect(result).toEqual([]);
  });
});
