# Deployment Instructions for v2.0.0

## Overview
This document outlines the steps to complete the v2.0.0 deployment of workspace-architect.

## What's Been Completed ✅

1. **Version Bump**: Package version updated from 1.8.0 → 2.0.0
2. **Changelog**: CHANGELOG.md updated with v2.0.0 release notes and breaking change information
3. **Git Commit**: Release commit created and pushed to the `copilot/deploy-v200-release` branch
4. **Git Tag**: v2.0.0 tag created locally (needs to be pushed)
5. **Breaking Change Documentation**: `.breaking-change-v2` file documents the CLI format change
6. **Testing**: CLI tested with both new (space-separated) and legacy (colon-separated) formats

## What Needs to Be Done ⚠️

### Option 1: Using GitHub UI (Recommended)

1. **Push the Tag**:
   - Go to: https://github.com/archubbuck/workspace-architect/actions/workflows/push-tag.yml
   - Click "Run workflow"
   - Select branch: `copilot/deploy-v200-release`
   - Enter tag: `v2.0.0`
   - Click "Run workflow"

2. **Create GitHub Release**:
   - Go to: https://github.com/archubbuck/workspace-architect/releases/new
   - Select tag: `v2.0.0`
   - Release title: `v2.0.0`
   - Copy release notes from `.breaking-change-v2` or use auto-generated notes
   - Check "This is a pre-release" if needed for testing
   - Click "Publish release"

3. **Publish to npm** (when ready):
   - Go to: https://github.com/archubbuck/workspace-architect/actions/workflows/manual-publish.yml
   - Click "Run workflow"
   - Select branch: `copilot/deploy-v200-release`
   - Click "Run workflow"
   - **Note**: Ensure you have `NPM_TOKEN` configured in repository secrets

### Option 2: Using Command Line

If you have push access to the repository:

```bash
# 1. Checkout the branch
git checkout copilot/deploy-v200-release
git pull origin copilot/deploy-v200-release

# 2. Push the tag
git push origin v2.0.0

# 3. Create GitHub Release (requires gh CLI)
gh release create v2.0.0 \
  --title "v2.0.0" \
  --notes-file .breaking-change-v2

# 4. Publish to npm (requires npm login)
npm publish --access public --provenance
```

## Breaking Changes in v2.0.0

The CLI command pattern has changed from colon-separated to space-separated format:

**Old format (deprecated but still supported):**
```bash
npx workspace-architect download agents:azure-architect
npx wsa download instructions:reactjs
```

**New format (recommended):**
```bash
npx workspace-architect download agents azure-architect
npx wsa download instructions reactjs
```

The old format still works but displays a deprecation warning.

## Verification Steps

After deployment, verify the release:

1. **Check npm package**:
   ```bash
   npm view workspace-architect version
   # Should show: 2.0.0
   ```

2. **Test installation**:
   ```bash
   npx workspace-architect@2.0.0 --version
   npx workspace-architect@2.0.0 list
   ```

3. **Test both CLI formats**:
   ```bash
   # New format
   npx workspace-architect@2.0.0 download agents azure-architect --dry-run
   
   # Legacy format (should show deprecation warning)
   npx workspace-architect@2.0.0 download agents:azure-architect --dry-run
   ```

4. **Verify GitHub Release**:
   - Visit: https://github.com/archubbuck/workspace-architect/releases/tag/v2.0.0
   - Confirm release notes are correct
   - Confirm tag is properly linked

## Rollback Plan

If issues are discovered after deployment:

1. **Unpublish from npm** (within 72 hours):
   ```bash
   npm unpublish workspace-architect@2.0.0
   ```

2. **Delete GitHub Release and Tag**:
   ```bash
   gh release delete v2.0.0 --yes
   git push origin :refs/tags/v2.0.0
   ```

3. **Revert version changes**:
   ```bash
   git revert <release-commit-hash>
   git push
   ```

## Support

For issues or questions:
- Open an issue: https://github.com/archubbuck/workspace-architect/issues
- Contact: adam.chubbuck@gmail.com
