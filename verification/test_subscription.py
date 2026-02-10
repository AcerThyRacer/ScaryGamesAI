from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Go to subscription page
        print("Navigating to subscription.html...")
        page.goto("http://localhost:9999/subscription.html")

        # 2. Click Max Tier Subscribe
        print("Clicking Max Tier...")
        # Use selector for the button
        page.click('.sub-btn-gold')

        # Verify local storage
        tier = page.evaluate("localStorage.getItem('sgai-sub-tier')")
        print(f"Subscription tier set to: {tier}")
        if tier != 'max':
            print("ERROR: Tier not set correctly!")

        # 3. Go to The Abyss game
        print("Navigating to The Abyss...")
        page.goto("http://localhost:9999/games/the-abyss/")

        # Wait for game to init and badge to appear
        # The badge has class 'qfx-hud' and should say 'Path Tracing'
        print("Waiting for game load...")
        try:
            page.wait_for_selector('.qfx-pt', timeout=10000)
            print("Path Tracing HUD found!")
        except:
            print("WARNING: Path Tracing HUD not found within timeout.")

        # 4. Take screenshot
        time.sleep(2) # Give canvas time to render a frame
        print("Taking screenshot...")
        page.screenshot(path="verification/verification.png")

        browser.close()

if __name__ == "__main__":
    run()
