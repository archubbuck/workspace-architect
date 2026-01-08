# Workspace Architect

[![npm version](https://img.shields.io/npm/v/workspace-architect.svg)](https://www.npmjs.com/package/workspace-architect)
[![npm downloads](https://img.shields.io/npm/dm/workspace-architect.svg)](https://www.npmjs.com/package/workspace-architect)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![GitHub stars](https://img.shields.io/github/stars/archubbuck/workspace-architect.svg)](https://github.com/archubbuck/workspace-architect/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/archubbuck/workspace-architect.svg)](https://github.com/archubbuck/workspace-architect/issues)

> A comprehensive library of specialized AI agents and personas for GitHub Copilot, ranging from architectural planning and specific tech stacks to advanced cognitive reasoning models.

Workspace Architect is a zero-friction CLI tool that provides curated collections of specialized agents, instructions, and prompts to supercharge your GitHub Copilot experience.

## Why Workspace Architect?

**Maximize GitHub Copilot's Potential** - GitHub Copilot is powerful, but it's even better with context. Workspace Architect provides 400+ expert-crafted agents, instructions, and prompts that give Copilot the specialized knowledge it needs for your specific tech stack and domain.

**Save Time, Start Faster** - Instead of crafting custom instructions from scratch, instantly download battle-tested configurations for React, Azure, DevOps, AI Engineering, and dozens of other domains. Get productive in seconds with `npx workspace-architect`.

**Stay Current** - Our collections are automatically synced from trusted upstream sources like GitHub's [awesome-copilot](https://github.com/github/awesome-copilot) and Anthropic's [skills repository](https://github.com/anthropics/skills), ensuring you always have access to the latest and greatest community contributions.

**Universal Compatibility** - Works with GitHub Copilot, Claude, and other AI assistants. Simple markdown files mean no vendor lock-in, no complex setup, and compatibility across your entire development workflow.

## Features

- 🎯 **Specialized Agents**: Pre-built personas like "Azure Architect", "React Expert", and more
- 📦 **Curated Collections**: Download complete suites for domains like Web Development, DevOps, or AI Engineering
- ⚡ **Zero Installation**: Use directly with `npx` - no global installation needed
- 🪶 **Lightweight**: Simple Markdown files, no heavy dependencies or complex servers
- 🔄 **Algorithmic Curation**: TF-IDF/Cosine Similarity engine ensures collections stay relevant
- 🌍 **Universal**: Works with any project structure

## Installation

No installation required! Use directly with `npx`:

```bash
npx workspace-architect list
# or use the shorter alias
npx wsa list
```

Or install globally if you prefer:

```bash
npm install -g workspace-architect
```

## Quick Start

List all available assets:

```bash
npx workspace-architect list
# or use the shorter alias
npx wsa list
```

Download a collection for web development:

```bash
npx workspace-architect download collections:web-frontend-development
# or
npx wsa download collections:web-frontend-development
```

Download a specific agent:

```bash
npx workspace-architect download agents:azure-architect
# or
npx wsa download agents:azure-architect
```

## Usage

### Listing Assets

View all available assets or filter by type:

```bash
# List all assets
npx workspace-architect list
# or
npx wsa list

# List specific types
npx workspace-architect list instructions
npx wsa list agents
npx wsa list prompts
npx wsa list collections
```

### Downloading Assets

Download assets to your project (default location: `.github/<type>/`):

```bash
npx workspace-architect download <type>:<name>
# or
npx wsa download <type>:<name>
```

**Examples:**

```bash
# Download an instruction
npx wsa download instructions:reactjs

# Download an agent
npx wsa download agents:planner

# Download a complete collection
npx wsa download collections:devops-essentials
```

### CLI Options

- `-d, --dry-run` - Preview what will be downloaded without writing files
- `-f, --force` - Overwrite existing files without confirmation
- `-o, --output <path>` - Specify custom output directory

## Asset Types

Workspace Architect provides five types of assets:

| Type | Description | Location |
|------|-------------|----------|
| **Instructions** | System-level guidelines for Copilot context | `.github/copilot-instructions.md` |
| **Prompts** | Reusable templates for specific tasks | `.github/prompts/` |
| **Agents** | Specialized personas defining Copilot behavior | `.github/agents/` |
| **Skills** | Claude Skills with templates, scripts, and resources | `.github/skills/` |
| **Collections** | Bundled assets for specific domains or workflows | Multiple locations |

### What are Skills?

**Skills** are an emerging standard for packaging AI agent capabilities. Compatible with Claude, GitHub Copilot, and other AI platforms, Skills are folder-based assets containing:

- **SKILL.md**: Main instructions with metadata
- **Templates**: Document or code templates
- **Scripts**: Automation scripts (downloaded but not executed)
- **Resources**: Reference materials and examples

Skills follow the [open Agent Skills specification](https://agentskills.io/) and work across multiple AI platforms.

**Example:**
```bash
# Download a Skill
npx workspace-architect download skills:example-planner

# List all Skills
npx workspace-architect list skills
```

For more information, see [Skills User Guide](docs/skills-guide.md) and [Skills vs Agents](docs/skills-vs-agents.md).

## Roadmap

See [ROADMAP.md](ROADMAP.md) for our development timeline, upcoming features, and current capabilities.

## Contributing

We welcome contributions! Whether you want to add a new agent, improve existing prompts, or curate a collection, here's how you can help.

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/archubbuck/workspace-architect.git
   cd workspace-architect
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Test your changes:
   ```bash
   node bin/cli.js list
   ```

### Adding New Assets

Create a markdown file in the appropriate directory with optional YAML frontmatter:

```markdown
---
title: My Custom Guide
description: A guide for setting up X.
---
# Content starts here...
```

**Naming Convention**: Filenames become IDs (extensions are stripped)
- `assets/instructions/my-guide.md` → `instructions:my-guide`
- `assets/agents/my-agent.agent.md` → `agents:my-agent`

### Creating Collections

Create a JSON file in `assets/collections/`:

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

### Useful Scripts

- `npm run generate-manifest` - Generate `assets-manifest.json` (required before PRs)
- `npm run analyze` - Analyze collections with TF-IDF/Cosine Similarity
  - `npm run analyze -- --add` - Auto-add high-confidence matches
  - `npm run analyze -- --remove` - Remove low-confidence items
- `npm run fetch-upstream` - Sync agents, instructions, prompts, and collections from upstream repository
- `npm run sync-skills` - Sync skills from anthropics/skills repository
- `npm run validate-skills` - Validate all synced skills

### Local Testing

Use Verdaccio for end-to-end testing:

```bash
# Terminal 1: Start local registry
npm run start:registry

# Terminal 2: Publish and test
npm run publish:local
npx --registry http://localhost:4873 workspace-architect list
npx --registry http://localhost:4873 wsa list
```

## Project Structure

```
workspace-architect/
├── assets/
│   ├── agents/          # Agent definitions (.agent.md)
│   ├── collections/     # Collection definitions (.json)
│   ├── instructions/    # Copilot instructions (.md)
│   └── prompts/         # Reusable prompts (.md)
├── bin/
│   └── cli.js          # CLI entry point
└── scripts/            # Maintenance utilities
```

## Migration Guide

Migrating from `.chatmode.md` to `.agent.md`? Run:

```bash
mkdir -p assets/agents
find . -name '*.chatmode.md' -exec bash -c 'mv "$1" "assets/agents/$(basename \"$1\" .chatmode.md).agent.md"' -- {} \;
```

## License

ISC

## Links

- [npm Package](https://www.npmjs.com/package/workspace-architect)
- [GitHub Repository](https://github.com/archubbuck/workspace-architect)
- [Issue Tracker](https://github.com/archubbuck/workspace-architect/issues)
- [Roadmap](ROADMAP.md)
