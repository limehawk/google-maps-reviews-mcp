import { getReviews, getPlaceInfo, closeBrowser } from "./src/scraper";

const TEST_URL = "https://www.google.com/maps/place/Perry+G.+Gruman/@27.944512,-82.5023384,17z/data=!4m8!3m7!1s0x88c2c30da03dcf4d:0xb26f41be773ec7d3!8m2!3d27.9445073!4d-82.4997635!9m1!1b1!16s%2Fg%2F1tg16j0q";

async function main() {
  console.log("Testing Google Maps Reviews Scraper\n");
  console.log("URL:", TEST_URL);
  console.log("\n--- Place Info ---");

  try {
    const placeInfo = await getPlaceInfo(TEST_URL);
    console.log(JSON.stringify(placeInfo, null, 2));

    console.log("\n--- Reviews (first 5) ---");
    const reviews = await getReviews(TEST_URL, 20);
    console.log(JSON.stringify(reviews, null, 2));
    console.log(`\nFetched ${reviews.length} reviews`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await closeBrowser();
  }
}

main();
