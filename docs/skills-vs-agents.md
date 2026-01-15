# Skills vs Agents: Comparison Guide

**Purpose:** Help users understand when to use Skills vs Agents in workspace-architect

---

## Quick Comparison

| Feature | Skills | Agents |
|---------|--------|--------|
| **Format** | Folder with SKILL.md + resources | Single `.agent.md` file |
| **Standard** | Open Agent Skills spec | GitHub Copilot format |
| **Platform Support** | Claude, Copilot, ChatGPT, others | Primarily GitHub Copilot |
| **Resources** | Templates, scripts, docs | Instructions only |
| **Best For** | Complex workflows, multi-step tasks | Quick persona definitions |
| **Location** | `.github/skills/name/` | `.github/agents/` |

---

## When to Use Skills

### ✅ Use Skills When You Need:

1. **Multi-File Resources**
   - Templates (HTML, JSON, config files)
   - Scripts for automation
   - Reference documentation
   - Example files

2. **Cross-Platform Compatibility**
   - Works with Claude, Copilot, ChatGPT
   - Following open standards
   - Sharing across different AI tools

3. **Complex Workflows**
   - Multi-step processes
   - Standardized procedures
   - Organizational workflows
   - Repeatable automation

4. **Progressive Disclosure**
   - Large instruction sets
   - Context window optimization
   - On-demand resource loading

### Examples of Good Skills Use Cases:

- **Document Processor**: Includes templates, scripts, and format specs
- **Test Generator**: Templates for different test types, example outputs
- **API Integration**: Scripts, OpenAPI specs, authentication helpers
- **Code Review**: Checklists, security patterns, review templates
- **Deployment Automation**: Config templates, deployment scripts, runbooks

---

## When to Use Agents

### ✅ Use Agents When You Need:

1. **Simple Instructions**
   - Single-file persona definition
   - Pure instruction-based behavior
   - No external resources needed

2. **GitHub Copilot Focus**
   - VS Code integration
   - GitHub-specific workflows
   - Copilot Chat personas

3. **Quick Setup**
   - Fast to create and modify
   - Minimal structure
   - Easy to version control

4. **Existing Ecosystem**
   - Leverage 100+ existing agents
   - Compatible with current tools
   - Community familiarity

### Examples of Good Agent Use Cases:

- **Language Experts**: "Python Expert", "React Developer"
- **Role Personas**: "Security Auditor", "Performance Optimizer"
- **Planning Modes**: "Architect", "Planner", "Reviewer"
- **Domain Specialists**: "Azure Expert", "Database Administrator"

---

## Can They Work Together?

**Yes!** Skills and Agents complement each other:

### Scenario 1: Agent References Skill
```yaml
---
name: "Advanced Test Engineer"
description: "Creates comprehensive tests using test-generator Skill"
---

You are a test engineer. When generating tests:
1. Use the test-generator Skill for templates
2. Follow the project's testing standards
3. Include edge cases and error handling
```

### Scenario 2: Skill + Multiple Agents
- **Skill**: `deployment-automation` (scripts, configs, runbooks)
- **Agent 1**: `devops-engineer` (uses Skill for deployments)
- **Agent 2**: `security-auditor` (uses Skill for compliance checks)

### Scenario 3: Collection with Both
```json
{
  "name": "Full-Stack Development",
  "items": {
    "agents": ["react-expert", "nodejs-expert"],
    "skills": ["api-integration", "test-generator"],
    "instructions": ["coding-standards"]
  }
}
```

---

## Migration Path

### Converting Agent → Skill

If your agent needs resources, consider converting to a Skill:

**Before (Agent):**
```markdown
---
description: "Create API integrations"
name: "API Integration Expert"
---
# Instructions
Follow REST best practices...
```

**After (Skill):**
```
api-integration/
├── SKILL.md (instructions + metadata)
├── templates/
│   ├── openapi-spec.yaml
│   └── client-example.js
└── examples/
    └── auth-flow.md
```

