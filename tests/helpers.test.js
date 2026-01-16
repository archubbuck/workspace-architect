import { describe, it, expect } from 'vitest';
import {
  normalizeCollectionItems,
  convertYamlItemsToFlat,
} from '../bin/cli-functions.js';

describe('CLI Helper Functions', () => {
  describe('normalizeCollectionItems', () => {
    it('should return empty array for null or undefined', () => {
      expect(normalizeCollectionItems(null)).toEqual([]);
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
  });

  describe('convertYamlItemsToFlat', () => {
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

    it('should convert multiple items', () => {
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

    it('should skip items without path or kind', () => {
      const items = [
        { kind: 'agent' },
        { path: 'agents/valid.agent.md', kind: 'agent' },
      ];
      const result = convertYamlItemsToFlat(items);
      
      expect(result).toEqual(['agents:valid']);
    });

    it('should handle empty array', () => {
      expect(convertYamlItemsToFlat([])).toEqual([]);
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
  });
});
