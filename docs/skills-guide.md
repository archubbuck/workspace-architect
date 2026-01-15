# Claude Skills User Guide

**Last Updated:** December 30, 2025

Welcome to Claude Skills support in workspace-architect! This guide will help you discover, download, and use Skills in your projects.

---

## What are Skills?

Skills are modular, folder-based packages that contain:
- **SKILL.md**: Instructions and metadata
- **Templates**: Document or code templates
- **Scripts**: Automation scripts
- **Resources**: Reference materials and examples

Skills follow the [open Agent Skills specification](https://agentskills.io/) and work across multiple AI platforms including Claude, GitHub Copilot, and ChatGPT.

---

## Quick Start

### List Available Skills

```bash
npx workspace-architect list skills
```

**Example output:**
```
Available skills:
  - example-planner (v1.0.0) - Create detailed implementation plans
```

### Download a Skill

```bash
npx workspace-architect download skills example-planner
```

This creates `.github/skills/example-planner/` with all the Skill files.

### Download to Custom Location

```bash
npx workspace-architect download skills example-planner -o ./my-skills
```

### Download Skills Collection

```bash
npx workspace-architect download collections claude-skills-starter
```

---

## Using Skills

### In VS Code with GitHub Copilot

1. Download Skills to `.github/skills/` (default location)
2. Open your project in VS Code
3. GitHub Copilot will automatically discover Skills
4. Ask Copilot to use a specific Skill:
   ```
   "Use the example-planner Skill to create an implementation plan for adding user authentication"
   ```

### In Claude

1. Download Skills to your preferred location
2. Reference the Skill directory when working with Claude
3. Claude will load the Skill instructions and resources

### In Claude Code

Skills in `.github/skills/` are automatically discovered by Claude Code when you open the repository.

---

## Skill Structure

A typical Skill looks like this:

```
skill-name/
├── SKILL.md           # Main instructions
├── templates/         # Optional: templates
│   └── template.html
├── scripts/           # Optional: scripts
│   └── processor.py
└── examples/          # Optional: examples
    └── example-output.md
```

### SKILL.md Format

```markdown
---
name: skill-name
description: What this Skill does and when to use it
license: MIT
metadata:
  version: "1.0.0"
  maintainer: "your-name"
  category: "planning"
---

# Skill Name

## Purpose
...

## Instructions
...
```

---

## Creating Your Own Skills

### 1. Create Skill Directory

```bash
mkdir -p assets/skills/my-skill
```

### 2. Create SKILL.md

```bash
cat > assets/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: A brief description of what this Skill does
license: MIT
metadata:
  version: "1.0.0"
  maintainer: "your-name"
---

# My Skill

## Purpose
Explain when and why to use this Skill.

## Instructions
Step-by-step instructions for the AI agent to follow.
EOF
```

### 3. Add Resources (Optional)

```bash
mkdir -p assets/skills/my-skill/templates
# Add your templates, scripts, or other resources
```

### 4. Validate the Skill

```bash
npm run validate-skills
```

### 5. Regenerate Manifest

```bash
npm run generate-manifest
```

### 6. Test It

```bash
npx workspace-architect download skills my-skill --dry-run
```

---

## Skills vs Agents

| Feature | Skills | Agents |
|---------|--------|--------|
| **Format** | Folder with multiple files | Single .agent.md file |
| **Resources** | Templates, scripts, docs | Instructions only |
| **Platform** | Claude, Copilot, ChatGPT, etc. | Primarily GitHub Copilot |
| **Best For** | Complex workflows | Simple personas |

**When to use Skills:**
- Need templates, scripts, or reference materials
- Want cross-platform compatibility
- Building complex, multi-step workflows

**When to use Agents:**
- Simple instruction-based behavior
- Quick persona definition
- GitHub Copilot-specific features

See [Skills vs Agents Guide](./skills-vs-agents.md) for more details.

---

## Available Skills

### example-planner (v1.0.0)

**Description:** Create detailed implementation plans for software features and refactoring tasks.

**Use when:**
- Planning new features
- Architectural changes
- Major refactoring efforts

**Includes:**
- Structured planning template
- Best practices guide
- Example outputs

**Download:**
```bash
npx workspace-architect download skills example-planner
```

---

## Collections

### claude-skills-starter

Essential Skills for software development and planning.

**Includes:**
- example-planner

**Download:**
```bash
npx workspace-architect download collections claude-skills-starter
```

---

## CLI Options

### List Command

```bash
npx workspace-architect list [type]
```

**Options:**
- `type`: Filter by asset type (skills, agents, instructions, prompts, collections)

**Examples:**
```bash
npx workspace-architect list                    # List all assets
npx workspace-architect list skills             # List only Skills
npx workspace-architect list collections        # List collections
```

### Download Command

```bash
npx workspace-architect download <type> <name> [options]
```

**Options:**
- `-d, --dry-run`: Preview what will be downloaded
- `-f, --force`: Overwrite existing files without asking
- `-o, --output <path>`: Specify custom output directory

**Examples:**
```bash
# Download with preview
npx workspace-architect download skills example-planner --dry-run

# Download and overwrite if exists
npx workspace-architect download skills example-planner --force

# Download to custom location
npx workspace-architect download skills example-planner -o ./my-skills
```

---

## Scripts for Maintainers

### Validate Skills

Check that all Skills have valid SKILL.md format:

```bash
npm run validate-skills
```

### Sync from Upstream

Sync Skills from anthropics/skills repository:

```bash
npm run sync-skills
```

**Note:** Requires `GITHUB_TOKEN` environment variable for API access.

### Generate Manifest

Update the assets manifest:

```bash
npm run generate-manifest
```

---

## Troubleshooting

### "Skill not found" Error

**Problem:** `Error: Skill not found: skills/my-skill`

**Solution:**
1. Check the Skill name: `npx workspace-architect list skills`
2. Regenerate manifest: `npm run generate-manifest`
3. Verify the Skill exists in `assets/skills/`

### Validation Errors

**Problem:** Validation fails for a Skill

**Solution:**
1. Check SKILL.md has required fields: `name`, `description`
2. Ensure YAML frontmatter is valid (starts and ends with `---`)
3. Name should be lowercase with hyphens: `my-skill` not `MySkill`

### Download Fails

**Problem:** Download fails in production mode

**Solution:**
1. Check network connection
2. Verify the manifest is up-to-date
3. Try dry-run first: `--dry-run`

---

## Best Practices

### For Users

1. **Download to Standard Location**: Use `.github/skills/` for automatic discovery
2. **Keep Skills Updated**: Re-download periodically to get latest versions
3. **Test Before Using**: Use `--dry-run` to preview downloads

### For Creators

1. **Clear Instructions**: Write step-by-step instructions for AI agents
2. **Include Examples**: Add example outputs or use cases
3. **Version Your Skills**: Use semantic versioning in metadata
4. **Validate First**: Run `npm run validate-skills` before publishing
5. **Document Resources**: Explain what each file/template does

---

## FAQ

### Can Skills and Agents work together?

Yes! You can use both in the same project. Agents can reference Skills for complex workflows.

### Do Skills execute scripts automatically?

No. Scripts are downloaded but not executed automatically for security. Users must run them manually if needed.

### Can I use Skills without CLI?

Yes. You can manually copy Skills into `.github/skills/` and AI tools will discover them.

### How do I share my Skills?

1. Create Skills in `assets/skills/`
2. Validate with `npm run validate-skills`
3. Submit a pull request to workspace-architect
4. Or share your Skills directory directly with others

### Are Skills compatible with GitHub Copilot Chat Agents?

Yes! Skills follow the same structure as VS Code Agent Skills and work with GitHub Copilot.

---

## Resources

- [Skills vs Agents Guide](./skills-vs-agents.md)
- [Agent Skills Specification](https://agentskills.io/)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)

---

## Support

For issues, questions, or suggestions:
- Open an issue on [GitHub](https://github.com/archubbuck/workspace-architect/issues)
- Check existing documentation in the `docs/` directory

---

*Happy coding with Skills! 🚀*
