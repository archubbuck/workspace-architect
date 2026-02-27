# Contributing to Workspace Architect

Thank you for your interest in contributing to Workspace Architect! We welcome contributions from the community to help make this project better.

## How You Can Contribute

There are many ways to contribute to Workspace Architect:

- 🐛 **Report Bugs**: Found a bug? [Open an issue](https://github.com/archubbuck/workspace-architect/issues/new)
- 💡 **Suggest Features**: Have an idea? [Start a discussion](https://github.com/archubbuck/workspace-architect/discussions)
- 📝 **Improve Documentation**: Help us improve our docs, README, or guides
- 🎯 **Add Agents**: Create new specialized AI agents or personas
- 📦 **Create Collections**: Curate collections for specific domains or workflows
- 💻 **Code Contributions**: Fix bugs, add features, or improve the CLI tool
- ⭐ **Star the Project**: Show your support by starring the repository

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm 7+
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/workspace-architect.git
   cd workspace-architect
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Test Your Setup**
   ```bash
   node bin/cli.js list
   node bin/cli.js download instructions a11y --dry-run
   ```

4. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

## Contributing Assets

### Adding a New Agent

Agents are specialized AI personas that define GitHub Copilot's behavior for specific tasks.

1. Create a new file in `assets/agents/` with the `.agent.md` extension:
   ```bash
   touch assets/agents/my-agent.agent.md
   ```

2. Add frontmatter and content:
   ```markdown
   ---
   title: My Expert Agent
   description: An expert in XYZ technology
   ---
   
   # System Instructions
   
   You are an expert in XYZ technology...
   
   ## Guidelines
   
   - Follow best practices for...
   - Use patterns like...
   ```

3. Generate the manifest:
   ```bash
   npm run generate-manifest
   ```

4. Test your agent:
   ```bash
   node bin/cli.js list agents
   node bin/cli.js download agents my-agent --dry-run
   ```

### Adding a New Instruction

Instructions are system-level guidelines for GitHub Copilot context.

1. Create a file in `assets/instructions/`:
   ```bash
   touch assets/instructions/my-guide.md
   ```

2. Add frontmatter and content:
   ```markdown
   ---
   title: My Development Guide
   description: Guidelines for XYZ development
   ---
   
   # Project Guidelines
   
   When working on this project...
   ```

### Adding a New Prompt

Prompts are reusable templates for specific tasks.

1. Create a file in `assets/prompts/`:
   ```bash
   touch assets/prompts/my-prompt.prompt.md
   ```

2. Add content with clear instructions for the task.

### Creating a Collection

Collections bundle related assets for specific domains or workflows.

1. Create a JSON file in `assets/collections/`:
   ```bash
   touch assets/collections/my-collection.json
   ```

2. Define the collection:
   ```json
   {
     "name": "My Collection",
     "description": "A collection for XYZ development",
     "items": {
       "instructions": ["my-guide"],
       "agents": ["my-agent"],
       "prompts": ["my-prompt"]
     }
   }
   ```

3. Analyze and optimize your collection:
   ```bash
   npm run analyze
   ```

### Adding a Skill

Skills are folder-based assets compatible with Claude and other AI platforms.

1. Create a directory in `assets/skills/`:
   ```bash
   mkdir -p assets/skills/my-skill
   ```

2. Create a `SKILL.md` file:
   ```markdown
   ---
   name: My Skill
   description: A skill for XYZ
   version: 1.0.0
   ---
   
   # Instructions
   
   This skill helps with...
   ```

3. Optionally add templates, scripts, or resources:
   ```bash
   mkdir -p assets/skills/my-skill/templates
   mkdir -p assets/skills/my-skill/scripts
   mkdir -p assets/skills/my-skill/resources
   ```

## Code Contributions

### Coding Standards

- Use ES6+ JavaScript modules
- Follow existing code style and conventions
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable and function names

### Testing Your Changes

Before submitting a PR, you must run and pass all tests and linting checks. Our CI/CD pipeline will automatically run these checks, and PRs cannot be merged if they fail.

#### Running Tests

We use [Vitest](https://vitest.dev/) for testing. Tests are located in the `tests/` directory.

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

**Test Coverage Requirements:**
- All tests must pass before merging
- Code coverage reports are generated for all PRs
- Write tests for new features and bug fixes
- Integration tests validate CLI behavior end-to-end
- Unit tests validate helper functions and logic

**Test Structure:**
- `tests/cli.test.js` - Integration tests for CLI commands
- `tests/helpers.test.js` - Unit tests for helper functions
- `tests/unit.test.js` - Additional unit tests for utilities

#### Running Linting

We use [ESLint](https://eslint.org/) to maintain code quality.

```bash
# Run linter
npm run lint

# Automatically fix linting issues
npm run lint:fix
```

**Linting Rules:**
- All code must pass ESLint checks before merging
- Follow the configured ESLint rules in `eslint.config.js`
- Fix any linting errors before submitting your PR

#### Local Testing

1. **Test CLI commands locally:**
   ```bash
   node bin/cli.js list
   node bin/cli.js download <type> <name> --dry-run
   ```

2. **Generate manifest (required if you add/modify assets):**
   ```bash
   npm run generate-manifest
   ```

3. **Test with local registry (optional):**
   ```bash
   # Terminal 1
   npm run start:registry
   
   # Terminal 2
   npm run publish:local
   npx --registry http://localhost:4873 workspace-architect list
   ```

### CI/CD Pipeline

All pull requests must pass our CI/CD checks before merging:

- ✅ **Tests**: All tests must pass on Node.js 18.x, 20.x, and 22.x
- ✅ **Linting**: Code must pass ESLint checks
- ✅ **Coverage**: Coverage reports are generated (though not strictly enforced)

The CI workflow runs automatically on every push to a PR. Check the "Actions" tab in GitHub to see the status of your checks.

### Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear commit history:

- `feat:` - New feature (triggers minor version bump)
- `fix:` - Bug fix (triggers patch version bump)
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```bash
feat: add TypeScript expert agent
fix: correct manifest generation for skills
docs: improve installation instructions in README
```

## Submitting a Pull Request

1. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a PR on GitHub:**
   - Provide a clear title following conventional commits
   - Describe what changes you made and why
   - Reference any related issues (e.g., "Closes #123")
   - Add screenshots if applicable

3. **Respond to feedback:**
   - Be open to suggestions and changes
   - Make requested updates promptly
   - Keep discussions professional and constructive

## Asset Quality Guidelines

When contributing agents, instructions, or prompts:

### ✅ Good Practices

- **Clear and Specific**: Make instructions precise and unambiguous
- **Well-Structured**: Use headings, lists, and formatting for readability
- **Focused**: Each asset should have a clear, single purpose
- **Tested**: Test your assets with GitHub Copilot before submitting
- **Documented**: Include good descriptions in frontmatter
- **Example-Rich**: Provide examples where helpful

### ❌ Avoid

- Vague or generic instructions
- Overly complex or lengthy content (break into multiple assets)
- Duplicate content (check existing assets first)
- Language or framework-specific instructions in general assets
- Outdated practices or deprecated technologies

## Collection Curation

We use TF-IDF and Cosine Similarity algorithms to ensure collections stay relevant:

```bash
# Analyze collections and get suggestions
npm run analyze

# Auto-add high-confidence matches
npm run analyze -- --add

# Remove low-confidence items
npm run analyze -- --remove
```

### Collection Quality Criteria

- **Coherent Theme**: All items should relate to the collection's purpose
- **Right Size**: 5-20 items is usually optimal
- **No Redundancy**: Avoid overlapping or duplicate assets
- **Value-Added**: Collection should provide more value than individual assets

## Upstream Synchronization

We sync content from upstream repositories to keep our assets current:

```bash
# Sync from github/awesome-copilot (run individual scripts as needed)
npm run sync-agents          # Sync agents
npm run sync-instructions    # Sync instructions
npm run sync-prompts         # Sync prompts

# Sync skills from anthropics/skills
npm run sync-skills

# Validate synced skills
npm run validate-skills
```

**Note**: Don't manually add content that should come from upstream. Instead, contribute to the source repositories and let the sync process handle it.

### Dry-Run Mode

All sync scripts support a `--dry-run` flag to simulate actions without making any changes. This is useful for:
- Validating what would be synced before running an actual sync
- Understanding the impact of configuration changes
- Troubleshooting sync issues

```bash
# Preview what would be synced without making changes
npm run sync-agents -- --dry-run
npm run sync-instructions -- --dry-run
npm run sync-prompts -- --dry-run
npm run sync-skills -- --dry-run
```

The dry-run mode will:
- ✅ Fetch remote file listings from GitHub
- ✅ Compare remote and local files to detect changes
- ✅ Show which files would be created (new files)
- ✅ Show which files would be updated (changed content)
- ✅ Show which files would be deleted (removed from upstream)
- ✅ Report "No changes needed" if everything is up to date
- ✅ Log all simulated actions
- ❌ Not download or write any files
- ❌ Not delete any local files
- ❌ Not update sync metadata

### Release Dry-Run

The release process also supports dry-run mode:

```bash
# Preview what would happen during a release
npm run release -- --dry-run
```

This is useful for:
- Verifying version bumps and changelog generation
- Understanding what would be published to npm
- Testing release configurations

## Getting Help

- 💬 [GitHub Discussions](https://github.com/archubbuck/workspace-architect/discussions) - Ask questions, share ideas
- 🐛 [Issue Tracker](https://github.com/archubbuck/workspace-architect/issues) - Report bugs or request features
- 📧 Contact the maintainer: adam.chubbuck@gmail.com

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to adam.chubbuck@gmail.com.

## Recognition

Contributors are recognized in:
- GitHub's contributor graph
- Release notes for significant contributions
- The project README (for major contributions)

Thank you for helping make Workspace Architect better! 🚀
