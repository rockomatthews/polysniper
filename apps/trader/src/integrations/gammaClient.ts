export class GammaClient {
  constructor(private baseUrl: string) {}

  async listMarkets() {
    const response = await fetch(`${this.baseUrl}/markets`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gamma markets failed: ${response.status} ${text}`);
    }
    return response.json() as Promise<{ markets: Array<{ id: string; question: string }> }>;
  }
}
