# Deploying v2.0.0 - Quick Guide

## Problem
The v2.0.0 tag has been created locally but the pipeline was skipping the release because no changes were detected in the repository.

## Solution Implemented
Added a "force" option to both release workflows that allows bypassing the change detection logic in emergency situations.

## How to Deploy v2.0.0 Now

### Option 1: Using Manual Publish Workflow (Recommended)

1. Navigate to GitHub Actions in the repository
2. Click on "Manual Publish" workflow
3. Click "Run workflow" button
4. **Check the box** for "Force release even if no changes detected (emergency use only)"
5. Click the green "Run workflow" button

This will:
- ✅ Publish version 2.0.0 to npm (using the version from package.json)
- ✅ Create and push the v2.0.0 git tag
- ✅ Include npm provenance for security
- ✅ Skip version increment (uses --no-increment flag)

### Option 2: Using Sync and Publish Workflow

1. Navigate to GitHub Actions in the repository
2. Click on "Sync and Publish" workflow
3. Click "Run workflow" button
4. **Check the box** for "Force release even if no changes detected (emergency use only)"
5. Click the green "Run workflow" button

This will:
- Skip the sync steps (no changes to sync)
- ✅ Publish version 2.0.0 to npm
- ✅ Create and push the v2.0.0 git tag

## What Changed

### Workflow Enhancements

1. **manual-publish.yml**
   - Added force input parameter
   - Force mode uses `--no-increment` to publish current version

2. **sync-and-publish.yml**
   - Added force input parameter
   - Force mode bypasses change detection
   - Skips commit step when force mode is active

3. **Documentation**
   - Created comprehensive release workflows guide
   - Added troubleshooting section
   - Documented emergency scenarios

## Verification

After running the workflow:

1. Check the workflow run completes successfully
2. Verify the tag exists: `git ls-remote --tags origin v2.0.0`
3. Verify npm package: `npm view workspace-architect@2.0.0`
4. Test installation: `npx workspace-architect@2.0.0 --version`

## Important Notes

⚠️ **Force Mode Usage**
- Only use force mode in emergency situations
- Force mode does NOT increment the version number
- It publishes whatever version is in package.json (currently 2.0.0)
- The version in package.json must be correct before using force mode

📝 **Current State**
- package.json shows version: 2.0.0 ✅
- CHANGELOG.md has 2.0.0 entry ✅
- v2.0.0 tag not yet on remote ⚠️
- npm package not published yet ⚠️

## Future Releases

For normal releases (not emergency deployments):
- Use the workflows WITHOUT the force option
- Make changes to the repository
- Let the conventional changelog determine the version bump
- The workflows will detect changes and create a proper release

## Documentation References

- [Full Release Workflows Documentation](docs/release-workflows.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
