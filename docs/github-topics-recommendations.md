# GitHub Repository Topics Recommendations

This document contains recommended GitHub topics/tags to improve the discoverability of the workspace-architect repository.

## How to Add Topics

1. Go to https://github.com/archubbuck/workspace-architect
2. Click the ⚙️ gear icon next to "About" on the right sidebar
3. Add the topics listed below in the "Topics" field
4. Click "Save changes"

## Recommended Topics (Primary - High Priority)

These are the most important topics that directly relate to the core functionality:

```
github-copilot
copilot-agents
ai-agents
copilot-instructions
copilot-chat
developer-tools
cli-tool
prompt-engineering
```

## Recommended Topics (Secondary - Medium Priority)

Additional topics that help with discoverability in specific domains:

```
ai-assistant
agentic-workflow
vscode
code-assistant
npx
productivity-tools
claude-skills
llm
ai-personas
chatmodes
code-generation
```

## Recommended Topics (Tertiary - Nice to Have)

Technology and framework-specific topics for targeting specific developer communities:

```
typescript
javascript
react
azure
devops
nodejs
markdown
automation
```

## Complete List (Copy-Paste Ready)

For quick addition, here's the complete comma-separated list of all recommended topics:

```
github-copilot, copilot-agents, ai-agents, copilot-instructions, copilot-chat, developer-tools, cli-tool, prompt-engineering, ai-assistant, agentic-workflow, vscode, code-assistant, npx, productivity-tools, claude-skills, llm, ai-personas, chatmodes, code-generation, typescript, javascript, react, azure, devops, nodejs, markdown, automation
```

## Topic Selection Rationale

### Core Functionality Topics
- **github-copilot**: Primary platform this tool enhances
- **copilot-agents**: Core feature - provides specialized agents
- **ai-agents**: Broader AI agent ecosystem
- **copilot-instructions**: Key asset type provided
- **copilot-chat**: Integration point for users

### Developer Experience Topics
- **cli-tool**: Primary interface method
- **developer-tools**: General developer productivity category
- **npx**: Zero-install execution method
- **productivity-tools**: Appeals to efficiency-focused developers

### Technology Topics
- **prompt-engineering**: Growing field of interest
- **claude-skills**: Emerging standard we support
- **llm**: Large language model ecosystem
- **agentic-workflow**: Trending AI development pattern
- **ai-personas**: Specialized AI personalities and roles
- **chatmodes**: Legacy term for discoverability (deprecated in favor of "agents")

### Platform Topics
- **vscode**: Primary IDE integration
- **code-assistant**: Search term developers use
- **code-generation**: What users want to achieve

### Domain-Specific Topics
- **react, azure, devops, typescript**: Major domains covered by assets
- **nodejs, javascript**: Runtime and language
- **markdown**: Asset format

## SEO Benefits

Adding these topics will:
1. Improve GitHub search ranking for relevant queries
2. Appear in GitHub's topic pages (e.g., github.com/topics/github-copilot)
3. Help GitHub's recommendation algorithm suggest the repo
4. Make the repo discoverable through related repositories
5. Improve visibility in GitHub Explore

## Maintenance

- Review topics quarterly to ensure relevance
- Add new topics as features are added (e.g., new Skills, new integrations)
- Monitor GitHub topic trending to identify emerging relevant topics
- Keep total topics under 30 for optimal effectiveness

## Alternative: Set Topics via GitHub API

If you prefer to set topics programmatically:

```bash
# Using GitHub CLI
gh api repos/archubbuck/workspace-architect/topics \
  -X PUT \
  -f names='["github-copilot","copilot-agents","ai-agents","copilot-instructions","copilot-chat","developer-tools","cli-tool","prompt-engineering","ai-assistant","agentic-workflow","vscode","code-assistant","npx","productivity-tools","claude-skills","llm","ai-personas","chatmodes","code-generation","typescript","javascript","react","azure","devops","nodejs","markdown","automation"]'
```

---

*This file can be committed to the repository for reference, but topics must be set through GitHub's UI or API.*
