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

async function dismissDialogs(page: Page): Promise<void> {
  // Dismiss cookie consent
  try {
    await page.click('button:has-text("Accept all")', { timeout: 2000 });
  } catch { /* no dialog */ }

  // Dismiss "Google Maps is better on app" dialog
  try {
    await page.click('button:has-text("Go back to web")', { timeout: 2000 });
  } catch { /* no dialog */ }

  // Also try "Continue" or closing other dialogs
  try {
    await page.click('button:has-text("Continue")', { timeout: 1000 });
  } catch { /* no dialog */ }
}

async function scrollToLoadReviews(page: Page, targetCount: number): Promise<void> {
  let previousCount = 0;
  let stuckAttempts = 0;
  const maxStuckAttempts = 10;
  let totalScrolls = 0;
  const maxTotalScrolls = 50;

  while (totalScrolls < maxTotalScrolls) {
    const reviewCount = await page.locator('.hjmQqc').count();

    if (reviewCount >= targetCount) break;

    if (reviewCount === previousCount) {
      stuckAttempts++;
      if (stuckAttempts >= maxStuckAttempts) break;
    } else {
      stuckAttempts = 0;
    }

    previousCount = reviewCount;
    totalScrolls++;

    // Scroll more aggressively
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(600);

    // Every few scrolls, also try keyboard navigation
    if (totalScrolls % 5 === 0) {
      await page.keyboard.press('End');
      await page.waitForTimeout(500);
    }
  }
}

function extractName(fullName: string): string {
  // The full name might include business/title like "Dawn Melancon, Realtor, CMRS NextHome Luxury"
  // Extract just the person's name (first part before comma, or first two capitalized words)

  // If there's a comma, take the first part
  if (fullName.includes(',')) {
    return fullName.split(',')[0].trim();
  }

  // Otherwise, try to get first two words (typical name pattern)
  const words = fullName.trim().split(/\s+/);
  if (words.length >= 2) {
    // Check if first two words look like a name (capitalized)
    const firstTwo = words.slice(0, 2).join(' ');
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(firstTwo)) {
      return firstTwo;
    }
  }

  return fullName.trim();
}

function parseRating(starsText: string): number {
  // Count star characters or parse from text
  const starCount = (starsText.match(/★/g) || []).length;
  if (starCount > 0) return starCount;

  const match = starsText.match(/(\d)\s*star/i);
  if (match) return parseInt(match[1], 10);

  return 5; // Default
}

export async function getReviews(url: string, count: number = 10): Promise<Review[]> {
  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
    await dismissDialogs(page);
    await page.waitForTimeout(2000);

    // Scroll to load more reviews
    await scrollToLoadReviews(page, count);
    await page.waitForTimeout(1000);

    // Extract reviews using DOM structure
    const reviews: Review[] = [];
    const reviewElements = await page.locator('.hjmQqc').all();

    for (let i = 0; i < Math.min(reviewElements.length, count); i++) {
      try {
        const el = reviewElements[i];
        const text = await el.textContent() || '';

        // Parse the text: [Name][Date][Stars][ReviewText]
        // Date pattern: "X (days|weeks|months|years) ago"
        const dateMatch = text.match(/(\d+\s+(?:day|week|month|year)s?\s+ago)/i);
        if (!dateMatch) continue;

        const dateIndex = text.indexOf(dateMatch[0]);
        const beforeDate = text.slice(0, dateIndex).trim();
        const afterDate = text.slice(dateIndex + dateMatch[0].length).trim();

        // Name is everything before the date
        const fullName = beforeDate;
        const name = extractName(fullName);

        // Review text is after the date, possibly after stars
        let reviewText = afterDate;
        // Remove leading stars
        reviewText = reviewText.replace(/^[★☆\s]+/, '').trim();

        // Skip if no actual review text
        if (reviewText.length < 10) continue;

        // Try to find rating (stars before the review text)
        const rating = parseRating(afterDate.slice(0, 20));

        reviews.push({
          name,
          rating,
          text: reviewText.slice(0, 500),
          date: dateMatch[0],
        });
      } catch {
        // Skip malformed review
      }
    }

    // Deduplicate by name+text (sometimes reviews appear multiple times)
    const seen = new Set<string>();
    const unique = reviews.filter(r => {
      const key = r.name + r.text.slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique;
  } finally {
    await page.close();
  }
}

export async function getPlaceInfo(url: string): Promise<PlaceInfo | null> {
  const ctx = await getContext();
  const page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);
    await dismissDialogs(page);

    const title = await page.title();
    const reviewCountMatch = title.match(/(\d+)\s*reviews?/i);
    const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1], 10) : 0;

    const pageText = await page.locator('body').textContent() || '';

    const ratingMatch = pageText.match(/(\d\.\d)\s*(?:stars?|\()/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    const nameMatch = title.match(/^(.+?)\s*[-–]/);
    const name = nameMatch ? nameMatch[1].trim() : '';

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
