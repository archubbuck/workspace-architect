#!/usr/bin/env python3
"""
Example: Basic form automation using browser_tools.py

This example demonstrates how to automate a simple form submission
by filling in multiple fields and clicking submit.
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
    # Example URL - replace with actual form URL
    form_url = "https://example.com/contact"
    
    # Fill in the name field
    run_command([
        "python", "scripts/browser_tools.py", "browser_type",
        form_url, "#name", "John Doe"
    ])
    
    # Fill in the email field
    run_command([
        "python", "scripts/browser_tools.py", "browser_type",
        form_url, "#email", "john.doe@example.com"
    ])
    
    # Fill in the message field
    run_command([
        "python", "scripts/browser_tools.py", "browser_type",
        form_url, "#message", "This is a test message from automation"
    ])
    
    # Take a screenshot before submission
    run_command([
        "python", "scripts/browser_tools.py", "browser_screenshot",
        form_url, "/tmp/form-filled.png"
    ])
    
    # Click the submit button
    run_command([
        "python", "scripts/browser_tools.py", "browser_click",
        form_url, "#submit"
    ])
    
    print("Form automation completed successfully!")

if __name__ == "__main__":
    main()
