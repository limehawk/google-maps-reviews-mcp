export interface Review {
  name: string;
  rating: number;
  text: string;
  date: string;
  helpfulCount?: number;
}

export interface PlaceInfo {
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
}

export interface GetReviewsParams {
  url: string;
  count?: number;
}
