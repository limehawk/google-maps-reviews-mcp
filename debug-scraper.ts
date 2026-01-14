import { chromium } from "playwright";

const TEST_URL = "https://www.google.com/maps/place/Perry+G.+Gruman/@27.944512,-82.5023384,17z/data=!4m8!3m7!1s0x88c2c30da03dcf4d:0xb26f41be773ec7d3!8m2!3d27.9445073!4d-82.4997635!9m1!1b1!16s%2Fg%2F1tg16j0q";

async function debug() {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });

  const page = await context.newPage();

  try {
    console.log("Navigating...");
    await page.goto(TEST_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    // Save screenshot
    await page.screenshot({ path: "/tmp/gmaps-debug.png", fullPage: true });
    console.log("Screenshot saved");

    // Get the HTML structure around reviews
    const html = await page.content();

    // Find review sections - look for the pattern
    // Each review seems to have: name, optional info, date, text

    // Let's find all elements and their structure
    const reviewData = await page.evaluate(() => {
      const results: string[] = [];

      // Find all elements containing "ago" (date markers)
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent || '';
        if (/\d+\s+(day|week|month|year)s?\s+ago/i.test(text)) {
          // Found a date, get parent structure
          let parent = node.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            parent = parent.parentElement;
          }
          if (parent) {
            results.push("---REVIEW BLOCK---");
            results.push("HTML: " + parent.innerHTML.slice(0, 500));
            results.push("TEXT: " + parent.textContent?.slice(0, 300));
          }
        }
      }

      return results;
    });

    console.log("\n=== Review Structure Analysis ===\n");
    reviewData.forEach(r => console.log(r));

  } finally {
    await browser.close();
  }
}

debug().catch(console.error);
