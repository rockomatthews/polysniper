export type FetchOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export type AuthHeadersProvider = () => Record<string, string>;
