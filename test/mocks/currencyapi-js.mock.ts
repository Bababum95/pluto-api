// Simple mock for @everapi/currencyapi-js used in tests.
// It mimics the constructor and a subset of the public API.

type LatestParams = Record<string, unknown>;

type LatestResult = {
  data?: unknown;
};

export default class CurrencyApiMock {
  constructor(_apiKey: string) {
    // No-op: API key is not used in tests.
  }

  latest(_params?: LatestParams): Promise<LatestResult> {
    return Promise.resolve({ data: {} });
  }
}
