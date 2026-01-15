# Upstream Configuration for Workspace Architect

This document explains how to use the JSON configuration file to control upstream repository synchronization and glob patterns.

## Overview

The `upstream.config.json` file allows you to specify which GitHub repositories should be treated as upstream resources and control which files are synced using glob patterns on a per-repository basis.

## Configuration File

Create an `upstream.config.json` file in the project root directory. If the file doesn't exist, the sync scripts will fall back to their default behavior (syncing all files).

### Schema

```json
{
  "upstreamRepos": [
    {
      "repo": "owner/repository-name",
      "syncPatterns": ["pattern1", "pattern2", "..."]
    }
  ]
}
```

### Fields

- **`upstreamRepos`** (array): List of upstream repository configurations
  - **`repo`** (string): Repository identifier in format `owner/repository-name`
  - **`syncPatterns`** (array of strings): Glob patterns to match files for synchronization

## Glob Patterns

Glob patterns follow standard glob syntax supported by the [minimatch](https://github.com/isaacs/minimatch) library:

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

### Example 1: Basic Configuration

Sync only specific file types from each repository:

```json
{
  "upstreamRepos": [
    {
      "repo": "github/awesome-copilot",
      "syncPatterns": ["agents/**/*.md", "collections/**/*.yml"]
    },
    {
      "repo": "anthropics/skills",
      "syncPatterns": ["skills/**/SKILL.md", "skills/**/*.py"]
    }
  ]
}
```

### Example 2: Selective Sync

Sync only Azure and MCP-related collections:

```json
{
  "upstreamRepos": [
    {
      "repo": "github/awesome-copilot",
      "syncPatterns": [
        "collections/azure-*.yml",
        "collections/*mcp*.yml"
      ]
    }
  ]
}
```

### Example 3: Documentation Only

Sync only documentation files:

```json
{
  "upstreamRepos": [
    {
      "repo": "github/awesome-copilot",
      "syncPatterns": ["**/*.md", "**/README*"]
    }
  ]
}
```

## Usage

### With Sync Scripts

The sync scripts automatically check for `upstream.config.json` in the project root:

```bash
npm run sync-collections
npm run sync-agents
npm run sync-instructions
npm run sync-prompts
```

If the config file exists and contains configuration for the repository being synced, the patterns will be applied. Otherwise, the default behavior is used.

### Behavior

1. **Config File Exists**: Sync scripts load the config and apply patterns if a matching repository is found
2. **No Config File**: Scripts use default behavior (sync all files matching accepted extensions)
3. **No Matching Repo**: Scripts use default behavior for that specific repository

### File Deletion

When using sync patterns, the sync process will:
- Download files matching the patterns
- Delete local files that don't match the patterns (if they were previously synced)
- Only delete files tracked in the `.upstream-sync.json` metadata file

This ensures that manually created local files are never accidentally deleted.

## Testing Your Configuration

To test your configuration:

1. Create `upstream.config.json` with your desired patterns
2. Run the relevant sync script (e.g., `npm run sync-collections`)
3. Check the output to see which files were synced
4. Review the local directory to confirm the results

The sync output will show:
- Which config file was loaded
- Which patterns are being used
- Which files were downloaded
- Which files were deleted

## Backward Compatibility

The configuration file is completely optional. All existing sync scripts continue to work without it, maintaining full backward compatibility with existing workflows.

## Best Practices

1. **Start Broad**: Begin with inclusive patterns and narrow them down as needed
2. **Test First**: Test patterns with a single sync script before applying broadly
3. **Version Control**: Commit `upstream.config.json` to share patterns with your team
4. **Use Comments**: While JSON doesn't support comments, use the example file for documentation
5. **Validate Patterns**: Use minimatch documentation to validate complex patterns

## Troubleshooting

### No Files Synced

- Check that patterns match the actual file paths in the upstream repository
- Patterns are relative to the `remoteDir` specified in the sync script
- Use `**` for recursive matching across directories

### Unexpected Deletions

- Files are only deleted if they were previously synced (tracked in `.upstream-sync.json`)
- Manual local files are never deleted
- Review patterns to ensure they match your intended files

### Pattern Not Working

- Test patterns using the [minimatch tester](https://github.com/isaacs/minimatch)
- Ensure forward slashes (`/`) are used, even on Windows
- Remember that patterns are case-sensitive by default

## Advanced Usage

### Multiple Repositories

Configure different patterns for different repositories:

```json
{
  "upstreamRepos": [
    {
      "repo": "github/awesome-copilot",
      "syncPatterns": ["agents/**/*.md"]
    },
    {
      "repo": "anthropics/skills",
      "syncPatterns": ["skills/**/SKILL.md"]
    },
    {
      "repo": "openai/examples",
      "syncPatterns": ["**/*.py", "**/*.md"]
    }
  ]
}
```

### Combining with Extension Filters

Sync patterns work in combination with the `acceptedExtensions` defined in each sync script. Both conditions must be met:

1. File must match an accepted extension (e.g., `.md`, `.yml`)
2. File path must match a sync pattern (if configured)

This allows for flexible filtering at both the extension and path level.

## Related Files

- `upstream.config.json.example` - Example configuration template
- `scripts/utils/config-loader.js` - Configuration loading utility
- `scripts/utils/sync-base.js` - Core sync logic with pattern support
- `scripts/utils/github-utils.js` - GitHub API utilities with glob matching
