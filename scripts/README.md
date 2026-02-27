# Scripts Directory

This directory contains all utility scripts for maintaining the workspace-architect project. Scripts are organized into logical categories for better maintainability.

## Directory Structure

```
scripts/
├── analysis/          # Scripts for analyzing and validating assets
├── generation/        # Scripts for generating manifests and migrations
├── sync-repo.js       # Generic script for syncing assets from upstream sources
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

### Sync (`sync-repo.js`)
Generic script for synchronizing assets from upstream repositories.

The **sync-repo.js** script is a unified tool that replaces all previous individual sync scripts. It supports syncing multiple resource types from configured upstream repositories with flexible glob pattern matching.

**Usage:**
```bash
node scripts/sync-repo.js <resource-type> [options]
```

**Resource Types:**
- `agents` - Sync agents from github/awesome-copilot
- `instructions` - Sync instructions from github/awesome-copilot
- `prompts` - Sync prompts from github/awesome-copilot
- `collections` - Sync collections from github/awesome-copilot
- `skills` - Sync Claude Skills from anthropics/skills
- `all` - Sync all resources

**Options:**
- `--dry-run` - Simulate sync without making changes
- `--help, -h` - Display help message

**Examples:**
```bash
# Sync a specific resource type
npm run sync-agents
npm run sync-instructions
npm run sync-skills

# Sync all resources at once
npm run sync-all

# Use the script directly with dry-run
node scripts/sync-repo.js agents --dry-run
node scripts/sync-repo.js all --dry-run
```

**Note**: Prompts are maintained locally and are not synced from upstream sources.

**Configuration:**

The sync script reads configuration from `upstream.config.json` which uses a simple, intuitive schema:

```json
{
  "repos": [
    {
      "name": "github/awesome-copilot",
      "branch": "main",
      "assets": {
        "agents": {
          "from": "agents",
          "to": "assets/agents"
        }
      }
    }
  ]
}
```

Where:
- `repos` - Array of upstream repositories to sync from
- `name` - Repository in format `owner/repo-name`
- `branch` - Git branch to sync from (defaults to "main")
- `assets` - Object mapping resource types to their sync configuration
- `from` - Path/glob pattern in the upstream repository
- `to` - Local destination path where files should be saved

See `upstream.config.json.example` for a complete configuration reference.

### Utils (`utils/`)
Shared utility modules used by other scripts.

- **env-loader.js** - Loads and parses environment variables from `.env` file
- **github-utils.js** - Common functions for GitHub API interactions (fetch, download, recursive file listing)
- **sync-base.js** - Base sync functionality for file-based syncing
- **sync-skills.js** - Specialized sync functionality for directory-based resources (like Claude Skills)
- **sync-utils.js** - Utility functions for working with local files during sync operations
- **config-loader.js** - Configuration loading and parsing utilities

## Code Reuse

The refactored scripts significantly reduce code duplication:

- **Before**: Five separate sync scripts with duplicated logic (~1000 lines total)
- **After**: Single generic sync script (~150 lines) + reusable utilities (~250 lines)

### Key Improvements:
1. **Single Generic Tool**: One script to sync all resource types
2. **Configuration-Driven**: Resource definitions in upstream.config.json instead of code
3. **DRY Principle**: Eliminated ~600 lines of duplicated code
4. **Maintainability**: Changes to sync logic only need to be made once
5. **Consistency**: All sync operations behave identically
6. **Extensibility**: Adding new resources requires only config changes

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
4. Follow the established patterns
5. Update this README with documentation for the new script

When adding new sync resources:

1. Add the resource to `upstream.config.json` under the appropriate repo's `assets` section:
   ```json
   {
     "repos": [
       {
         "name": "owner/repo-name",
         "branch": "main",
         "assets": {
           "new-resource": {
             "from": "path/in/repo",
             "to": "assets/new-resource"
           }
         }
       }
     ]
   }
   ```
2. Add an npm script to `package.json` (e.g., `"sync-new-resource": "node scripts/sync-repo.js new-resource"`)
3. No code changes needed - the script automatically handles the new resource!
