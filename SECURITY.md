# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.7.x   | :white_check_mark: |
| 1.6.x   | :white_check_mark: |
| < 1.6   | :x:                |

## Reporting a Vulnerability

We take the security of workspace-architect seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues by emailing:
- **Email**: adam.chubbuck@gmail.com
- **Subject**: [SECURITY] workspace-architect vulnerability report

### What to Include

Please include the following information in your report:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if you have one)
- Your contact information

### Response Timeline

- **Initial Response**: Within 48 hours of your report
- **Status Update**: Within 7 days with assessment and timeline
- **Resolution**: We aim to release a fix within 30 days for critical issues

### What to Expect

1. We'll acknowledge receipt of your vulnerability report
2. We'll investigate and assess the impact
3. We'll develop and test a fix
4. We'll release a security patch and credit you (unless you prefer to remain anonymous)
5. We'll publish a security advisory after the fix is released

## Security Best Practices

When using workspace-architect:

- **Keep Updated**: Always use the latest version to benefit from security patches
- **Review Assets**: Review agent definitions and instructions before using them in production
- **Limited Permissions**: Run with minimal required permissions
- **Verify Sources**: Assets are synced from trusted upstream repositories (github/awesome-copilot, anthropics/skills)

## Known Security Considerations

### Asset Content
- Assets (agents, instructions, prompts) are markdown files that configure GitHub Copilot behavior
- These files do not execute code but influence AI-generated code suggestions
- Review assets before using them in sensitive projects

### Dependencies
- We keep dependencies updated and monitor for security advisories
- Regular automated scans via GitHub Dependabot
- Critical security updates are addressed immediately

## Security Updates

Security updates are published in the following channels:
- GitHub Security Advisories
- npm package updates
- CHANGELOG.md with `[SECURITY]` tags
- GitHub Releases

## Questions?

If you have questions about this security policy, please open a GitHub Discussion or contact adam.chubbuck@gmail.com.

---

*Last updated: January 2026*
