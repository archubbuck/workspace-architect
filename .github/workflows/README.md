# GitHub Workflows

This directory contains the CI/CD workflows for the Workspace Architect project.

## Workflows

### sync-and-publish.yml

Automatically syncs content from upstream repositories and publishes to npm when changes are detected.

**Triggers:**
- Scheduled: Runs every hour via cron
- Manual: Can be triggered via workflow_dispatch

**Manual Trigger Options:**
- `dry_run` (boolean, default: false): When enabled, simulates all sync and release actions without making any actual changes. Useful for:
  - Testing configuration changes
  - Validating sync behavior
  - Previewing what would be synced/released
- `force` (boolean, default: false): Forces a release even if no changes are detected (emergency use only)

**Workflow Steps:**
1. Sync agents, instructions, prompts, collections, and skills from upstream
2. Validate synced skills
3. Check for changes (skipped in dry-run mode)
4. Commit changes (skipped in dry-run mode)
5. Release and publish to npm (skipped in dry-run mode)

**Dry-Run Behavior:**
- All sync commands run with `--dry-run` flag
- No files are downloaded or modified
- No commits are made
- No releases are published
- All actions are logged as simulations

### manual-publish.yml

Manually trigger a release and publish to npm.

**Triggers:**
- Manual: workflow_dispatch only

**Manual Trigger Options:**
- `dry_run` (boolean, default: false): When enabled, simulates the release process without:
  - Bumping the version
  - Tagging the release
  - Publishing to npm
  - Pushing changes to GitHub
- `force` (boolean, default: false): Forces a release with `--no-increment` flag (emergency use only)

**Workflow Steps:**
1. Configure Git
2. Release and publish (or simulate in dry-run mode)

**Dry-Run Behavior:**
- Runs `release-it` with `--dry-run` flag
- Shows what would be released
- Previews changelog generation
- Does not make any actual changes

### push-tag.yml

Automatically triggers when a version tag is pushed to the repository.

**Triggers:**
- Push: When tags matching `v*` are pushed

## Using Dry-Run Mode

Dry-run mode is available in both `sync-and-publish.yml` and `manual-publish.yml` workflows.

### To test sync and publish workflow:

1. Go to Actions tab in GitHub
2. Select "Sync and Publish" workflow
3. Click "Run workflow"
4. Check the "Dry-run mode" checkbox
5. Click "Run workflow"

This will show you exactly what would be synced and released without making any changes.

### To test manual publish workflow:

1. Go to Actions tab in GitHub
2. Select "Manual Publish" workflow
3. Click "Run workflow"
4. Check the "Dry-run mode" checkbox
5. Click "Run workflow"

This will simulate the release process and show what would be published.

## Best Practices

- ✅ **Always use dry-run first** when testing configuration changes
- ✅ **Review dry-run logs** before running the actual workflow
- ✅ **Use dry-run to understand impact** of upstream changes
- ⚠️ **Use force mode sparingly** - it's for emergency use only
- ❌ **Don't commit manually** - let the workflow handle commits
