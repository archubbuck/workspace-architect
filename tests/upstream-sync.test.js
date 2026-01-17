import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper functions to simulate metadata operations
function createOldFormatMetadata(source, files, lastSync = new Date().toISOString()) {
  return {
    lastSync,
    source,
    files
  };
}

function createNewFormatMetadata(sources) {
  return {
    sources: sources.map(s => ({
      source: s.source,
      lastSync: s.lastSync || new Date().toISOString(),
      files: s.files || []
    }))
  };
}

function migrateOldToNewFormat(oldMetadata) {
  if (oldMetadata.sources) {
    // Already new format
    return oldMetadata;
  }
  
  if (oldMetadata.source && oldMetadata.files) {
    // Convert old format to new
    return {
      sources: [{
        source: oldMetadata.source,
        lastSync: oldMetadata.lastSync,
        files: oldMetadata.files
      }]
    };
  }
  
  return { sources: [] };
}

function getFilesForSource(metadata, source) {
  if (metadata.sources && Array.isArray(metadata.sources)) {
    const sourceEntry = metadata.sources.find(s => s.source === source);
    return sourceEntry ? new Set(sourceEntry.files || []) : new Set();
  } else if (metadata.source === source && metadata.files) {
    return new Set(metadata.files || []);
  }
  return new Set();
}

describe('Upstream sync metadata format', () => {
  describe('Old format (single source)', () => {
    it('should have expected structure', () => {
      const metadata = createOldFormatMetadata(
        'github/awesome-copilot/agents',
        ['agent1.md', 'agent2.md']
      );
      
      expect(metadata).toHaveProperty('lastSync');
      expect(metadata).toHaveProperty('source');
      expect(metadata).toHaveProperty('files');
      expect(metadata.source).toBe('github/awesome-copilot/agents');
      expect(metadata.files).toHaveLength(2);
    });
    
    it('should track files from a single source', () => {
      const metadata = createOldFormatMetadata(
        'github/awesome-copilot/agents',
        ['agent1.md', 'agent2.md']
      );
      
      expect(metadata.files).toContain('agent1.md');
      expect(metadata.files).toContain('agent2.md');
    });
  });
  
  describe('New format (multiple sources)', () => {
    it('should have expected structure', () => {
      const metadata = createNewFormatMetadata([
        {
          source: 'github/awesome-copilot/agents',
          files: ['agent1.md', 'agent2.md']
        }
      ]);
      
      expect(metadata).toHaveProperty('sources');
      expect(Array.isArray(metadata.sources)).toBe(true);
      expect(metadata.sources[0]).toHaveProperty('source');
      expect(metadata.sources[0]).toHaveProperty('lastSync');
      expect(metadata.sources[0]).toHaveProperty('files');
    });
    
    it('should track files from multiple sources', () => {
      const metadata = createNewFormatMetadata([
        {
          source: 'github/awesome-copilot/agents',
          files: ['agent1.md', 'agent2.md']
        },
        {
          source: 'another-org/cool-agents/agents',
          files: ['agent3.md', 'agent4.md']
        }
      ]);
      
      expect(metadata.sources).toHaveLength(2);
      expect(metadata.sources[0].files).toContain('agent1.md');
      expect(metadata.sources[1].files).toContain('agent3.md');
    });
    
    it('should keep sources independent', () => {
      const metadata = createNewFormatMetadata([
        {
          source: 'github/awesome-copilot/agents',
          files: ['agent1.md', 'agent2.md']
        },
        {
          source: 'another-org/cool-agents/agents',
          files: ['agent3.md', 'agent4.md']
        }
      ]);
      
      const source1Files = metadata.sources[0].files;
      const source2Files = metadata.sources[1].files;
      
      expect(source1Files).not.toContain('agent3.md');
      expect(source2Files).not.toContain('agent1.md');
    });
  });
  
  describe('Migration from old to new format', () => {
    it('should migrate old format to new format', () => {
      const oldMetadata = createOldFormatMetadata(
        'github/awesome-copilot/agents',
        ['agent1.md', 'agent2.md']
      );
      
      const newMetadata = migrateOldToNewFormat(oldMetadata);
      
      expect(newMetadata).toHaveProperty('sources');
      expect(newMetadata.sources).toHaveLength(1);
      expect(newMetadata.sources[0].source).toBe('github/awesome-copilot/agents');
      expect(newMetadata.sources[0].files).toEqual(['agent1.md', 'agent2.md']);
    });
    
    it('should preserve new format when already migrated', () => {
      const newMetadata = createNewFormatMetadata([
        {
          source: 'github/awesome-copilot/agents',
          files: ['agent1.md']
        }
      ]);
      
      const result = migrateOldToNewFormat(newMetadata);
      
      expect(result).toEqual(newMetadata);
    });
  });
  
  describe('Retrieving files for a specific source', () => {
    it('should get files from old format', () => {
      const metadata = createOldFormatMetadata(
        'github/awesome-copilot/agents',
        ['agent1.md', 'agent2.md']
      );
      
      const files = getFilesForSource(metadata, 'github/awesome-copilot/agents');
      
      expect(files.size).toBe(2);
      expect(files.has('agent1.md')).toBe(true);
      expect(files.has('agent2.md')).toBe(true);
    });
    
    it('should get files from new format for specific source', () => {
      const metadata = createNewFormatMetadata([
        {
          source: 'github/awesome-copilot/agents',
          files: ['agent1.md', 'agent2.md']
        },
        {
          source: 'another-org/cool-agents/agents',
          files: ['agent3.md', 'agent4.md']
        }
      ]);
      
      const files = getFilesForSource(metadata, 'github/awesome-copilot/agents');
      
      expect(files.size).toBe(2);
      expect(files.has('agent1.md')).toBe(true);
      expect(files.has('agent2.md')).toBe(true);
      expect(files.has('agent3.md')).toBe(false);
    });
    
    it('should return empty set for non-existent source', () => {
      const metadata = createNewFormatMetadata([
        {
          source: 'github/awesome-copilot/agents',
          files: ['agent1.md']
        }
      ]);
      
      const files = getFilesForSource(metadata, 'non-existent/source');
      
      expect(files.size).toBe(0);
    });
  });
  
  describe('Updating metadata with new source', () => {
    it('should add new source to existing metadata', () => {
      const metadata = createNewFormatMetadata([
        {
          source: 'github/awesome-copilot/agents',
          files: ['agent1.md']
        }
      ]);
      
      // Simulate adding a new source
      metadata.sources.push({
        source: 'another-org/cool-agents/agents',
        lastSync: new Date().toISOString(),
        files: ['agent3.md']
      });
      
      expect(metadata.sources).toHaveLength(2);
      expect(metadata.sources[1].source).toBe('another-org/cool-agents/agents');
    });
    
    it('should update existing source', () => {
      const metadata = createNewFormatMetadata([
        {
          source: 'github/awesome-copilot/agents',
          files: ['agent1.md']
        }
      ]);
      
      // Simulate updating an existing source
      const sourceIndex = metadata.sources.findIndex(
        s => s.source === 'github/awesome-copilot/agents'
      );
      metadata.sources[sourceIndex].files = ['agent1.md', 'agent2.md'];
      metadata.sources[sourceIndex].lastSync = new Date().toISOString();
      
      expect(metadata.sources).toHaveLength(1);
      expect(metadata.sources[0].files).toHaveLength(2);
      expect(metadata.sources[0].files).toContain('agent2.md');
    });
  });
});