### When NOT to Convert

Keep as Agent if:
- ✅ No external resources needed
- ✅ Instructions are short (<500 lines)
- ✅ Only used with GitHub Copilot
- ✅ Frequently modified

---

## Recommendations by Use Case

### For Individual Developers

**Use Agents for:**
- Personal coding preferences
- Quick project-specific helpers
- Learning new technologies

**Use Skills for:**
- Reusable workflows across projects
- Complex multi-step processes
- Sharing with team/community

### For Teams/Organizations

**Use Agents for:**
- Role-specific personas
- Onboarding helpers
- Project conventions

**Use Skills for:**
- Company-wide procedures
- Security/compliance workflows
- Cross-platform automation
- Standardized templates

### For Open Source Projects

**Use Agents for:**
- Contributor guidelines persona
- Code review helpers
- Project-specific conventions

**Use Skills for:**
- Release automation
- Documentation generation
- Testing frameworks
- Multi-tool integrations

---

## Technical Differences

### File Structure

**Agent:**
```
.github/
└── agents/
    └── my-agent.agent.md
```

**Skill:**
```
.github/
└── skills/
    └── my-skill/
        ├── SKILL.md
        ├── templates/
        ├── scripts/
        └── examples/
```

### Metadata Format

**Agent:**
```yaml
---
description: "Agent description"
name: "Agent Name"
tools: ["tool1", "tool2"]
---
```

**Skill:**
```yaml
---
name: skill-name
description: "Skill description"
license: Apache-2.0
allowed-tools:
  - tool1
  - tool2
metadata:
  version: "1.0.0"
---
```

### Loading Behavior

- **Agents**: Fully loaded when activated
- **Skills**: Progressive disclosure (metadata first, full content on-demand)

---

## Future Considerations

### Potential Convergence

The Agent Skills standard is evolving. Future possibilities:

1. **Unified Format**: Single format supporting both use cases
2. **Backward Compatibility**: Agents as lightweight Skills
3. **Migration Tools**: Automated conversion utilities
4. **Enhanced Metadata**: Richer agent/skill descriptions

### Best Practice

**Use both strategically:**
- Start with Agents for simplicity
- Upgrade to Skills when complexity warrants
- Maintain both for different audiences
- Document your choice rationale

---

## Quick Decision Matrix

Answer these questions to choose:

1. **Do you need templates or scripts?**
   - Yes → **Skill**
   - No → Agent

2. **Must it work across multiple AI platforms?**
   - Yes → **Skill**
   - No → Agent

3. **Is it >500 lines of instructions?**
   - Yes → **Skill**
   - No → Agent

4. **Does it need version control of resources?**
   - Yes → **Skill**
   - No → Agent

5. **Is it primarily for GitHub Copilot?**
   - Yes → **Agent**
   - No → Skill

**Rule of Thumb:** If 3+ answers point to Skill, use a Skill. Otherwise, start with an Agent.

---

## Examples from workspace-architect

### Existing Agents That Could Be Skills

These agents might benefit from Skill conversion:

- `planner` → Could include planning templates
- `prd` → Could include PRD templates
- `arch` → Could include architecture diagrams/templates

### Skills in Development

Coming in v1.6.0:

- `document-processor` - From anthropics/skills
- `test-generator` - From anthropics/skills
- `api-integration` - From anthropics/skills

---

## Summary

**Both are valuable!**

- **Agents**: Lightweight, quick, Copilot-focused
- **Skills**: Rich, standardized, multi-platform

Choose based on:
- Complexity of task
- Resource requirements
- Platform compatibility needs
- Team/organization standards

When in doubt, start with an Agent and upgrade to a Skill if needed.

---

## Related Documentation

- [Claude Skills Research Report](./claude-skills-research.md)
- [Implementation Plan](./claude-skills-implementation-plan.md)
- [Example Skill](../assets/skills/example-planner/SKILL.md)

---

*Last Updated: December 30, 2025*
