# Collection Format Migration Guide

## Overview

Collections have been migrated from a flat array format to a nested object format for better organization and maintainability.

## Format Changes

### Old Format (Deprecated)

```json
{
  "name": "My Collection",
  "description": "A collection for X development.",
  "items": [
    "instructions:reactjs",
    "prompts:code-review",
    "agents:expert-architect"
  ]
}
```

### New Format (Current)

```json
{
  "name": "My Collection",
  "description": "A collection for X development.",
  "items": {
    "instructions": ["reactjs"],
    "prompts": ["code-review"],
    "agents": ["expert-architect"]
  }
}
```

## Benefits of New Format

1. **Better Organization**: Items are logically grouped by type
2. **Easier to Read**: The structure is more intuitive and self-documenting
3. **Type Safety**: Easier to validate that all items of a type are present
4. **Extensibility**: Adding new asset types is cleaner

## Backward Compatibility

All tooling supports both formats:

- **CLI (`bin/cli.js`)**: Automatically detects and handles both formats
- **Manifest Generator (`scripts/generate-manifest.js`)**: Converts both formats to flat array in manifest for backward compatibility
- **Analyzer (`scripts/analyze-collections.js`)**: Processes both formats and outputs new format

## Migration

### Automatic Migration

Run the migration script to convert all collection files:

```bash
npm run migrate-collections
```

This will:
- Scan all JSON files in `assets/collections/`
- Detect collections using the old flat array format
- Convert them to the new nested object format
- Skip collections already in the new format
- Report success/error for each file

### Manual Migration

If you prefer to migrate manually:

1. Open the collection JSON file
2. Convert the `items` array to an object
3. Group items by their type prefix
4. Remove the type prefix from each item name

Example:
```javascript
// Before
"items": ["instructions:reactjs", "prompts:code-review"]

// After
"items": {
  "instructions": ["reactjs"],
  "prompts": ["code-review"]
}
```

## Implementation Details

### Helper Functions

Three key helper functions handle format conversion:

1. **`normalizeCollectionItems(items)`**: Converts both formats to flat array for processing
   - Used in: `bin/cli.js`, `scripts/generate-manifest.js`, `scripts/analyze-collections.js`
   
2. **`itemsToNestedFormat(items)`**: Converts flat array to nested object
   - Used in: `scripts/analyze-collections.js`, `scripts/migrate-collections-format.js`

3. **`isNestedFormat(items)`**: Detects if items are already in nested format
   - Used in: `scripts/migrate-collections-format.js`

### Manifest Format

The generated manifest (`assets-manifest.json`) continues to use the flat array format for backward compatibility with existing consumers:

```json
{
  "collections": {
    "my-collection": {
      "items": ["instructions:reactjs", "prompts:code-review"]
    }
  }
}
```

This ensures that:
- Existing tools continue to work
- The CLI can process collections from the manifest
- Future versions can transition gradually

## Testing

### Verify Migration

After migration, test that collections work correctly:

```bash
# List all collections
npm run test:local

# Download a specific collection (dry run)
node bin/cli.js download collections web-frontend-development --dry-run

# Generate manifest
npm run generate-manifest
```

### Analyze Collections

The analyze script works with both formats:

```bash
# Analyze all collections
npm run analyze

# Auto-add high-confidence matches (writes new format)
npm run analyze -- --add

# Remove low-confidence items (writes new format)
npm run analyze -- --remove
```

## For Maintainers

### Syncing Collections

When syncing collections from upstream:

```bash
npm run sync-collections
```

This downloads collections in whatever format they use upstream. After syncing:

1. Run the migration script to normalize format:
   ```bash
   npm run migrate-collections
   ```

2. Generate the manifest:
   ```bash
   npm run generate-manifest
   ```

3. Commit the changes

### Creating New Collections

Always use the new nested object format for new collections:

```json
{
  "name": "My New Collection",
  "description": "Description of the collection",
  "items": {
    "instructions": ["item1", "item2"],
    "prompts": ["item3"],
    "agents": ["item4"]
  }
}
```

## Troubleshooting

### Collection Not Loading

If a collection isn't loading:

1. Check the JSON syntax is valid
2. Verify the `items` field uses the nested format
3. Run the migration script: `npm run migrate-collections`
4. Regenerate manifest: `npm run generate-manifest`

### Items Not Found

If items in a collection aren't found:

1. Ensure asset names don't include the type prefix (e.g., use `"reactjs"` not `"instructions:reactjs"`)
2. Verify the asset files exist in the appropriate `assets/` subdirectories
3. Check that asset IDs match filenames (without extensions)

### Analyzer Issues

If the analyzer reports errors:

1. Ensure all collection files are in valid JSON format
2. Run migration: `npm run migrate-collections`
3. Regenerate manifest: `npm run generate-manifest`
4. Try the analyze command again

## Future Enhancements

Potential future improvements:

1. **Schema Validation**: Add JSON schema validation for collection files
2. **Type Inference**: Automatically detect asset types when adding items
3. **Merge Utility**: Tool to merge multiple collections
4. **Dependency Resolution**: Detect and handle inter-collection dependencies
5. **Version Tags**: Support versioning within collections
