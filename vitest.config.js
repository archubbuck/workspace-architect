import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['bin/cli-functions.js'],
      exclude: [
        'bin/cli.js', // Exclude the CLI wrapper - tested via integration tests
        'node_modules/**',
        'tests/**',
        'scripts/**',
        'verdaccio/**',
        '**/*.config.js',
      ],
      // Coverage thresholds for workspace-architect CLI
      // Note: CLI tools have unique testing challenges:
      // - Heavy I/O operations (file system, network, user prompts)
      // - External process execution in integration tests doesn't count toward coverage
      // - Many code paths require specific runtime environments
      //
      // Our approach combines:
      // - Unit tests for pure logic functions (normalizeCollectionItems, convertYamlItemsToFlat)
      // - Integration tests for CLI commands (list, download with all flags)
      // 
      // Thresholds reflect testable code (helper functions, validation, parsing)
      // while accepting that I/O-heavy paths are validated through integration tests
      // 
      // After review feedback: Increased from initial 10-13% to be more stringent
      // Current achievable coverage with integration testing approach: ~13% lines, 20% functions
      // Thresholds set slightly below to allow for minor fluctuations while enforcing quality
      thresholds: {
        lines: 12,
        functions: 20,
        branches: 10,
        statements: 13,
      },
    },
  },
});
