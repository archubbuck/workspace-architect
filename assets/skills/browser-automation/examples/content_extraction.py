#!/usr/bin/env python3
"""
Example: Web scraping and content extraction using browser_tools.py

This example demonstrates how to extract content from a web page,
including text content, specific elements, and HTML.
"""

import subprocess
import sys

def run_command(cmd):
    """Run a command and return output."""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    return result.stdout

def main():
    # Example URL - replace with actual page to scrape
    page_url = "https://example.com/article"
    
    print("=== Extracting full page text ===")
    full_text = run_command([
        "python", "scripts/browser_tools.py", "browser_get_content",
        page_url
    ])
    print(full_text[:200] + "...")  # Print first 200 characters
    
    print("\n=== Extracting article content ===")
    article_text = run_command([
        "python", "scripts/browser_tools.py", "browser_get_content",
        page_url, "--selector", "article"
    ])
    print(article_text[:200] + "...")
    
    print("\n=== Extracting article HTML ===")
    article_html = run_command([
        "python", "scripts/browser_tools.py", "browser_get_content",
        page_url, "--selector", "article", "--html"
    ])
    print(article_html[:200] + "...")
    
    print("\n=== Taking screenshot for reference ===")
    run_command([
        "python", "scripts/browser_tools.py", "browser_screenshot",
        page_url, "/tmp/article-page.png", "--full_page"
    ])
    print("Screenshot saved to /tmp/article-page.png")
    
    print("\n=== Getting metadata via JavaScript ===")
    title = run_command([
        "python", "scripts/browser_tools.py", "browser_evaluate",
        page_url, "document.title"
    ])
    print(f"Page title: {title}")
    
    print("\nContent extraction completed successfully!")

if __name__ == "__main__":
    main()
