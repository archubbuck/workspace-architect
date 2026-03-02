# Upstream Configuration for Workspace Architect

This document explains how to use the JSON configuration file to control upstream repository synchronization and glob patterns.

## Overview

The `upstream.config.json` file allows you to specify which GitHub repositories should be treated as upstream resources and control which files are synced using glob patterns on a per-repository basis.

## Configuration File

Create an `upstream.config.json` file in the project root directory. **This file is required** - sync scripts will fail if the file doesn't exist or doesn't contain configuration for the repository being synced.

### Schema

```json
{
  "repos": [
    {
      "name": "owner/repository-name",
      "branch": "main",
      "assets": {
        "resourceType": {
          "from": "source-path",
          "to": "local-path"
        }
      }
    }
  ]
}
```

### Fields

- **`repos`** (array): List of upstream repository configurations
  - **`name`** (string): Repository identifier in format `owner/repository-name`
  - **`branch`** (string): Git branch to sync from (typically "main")
  - **`assets`** (object): Map of resource types to sync configurations
    - **`resourceType`** (object): Configuration for a specific asset type (e.g., "agents", "instructions", "skills")
      - **`from`** (string): Source directory path in the upstream repository
      - **`to`** (string): Target directory path in this repository

## Glob Patterns

**Note**: Glob patterns are used internally by the sync scripts to match files within each resource type directory. The patterns are defined within the sync script logic based on the resource type (e.g., agents sync uses `agents/**/*.md`).

Standard glob syntax is supported via the [minimatch](https://github.com/isaacs/minimatch) library:

- `*` - Matches any characters except `/` (within a path segment)
- `**` - Matches any characters including `/` (across path segments)
- `?` - Matches a single character
- `[abc]` - Matches any character in the set
- `{a,b}` - Matches either `a` or `b`

### Pattern Examples

- `src/**` - All files under the `src` directory
- `*.md` - All markdown files in the root directory
- `docs/**/*.md` - All markdown files anywhere under `docs`
- `config/*.json` - All JSON files directly in the `config` directory
- `{src,lib}/**/*.js` - All JavaScript files under `src` or `lib`
- `agents/**/*.agent.md` - All agent markdown files under `agents`

## Example Configurations

### Example 1: Current Configuration

The actual configuration used by workspace-architect:

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
        },
        "instructions": {
          "from": "instructions",
          "to": "assets/instructions"
        }
      }
    },
    {
      "name": "anthropics/skills",
      "branch": "main",
      "assets": {
        "skills": {
          "from": "skills",
          "to": "assets/skills"
        }
      }
    }
  ]
}
```

### Example 2: Multiple Asset Types

Sync multiple asset types from a single repository:

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
        },
        "instructions": {
          "from": "instructions",
          "to": "assets/instructions"
        },
        "skills": {
          "from": "skills",
          "to": "assets/skills"
        }
      }
    }
  ]
}
```

## Usage

### With Sync Scripts

The sync scripts require `upstream.config.json` in the project root:

```bash
npm run sync-agents
npm run sync-instructions
```

**Note**: As of the latest version, prompts are maintained locally in this repository and are not synced from upstream sources.

The config file must exist and contain configuration for the repository being synced. If the config file is missing or doesn't contain the repository configuration, the sync script will fail with an error.

### Behavior

1. **Config File Exists with Matching Repo**: Sync scripts load the config and sync the specified asset types
2. **Config File Missing**: Scripts fail with an error message indicating the config file is required
3. **No Matching Asset**: Scripts fail with an error indicating no configuration was found for the resource type

### File Deletion

When using sync patterns, the sync process will:
- Download files matching the patterns
- Delete local files that don't match the patterns (if they were previously synced)
- Only delete files tracked in the `.upstream-sync.json` metadata file

This ensures that manually created local files are never accidentally deleted.

## Testing Your Configuration

To test your configuration:

1. Create or modify `upstream.config.json` with your desired asset types
2. Run the relevant sync script (e.g., `npm run sync-agents`)
3. Check the output to see which files were synced
4. Review the local directory to confirm the results

The sync output will show:
- Which config file was loaded
- Which repository and asset type is being synced
- Which files were downloaded
- Which files were deleted

## Backward Compatibility

The configuration file is completely optional. All existing sync scripts continue to work without it, maintaining full backward compatibility with existing workflows.

## Best Practices

1. **Match Upstream Structure**: Ensure `from` paths match the actual directory structure in upstream repositories
2. **Test First**: Test sync scripts with a single asset type before syncing all
3. **Version Control**: Commit `upstream.config.json` to share configuration with your team
4. **Validate Structure**: Ensure the JSON structure matches the schema exactly

## Troubleshooting

### Config File Not Found

If you see an error like `Upstream config file not found`, create an `upstream.config.json` file in the project root with the appropriate repository and asset configuration.

### Resource Type Not Configured

If you see an error like `Unknown resource type: <type>`, add the resource type to your `upstream.config.json` file under the appropriate repository's `assets` object.

### No Files Synced

- Check that the `from` path matches the actual directory path in the upstream repository
- Verify that the upstream repository contains files in the specified directory
- Check that files have the expected extensions for that resource type

### Unexpected Deletions

- Files are only deleted if they were previously synced (tracked in `.upstream-sync.json`)
- Manual local files are never deleted
- Review the asset configuration to ensure it matches your intended sync setup

## Advanced Usage

### Multiple Repositories

Configure different asset types from different repositories:

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
        },
        "instructions": {
          "from": "instructions",
          "to": "assets/instructions"
        }
      }
    },
    {
      "name": "anthropics/skills",
      "branch": "main",
      "assets": {
        "skills": {
          "from": "skills",
          "to": "assets/skills"
        }
      }
    }
  ]
}
```

### Asset Type Extensions

Each asset type has specific accepted file extensions:
- **agents**: `.agent.md`, `.md`
- **instructions**: `.instructions.md`, `.md`
- **skills**: Directory-based sync with `SKILL.md` and `.py` files

## Related Files

- `upstream.config.json.example` - Example configuration template
- `scripts/utils/config-loader.js` - Configuration loading utility
- `scripts/utils/sync-base.js` - Core sync logic with pattern support
- `scripts/utils/github-utils.js` - GitHub API utilities with glob matching
