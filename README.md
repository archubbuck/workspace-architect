# Workspace Architect

A comprehensive library of specialized AI agents and personas for GitHub Copilot, ranging from architectural planning and specific tech stacks to advanced cognitive reasoning models.

## Overview

Workspace Architect is a CLI tool and library designed to enhance your experience with GitHub Copilot. It provides a curated collection of:

*   **Instructions**: Detailed guidelines to set the context for Copilot.
*   **Prompts**: Reusable prompts for specific tasks like code review or refactoring.
*   **Agents**: Specialized personas (e.g., "Azure Architect", "React Expert") to guide the conversation.
*   **Collections**: Grouped assets for specific domains (e.g., "Web Development", "DevOps").

## Why Workspace Architect?

*   **Curated Collections**: Don't waste time hunting for individual prompts. Download a complete "Web Development" or "DevOps" suite in one command.
*   **Zero Friction**: No installation required. Just run `npx workspace-architect` in any folder.
*   **Universal Portability**: Works with any project structure. Assets are simple Markdown files that live in your repo.
*   **Lightweight**: No complex MCP servers or heavy dependencies. Just pure context for Copilot.
*   **Algorithmic Curation**: Our collections are continuously monitored by an intelligent TF-IDF/Cosine Similarity engine to ensure they always include the most relevant assets and exclude outdated ones with zero regression.

## For Consumers

### Usage

You can use this tool directly with `npx` without installing it globally:

```bash
npx workspace-architect list
```

### Asset Types

*   **Instructions (`instructions`)**: These are system-level instructions or "custom instructions" you can add to your `.github/copilot-instructions.md` or use to prime a session.
*   **Prompts (`prompts`)**: Specific queries or templates to ask Copilot to perform a task.
*   **Agents (`agents`)**: Specialized agent definitions (`.agent.md` files) that define how Copilot should behave, reason, and respond. These are stored in `assets/agents/` in this repository and downloaded to `.github/agents/` in your project by default.
*   **Collections (`collections`)**: Bundles of the above assets tailored for specific roles or workflows.

### CLI Reference

#### List Available Assets

View all available assets or filter by type:

```bash
# List all assets
npx workspace-architect list

# List only instructions
npx workspace-architect list instructions

# List only collections
npx workspace-architect list collections
```

#### Download an Asset

Download a specific asset to your project. By default, assets are downloaded to `.github/<type>/`.

```bash
npx workspace-architect download <type>:<name>
```

**Examples:**

```bash
# Download a specific instruction file
npx workspace-architect download instructions:reactjs

# Download a collection of assets
npx workspace-architect download collections:web-frontend-development
```

**Options:**

*   `-d, --dry-run`: Simulate the download without writing files. Useful to see where files will be placed.
*   `-f, --force`: Overwrite existing files without asking for confirmation.
*   `-o, --output <path>`: Specify a custom output directory.

## For Contributors

We welcome contributions! Whether you want to add a new persona, improve existing prompts, or curate a collection, here is how you can help.

### Project Structure

*   `assets/agents/`: Contains agent definitions (`.agent.md` files) - specialized personas.
*   `assets/`: Contains the source markdown and JSON files for other assets.
    *   `collections/`: JSON files defining groups of assets.
    *   `instructions/`: Contextual guidelines.
    *   `prompts/`: Reusable prompt templates.
*   `bin/`: Contains the CLI entry point (`cli.js`).
*   `scripts/`: Utility scripts for maintenance and analysis.

### Development Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/archubbuck/workspace-architect.git
    cd workspace-architect
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the CLI locally**:
    You can test your changes by running the CLI script directly:
    ```bash
    node bin/cli.js list
    ```

4.  **Test with Local Registry (Verdaccio)**:
    For a more accurate simulation of the end-user experience, we use Verdaccio as a local npm registry.

    *   **Start the registry**:
        ```bash
        npm run start:registry
        ```
    *   **Publish to local registry**:
        In a new terminal:
        ```bash
        npm run publish:local
        ```
    *   **Run with `npx`**:
        ```bash
        npx --registry http://localhost:4873 workspace-architect list
        ```

5.  **Quick Local Link (Alternative)**:
    For rapid iteration without publishing, you can link the package:
    ```bash
    npm link
    npx workspace-architect list
    ```

### Adding New Assets

1.  Create a new markdown file in the appropriate folder (`assets/agents/`, `assets/instructions`, or `assets/prompts`).
2.  **Naming Convention**: The filename becomes the ID.
    *   Example: `assets/instructions/my-guide.md` becomes `instructions:my-guide`.
    *   Example: `assets/agents/my-agent.agent.md` becomes `agents:my-agent`.
    *   Extensions like `.agent.md`, `.instructions.md`, or `.prompt.md` are stripped from the ID but help with organization.
3.  **Metadata**: You can optionally add YAML frontmatter to your markdown files to provide a description and title.

    ```markdown
    ---
    title: My Custom Guide
    description: A guide for setting up X.
    ---
    # Content starts here...
    ```

### Creating Collections

Collections are JSON files located in `assets/collections/`. They group multiple assets together.

**Format:**

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

### Scripts

*   **`npm run generate-manifest`**: Generates `assets-manifest.json`. This file is used by the CLI in production to know what assets are available without scanning the file system. **Run this before submitting a PR.**
*   **`npm run analyze`**: Runs `scripts/analyze-collections.js`. This is an intelligent analysis tool that uses TF-IDF and Cosine Similarity to continuously monitor and regenerate collection profiles. It ensures collections always point to the most relevant assets with zero regression.
    *   Use `npm run analyze -- --add` to automatically add high-confidence matches.
    *   Use `npm run analyze -- --remove` to remove low-confidence items.
*   **`npm run fetch-upstream`**: Syncs assets from the upstream `github/awesome-copilot` repository (requires configuration).

### Migration from `.chatmode.md` to `.agent.md`

This project has migrated from the legacy `.chatmode.md` extension to the new `.agent.md` convention, with agents now stored in `assets/agents/`.

**For existing users:**

If you have existing `.chatmode.md` files in your projects, you can migrate them using this command:

```bash
mkdir -p assets/agents
find . -name '*.chatmode.md' -exec bash -c 'mv "$1" "assets/agents/$(basename \"$1\" .chatmode.md).agent.md"' -- {} \;
```

**Note:** VS Code continues to recognize `.chatmode.md` files for backward compatibility, but `.agent.md` in `.github/agents/` is now the preferred convention for GitHub Copilot. This repository stores agents in `assets/agents/` for distribution, and the CLI downloads them to `.github/agents/` in your project by default.
