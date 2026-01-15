# Scripts Directory

This directory contains all utility scripts for maintaining the workspace-architect project. Scripts are organized into logical categories for better maintainability.

## Directory Structure

```
scripts/
├── analysis/          # Scripts for analyzing and validating assets
├── generation/        # Scripts for generating manifests and migrations
├── sync/             # Scripts for syncing assets from upstream sources
└── utils/            # Shared utility modules
```

## Script Categories

### Analysis (`analysis/`)
Scripts for analyzing and validating project assets.

- **analyze-collections.js** - Analyzes collections using TF-IDF and cosine similarity to suggest missing assets or identify outliers
  ```bash
  npm run analyze
  # Options: --add, --remove, --add-threshold, --remove-threshold
  ```

- **validate-skills.js** - Validates Claude Skills metadata and structure
  ```bash
  npm run validate-skills
  ```

### Generation (`generation/`)
Scripts for generating project artifacts and performing migrations.

- **generate-manifest.js** - Generates the `assets-manifest.json` file from all assets
  ```bash
  npm run generate-manifest
  ```

- **migrate-collections-format.js** - Migrates collection files from flat array format to nested object format
  ```bash
  npm run migrate-collections
  ```

### Sync (`sync/`)
Scripts for synchronizing assets from upstream repositories.

All sync scripts follow the same pattern and support `.env` configuration for GitHub tokens:

- **sync-agents.js** - Syncs agents from github/awesome-copilot
  ```bash
  npm run sync-agents
  ```

- **sync-collections.js** - Syncs collections from github/awesome-copilot
  ```bash
  npm run sync-collections
  ```

- **sync-instructions.js** - Syncs instructions from github/awesome-copilot
  ```bash
  npm run sync-instructions
  ```

- **sync-prompts.js** - Syncs prompts from github/awesome-copilot
  ```bash
  npm run sync-prompts
  ```

- **sync-anthropic-skills.js** - Syncs Claude Skills from anthropics/skills
  ```bash
  npm run sync-skills
  ```

### Utils (`utils/`)
Shared utility modules used by other scripts.

- **env-loader.js** - Loads and parses environment variables from `.env` file
- **github-utils.js** - Common functions for GitHub API interactions (fetch, download, recursive file listing)
- **sync-base.js** - Base sync functionality shared by all sync scripts
- **sync-utils.js** - Utility functions for working with local files during sync operations

## Code Reuse

The refactored scripts significantly reduce code duplication:

- **Before**: Each sync script contained ~200 lines with duplicated logic for env loading, GitHub API calls, and file management
- **After**: Sync scripts are now ~30 lines each, leveraging shared utilities

### Key Improvements:
1. **Single Source of Truth**: Common logic extracted to utility modules
2. **DRY Principle**: Eliminated ~800 lines of duplicated code
3. **Maintainability**: Changes to sync logic only need to be made once in `sync-base.js`
4. **Consistency**: All sync scripts behave identically

## Environment Configuration

Sync scripts support GitHub tokens via `.env` file:

```bash
# .env
GITHUB_TOKEN=your_github_token_here
```

This helps avoid rate limiting when syncing from GitHub repositories.

## Development

When adding new scripts:

1. Place them in the appropriate category folder
2. Update `package.json` with a corresponding npm script
3. Leverage existing utilities from `utils/` when possible
4. Follow the established patterns (especially for sync scripts)
5. Update this README with documentation for the new script
