# Release Workflows Documentation

This document describes the release and publishing workflows for the workspace-architect project.

## Available Workflows

### 1. Sync and Publish (Automated)

**File:** `.github/workflows/sync-and-publish.yml`

**Triggers:**
- Scheduled: Runs hourly via cron (`0 * * * *`)
- Manual: Can be triggered manually via GitHub Actions UI

**What it does:**
1. Syncs content from upstream sources (agents, instructions, prompts, collections, skills)
2. Validates the synced content
3. Checks for changes in the repository
4. If changes detected:
   - Commits the changes with message: "fix: sync content from upstream resources"
   - Creates a new release with incremented version
   - Publishes to npm with provenance

**Force Mode:**

When triggered manually, you can enable the "force" option to bypass change detection:

1. Go to Actions → Sync and Publish → Run workflow
2. Check the "Force release even if no changes detected" checkbox
3. Click "Run workflow"

When force mode is enabled:
- Skips the commit step (no actual changes to commit)
- Proceeds directly to release and publish
- Uses `--no-increment` flag to publish the current version without bumping
- Useful for emergency re-deployments of the current version

### 2. Manual Publish

**File:** `.github/workflows/manual-publish.yml`

**Triggers:**
- Manual only: Via GitHub Actions UI

**What it does:**
1. Installs dependencies
2. Creates a release and publishes to npm

**Force Mode:**

Similar to Sync and Publish, this workflow supports a force option:

1. Go to Actions → Manual Publish → Run workflow
2. Check the "Force release even if no changes detected" checkbox
3. Click "Run workflow"

When force mode is enabled:
- Uses `--no-increment` flag to publish the current version without bumping
- Useful when you need to re-publish the current version (e.g., v2.0.0) without creating a new version

### 3. Push Tag

**File:** `.github/workflows/push-tag.yml`

**Triggers:**
- Manual only: Via GitHub Actions UI

**What it does:**
- Pushes a specified git tag to the remote repository
- Does NOT trigger a release or publish

**Usage:**
1. Go to Actions → Push Tag → Run workflow
2. Enter the tag name (e.g., "v2.0.0")
3. Click "Run workflow"

## Emergency Deployment Scenarios

### Scenario 1: Re-deploy Current Version

**Situation:** The v2.0.0 tag exists but the package wasn't published or needs to be re-published.

**Solution:**
1. Go to Actions → Manual Publish → Run workflow
2. Enable "Force release even if no changes detected"
3. Click "Run workflow"

This will publish the current version (from package.json) to npm without incrementing.

### Scenario 2: Force Release After Sync

**Situation:** Content sync didn't detect changes but you need to create a release anyway.

**Solution:**
1. Go to Actions → Sync and Publish → Run workflow
2. Enable "Force release even if no changes detected"
3. Click "Run workflow"

This will skip syncing and go straight to publishing.

## Important Notes

⚠️ **Force Mode Warning**
- Force mode should only be used in emergency situations
- It bypasses normal change detection safeguards
- It does NOT increment the version number
- Ensure the version in `package.json` is correct before using force mode

📝 **Version Management**
- Normal releases use conventional commits to determine version bumps
- Force mode uses `--no-increment` to publish the current version
- Always verify `package.json` version before force-publishing

🔒 **Permissions Required**
- These workflows require `GITHUB_TOKEN` with write permissions
- npm publishing requires the package to be configured with proper access

## Release-it Configuration

The project uses `release-it` for version management, configured in `.release-it.json`:

```json
{
  "git": {
    "commitMessage": "chore: release v${version}",
    "tagName": "v${version}",
    "push": false,
    "requireUpstream": false
  },
  "npm": {
    "publish": true,
    "skipChecks": true
  },
  "github": {
    "release": false
  },
  "plugins": {
    "@release-it/conventional-changelog": {
      "preset": "conventionalcommits",
      "infile": "CHANGELOG.md"
    }
  }
}
```

## Troubleshooting

### Problem: Workflow skips release even with changes

**Check:**
1. Verify git status shows changes: `git status --porcelain`
2. Check the "Check for changes" step output in workflow logs

### Problem: Force mode not working

**Check:**
1. Ensure you checked the force checkbox in the workflow UI
2. Verify the workflow file has the latest changes with force support
3. Check workflow logs for "🚨 Force mode enabled" message

### Problem: Version already exists on npm

**Solution:**
1. Update version in `package.json` to a new version
2. Commit the change
3. Run the workflow (with or without force mode)

## Related Documentation

- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [package.json](../package.json) - Package configuration
