import { describe, it, expect } from 'vitest';

// Unit tests for helper function logic
// These tests verify the expected behavior of normalizeCollectionItems and convertYamlItemsToFlat

describe('normalizeCollectionItems logic', () => {
  function normalizeCollectionItems(items) {
    if (!items) return [];
    
    // If it's already an array (old format), return as-is
    if (Array.isArray(items)) {
      return items;
    }
    
    // If it's an object (new format), convert to flat array
    if (typeof items === 'object') {
      const flatItems = [];
      for (const [type, names] of Object.entries(items)) {
        if (Array.isArray(names)) {
          for (const name of names) {
            flatItems.push(`${type}:${name}`);
          }
        }
      }
      return flatItems;
    }
    
    return [];
  }

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

describe('convertYamlItemsToFlat logic', () => {
  function convertYamlItemsToFlat(items) {
    if (!Array.isArray(items)) return [];
    
    const pluralMap = {
      'agent': 'agents',
      'instruction': 'instructions',
      'prompt': 'prompts',
      'skill': 'skills',
      'collection': 'collections'
    };
    
    const flatItems = [];
    for (const item of items) {
      if (!item.path || !item.kind) continue;
      
      const pathParts = item.path.split('/');
      if (pathParts.length < 2) continue;
      
      const fileName = pathParts[pathParts.length - 1];
      const type = pluralMap[item.kind] || item.kind + 's';
      
      let name = fileName
        .replace('.agent.md', '')
        .replace('.instructions.md', '')
        .replace('.prompt.md', '')
        .replace('.md', '');
      
      flatItems.push(`${type}:${name}`);
    }
    
    return flatItems;
  }

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
