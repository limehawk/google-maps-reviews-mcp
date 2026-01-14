// Google Maps selectors - update these when Google changes their UI
// Last updated: January 2026

export const SELECTORS = {
  // Consent/cookie dialog
  consentButton: 'button[aria-label="Accept all"]',

  // Reviews tab
  reviewsTab: 'button[data-tab-index="1"]',
  reviewsTabAlt: 'button[aria-label*="Reviews"]',

  // Review container and items
  reviewsContainer: 'div[data-review-id]',
  reviewItem: 'div[data-review-id]',

  // Individual review elements (relative to review item)
  reviewerName: '.d4r55',
  reviewRating: 'span[role="img"][aria-label*="star"]',
  reviewText: '.wiI7pd',
  reviewTextExpanded: '.MyEned',
  reviewDate: '.rsqaWe',
  moreButton: 'button[aria-label="See more"]',

  // Scrollable reviews pane
  scrollablePane: 'div.m6QErb.DxyBCb',

  // Place info
  placeName: 'h1.DUwDvf',
  placeRating: 'div.F7nice span[aria-hidden="true"]',
  placeReviewCount: 'span[aria-label*="reviews"]',
  placeAddress: 'button[data-item-id="address"]',
};
