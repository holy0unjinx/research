export interface SearchResultItem {
  source: string[];
  title: string;
  url: string;
  description: string;
  published_at: string | null;
}

export interface SearchResponse {
  original_query: string;
  final_query: string;
  errata_steps: string[];
  count: number;
  results: SearchResultItem[];
}
