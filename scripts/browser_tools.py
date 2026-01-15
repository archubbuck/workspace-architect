#!/usr/bin/env python3
"""
Browser automation CLI tool using Playwright.
Provides subcommands for common browser automation tasks.
"""

import argparse
import sys
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


def browser_navigate(args):
    """Navigate to a URL."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(args.url, timeout=30000)
            page.wait_for_load_state('networkidle', timeout=30000)
            print(f"Successfully navigated to: {args.url}")
            browser.close()
    except Exception as e:
        print(f"Error navigating to {args.url}: {str(e)}", file=sys.stderr)
        sys.exit(1)


def browser_click(args):
    """Click an element on the page."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(args.url, timeout=30000)
            page.wait_for_load_state('networkidle', timeout=30000)
            
            # Use text selector if provided, otherwise use the selector
            if args.text:
                selector = f"text={args.text}"
            else:
                selector = args.selector
            
            page.click(selector, timeout=10000)
            print(f"Successfully clicked element: {selector}")
            browser.close()
    except Exception as e:
        print(f"Error clicking element: {str(e)}", file=sys.stderr)
        sys.exit(1)


def browser_type(args):
    """Type text into an input field."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(args.url, timeout=30000)
            page.wait_for_load_state('networkidle', timeout=30000)
            
            page.fill(args.selector, args.text, timeout=10000)
            print(f"Successfully typed text into: {args.selector}")
            
            if args.submit:
                page.keyboard.press('Enter')
                print("Submitted form with Enter key")
            
            browser.close()
    except Exception as e:
        print(f"Error typing into element: {str(e)}", file=sys.stderr)
        sys.exit(1)


def browser_screenshot(args):
    """Take a screenshot of the page."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(args.url, timeout=30000)
            page.wait_for_load_state('networkidle', timeout=30000)
            
            page.screenshot(path=args.path, full_page=args.full_page)
            print(f"Screenshot saved to: {args.path}")
            browser.close()
    except Exception as e:
        print(f"Error taking screenshot: {str(e)}", file=sys.stderr)
        sys.exit(1)


def browser_get_content(args):
    """Extract text or HTML content from the page."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(args.url, timeout=30000)
            page.wait_for_load_state('networkidle', timeout=30000)
            
            selector = args.selector if args.selector else 'body'
            
            if args.html:
                content = page.locator(selector).inner_html()
            else:
                content = page.locator(selector).inner_text()
            
            print(content)
            browser.close()
    except Exception as e:
        print(f"Error getting content: {str(e)}", file=sys.stderr)
        sys.exit(1)


def browser_hover(args):
    """Hover over an element."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(args.url, timeout=30000)
            page.wait_for_load_state('networkidle', timeout=30000)
            
            page.hover(args.selector, timeout=10000)
            print(f"Successfully hovered over: {args.selector}")
            browser.close()
    except Exception as e:
        print(f"Error hovering over element: {str(e)}", file=sys.stderr)
        sys.exit(1)


def browser_evaluate(args):
    """Execute JavaScript in the browser context."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(args.url, timeout=30000)
            page.wait_for_load_state('networkidle', timeout=30000)
            
            result = page.evaluate(args.script)
            if result is not None:
                print(result)
            else:
                print("Script executed successfully (no return value)")
            browser.close()
    except Exception as e:
        print(f"Error evaluating script: {str(e)}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description='Browser automation CLI tool using Playwright',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    subparsers.required = True
    
    # browser_navigate command
    navigate_parser = subparsers.add_parser('browser_navigate', help='Navigate to a URL')
    navigate_parser.add_argument('url', help='URL to navigate to')
    navigate_parser.set_defaults(func=browser_navigate)
    
    # browser_click command
    click_parser = subparsers.add_parser('browser_click', help='Click an element')
    click_parser.add_argument('url', help='URL to navigate to')
    click_parser.add_argument('selector', help='CSS selector for the element')
    click_parser.add_argument('--text', help='Text to match instead of selector', default=None)
    click_parser.set_defaults(func=browser_click)
    
    # browser_type command
    type_parser = subparsers.add_parser('browser_type', help='Type text into an input')
    type_parser.add_argument('url', help='URL to navigate to')
    type_parser.add_argument('selector', help='CSS selector for the input field')
    type_parser.add_argument('text', help='Text to type')
    type_parser.add_argument('--submit', action='store_true', help='Press Enter after typing')
    type_parser.set_defaults(func=browser_type)
    
    # browser_screenshot command
    screenshot_parser = subparsers.add_parser('browser_screenshot', help='Take a screenshot')
    screenshot_parser.add_argument('url', help='URL to navigate to')
    screenshot_parser.add_argument('path', help='Output path for the screenshot')
    screenshot_parser.add_argument('--full_page', action='store_true', help='Capture full page')
    screenshot_parser.set_defaults(func=browser_screenshot)
    
    # browser_get_content command
    content_parser = subparsers.add_parser('browser_get_content', help='Extract page content')
    content_parser.add_argument('url', help='URL to navigate to')
    content_parser.add_argument('--selector', help='CSS selector (default: body)', default='body')
    content_parser.add_argument('--html', action='store_true', help='Get HTML instead of text')
    content_parser.set_defaults(func=browser_get_content)
    
    # browser_hover command
    hover_parser = subparsers.add_parser('browser_hover', help='Hover over an element')
    hover_parser.add_argument('url', help='URL to navigate to')
    hover_parser.add_argument('selector', help='CSS selector for the element')
    hover_parser.set_defaults(func=browser_hover)
    
    # browser_evaluate command
    evaluate_parser = subparsers.add_parser('browser_evaluate', help='Execute JavaScript')
    evaluate_parser.add_argument('url', help='URL to navigate to')
    evaluate_parser.add_argument('script', help='JavaScript code to execute')
    evaluate_parser.set_defaults(func=browser_evaluate)
    
    args = parser.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
