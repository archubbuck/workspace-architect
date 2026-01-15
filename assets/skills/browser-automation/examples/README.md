# Browser Automation Examples

This directory contains example scripts demonstrating common browser automation patterns using the browser_tools.py CLI.

## Prerequisites

Before running these examples, make sure you have:

1. Python 3.8 or higher installed
2. Playwright installed:
   ```bash
   pip install playwright
   playwright install chromium
   ```

## Available Examples

### 1. form_automation.py

Demonstrates basic form automation:
- Filling in multiple form fields
- Taking screenshots before submission
- Clicking submit buttons

**Usage:**
```bash
python examples/form_automation.py
```

**Note:** Update the `form_url` variable with a real form URL before running.

### 2. content_extraction.py

Shows how to extract content from web pages:
- Getting full page text
- Extracting specific elements by selector
- Getting HTML vs text content
- Using JavaScript to get metadata
- Taking full-page screenshots

**Usage:**
```bash
python examples/content_extraction.py
```

**Note:** Update the `page_url` variable with a real page URL before running.

### 3. interactive_testing.py

Demonstrates testing interactive UI elements:
- Hovering over elements to trigger states
- Working with dropdowns and menus
- Testing search functionality
- Checking for dynamically loaded content
- Capturing screenshots of different UI states

**Usage:**
```bash
python examples/interactive_testing.py
```

**Note:** Update the `page_url` variable with a real page containing interactive elements.

## Customizing Examples

Each example script can be customized by:

1. **Changing URLs**: Update the URL variables to point to your target websites
2. **Modifying selectors**: Change CSS selectors to match your target page structure
3. **Adding steps**: Add more commands to extend the automation workflow
4. **Error handling**: Add try-catch blocks for more robust error handling

## Running Individual Commands

You can also run browser automation commands individually:

```bash
# Navigate to a page
python ../scripts/browser_tools.py browser_navigate https://example.com

# Click an element
python ../scripts/browser_tools.py browser_click https://example.com "#button"

# Type into a field
python ../scripts/browser_tools.py browser_type https://example.com "#input" "text"

# Take a screenshot
python ../scripts/browser_tools.py browser_screenshot https://example.com /tmp/page.png

# Extract content
python ../scripts/browser_tools.py browser_get_content https://example.com

# Hover over element
python ../scripts/browser_tools.py browser_hover https://example.com ".menu"

# Execute JavaScript
python ../scripts/browser_tools.py browser_evaluate https://example.com "document.title"
```

## Best Practices

1. **Start simple**: Test individual commands before combining them into scripts
2. **Use robust selectors**: Prefer ID selectors or specific classes over generic tags
3. **Wait for content**: The tools automatically wait for 'networkidle' state
4. **Handle errors**: Check command return codes and stderr for errors
5. **Take screenshots**: Capture screenshots to verify automation steps
6. **Test locally**: Always test with local/test environments first

## Troubleshooting

If examples don't work:

1. **Check Playwright installation**: Run `playwright install chromium`
2. **Verify URLs**: Make sure target URLs are accessible
3. **Inspect selectors**: Use browser DevTools to verify CSS selectors exist
4. **Check permissions**: Ensure write permissions for screenshot directories
5. **Review errors**: Check stderr output for detailed error messages

## More Information

- Main skill documentation: `../SKILL.md`
- Browser tools source: `../scripts/browser_tools.py`
- Playwright docs: https://playwright.dev/python/
