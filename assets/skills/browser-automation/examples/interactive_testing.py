#!/usr/bin/env python3
"""
Example: Interactive UI testing using browser_tools.py

This example demonstrates how to test interactive UI elements
like hover states, dropdowns, and dynamic content.
"""

import subprocess
import sys

def run_command(cmd):
    """Run a command and print output."""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    print(result.stdout)
    return result.stdout

def main():
    # Example URL - replace with actual page with interactive elements
    page_url = "https://example.com/interactive"
    
    print("=== Testing hover state ===")
    # Navigate and hover over element
    run_command([
        "python", "scripts/browser_tools.py", "browser_hover",
        page_url, ".dropdown-trigger"
    ])
    
    # Take screenshot of hover state
    run_command([
        "python", "scripts/browser_tools.py", "browser_screenshot",
        page_url, "/tmp/hover-state.png"
    ])
    print("Hover state screenshot saved to /tmp/hover-state.png")
    
    print("\n=== Testing dropdown menu ===")
    # Click to open dropdown
    run_command([
        "python", "scripts/browser_tools.py", "browser_click",
        page_url, ".dropdown-trigger"
    ])
    
    # Click a dropdown item by text
    run_command([
        "python", "scripts/browser_tools.py", "browser_click",
        page_url, ".dropdown-menu", "--text", "Option 1"
    ])
    
    print("\n=== Testing search functionality ===")
    # Type in search box and submit
    run_command([
        "python", "scripts/browser_tools.py", "browser_type",
        page_url, "#search-input", "test query", "--submit"
    ])
    
    # Capture results page
    run_command([
        "python", "scripts/browser_tools.py", "browser_screenshot",
        f"{page_url}/search?q=test+query", "/tmp/search-results.png"
    ])
    print("Search results screenshot saved to /tmp/search-results.png")
    
    print("\n=== Checking dynamic content ===")
    # Use JavaScript to check for dynamically loaded content
    element_count = run_command([
        "python", "scripts/browser_tools.py", "browser_evaluate",
        page_url, "document.querySelectorAll('.dynamic-item').length"
    ])
    print(f"Found {element_count.strip()} dynamic items on the page")
    
    print("\nInteractive UI testing completed successfully!")

if __name__ == "__main__":
    main()
