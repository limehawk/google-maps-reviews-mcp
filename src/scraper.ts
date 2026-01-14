import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { Review, PlaceInfo } from "./types";

let browser: Browser | null = null;
let context: BrowserContext | null = null;

async function getContext(): Promise<BrowserContext> {
  if (!browser) {
    try {
      browser = await chromium.launch({ headless: true, channel: "chrome" });
    } catch {
      browser = await chromium.launch({ headless: true });
    }
  }

  if (!context) {
    // Use mobile user agent - Google shows reviews without sign-in on mobile
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
  }

  return context;
}

async function handleConsentDialog(page: Page): Promise<void> {
  try {
    const consentBtn = await page.$('button:has-text("Accept all")');
    if (consentBtn) {
      await consentBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch {
    // No consent dialog
  }
}

async function scrollToLoadReviews(page: Page, targetCount: number): Promise<void> {
  let previousCount = 0;
  let attempts = 0;
  const maxAttempts = 20;

  while (attempts < maxAttempts) {
    // Count reviews by looking for date patterns like "X ago"
    const reviewCount = await page.locator('text=/\\d+\\s+(day|week|month|year)s?\\s+ago/i').count();

    if (reviewCount >= targetCount) break;
    if (reviewCount === previousCount) {
      attempts++;
    } else {
      attempts = 0;
    }

    previousCount = reviewCount;

    // Scroll down
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(500);
  }
}

function parseRating(text: string): number {
  // Look for star patterns like "5 stars" or just count filled stars
  const match = text.match(/(\d)\s*star/i);
  if (match) return parseInt(match[1], 10);

  // Try to count star indicators
  const starCount = (text.match(/★/g) || []).length;
  if (starCount > 0) return starCount;

  return 0;
}

export async function getReviews(url: string, count: number = 10): Promise<Review[]> {
  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await handleConsentDialog(page);
    await page.waitForTimeout(3000);

    // Scroll to load more reviews
    await scrollToLoadReviews(page, count);
    await page.waitForTimeout(1000);

    // Get all text content and parse reviews
    const pageText = await page.locator('body').textContent() || '';

    // Parse reviews from the text - they follow a pattern:
    // [Name][Time ago][Review text]
    const reviews: Review[] = [];

    // Find all "X ago" patterns and work backwards/forwards to extract reviews
    const agoPattern = /(\d+\s+(?:day|week|month|year)s?\s+ago)/gi;
    const matches = [...pageText.matchAll(agoPattern)];

    for (let i = 0; i < Math.min(matches.length, count); i++) {
      const match = matches[i];
      const dateIndex = match.index || 0;

      // Look backwards for name (usually capitalized words before the date)
      const textBefore = pageText.slice(Math.max(0, dateIndex - 200), dateIndex);
      const nameMatch = textBefore.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*$/);
      const name = nameMatch ? nameMatch[1].trim() : 'Anonymous';

      // Look forward for review text (until next review or end)
      const nextMatchIndex = matches[i + 1]?.index || pageText.length;
      const textAfter = pageText.slice(dateIndex + match[0].length, Math.min(nextMatchIndex, dateIndex + 1000));

      // Clean up the review text
      let text = textAfter.trim();
      // Remove common UI elements
      text = text.replace(/^(Report review|Cancel|Helpful|Share)/gi, '').trim();
      text = text.replace(/(Report review|Helpful|Share|Cancel)$/gi, '').trim();

      // Remove duplicate text (Google shows truncated then full review)
      const halfLen = Math.floor(text.length / 2);
      if (text.length > 100) {
        const firstHalf = text.slice(0, halfLen);
        const secondHalf = text.slice(halfLen);
        // If the second half starts similarly to the first, it's a duplicate
        if (secondHalf.startsWith(firstHalf.slice(0, 50))) {
          text = secondHalf;
        }
      }

      // Remove trailing name (next reviewer's name sometimes gets attached)
      text = text.replace(/[A-Z][a-z]+\s+[A-Z][a-z]+\s*$/, '').trim();

      // Try to find rating in the text before or after
      const ratingText = textBefore + textAfter.slice(0, 50);
      const rating = parseRating(ratingText);

      if (name && text.length > 10) {
        reviews.push({
          name,
          rating: rating || 5, // Default to 5 if we can't parse
          text: text.slice(0, 500), // Limit text length
          date: match[0],
        });
      }
    }

    return reviews;
  } finally {
    await page.close();
  }
}

export async function getPlaceInfo(url: string): Promise<PlaceInfo | null> {
  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await handleConsentDialog(page);
    await page.waitForTimeout(3000);

    const title = await page.title();
    const reviewCountMatch = title.match(/(\d+)\s*reviews?/i);
    const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1], 10) : 0;

    const pageText = await page.locator('body').textContent() || '';

    // Try to find rating
    const ratingMatch = pageText.match(/(\d\.\d)\s*(?:stars?|\()/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    // Try to find name (usually in title)
    const nameMatch = title.match(/^(.+?)\s*[-–]/);
    const name = nameMatch ? nameMatch[1].trim() : '';

    // Try to find address
    const addressMatch = pageText.match(/(\d+\s+[A-Za-z0-9\s,]+(?:St|Ave|Blvd|Rd|Dr|Ln|Way|Ct)[^,]*,\s*[A-Z]{2}\s*\d{5})/i);
    const address = addressMatch ? addressMatch[1].trim() : '';

    return { name, address, rating, reviewCount };
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close();
    context = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
}
