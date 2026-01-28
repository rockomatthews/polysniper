import { AuthHeadersProvider, FetchOptions } from "./types";

type PlaceOrderRequest = {
  marketId: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  clientOrderId?: string;
  timeInForce?: string;
  orderType?: string;
};

export class ClobClient {
  constructor(
    private baseUrl: string,
    private authHeaders?: AuthHeadersProvider
  ) {}

  private async request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
      ...(this.authHeaders ? this.authHeaders() : {})
    };

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`CLOB request failed: ${response.status} ${text}`);
    }

    return response.json() as Promise<T>;
  }

  getOrderBook(marketId: string) {
    return this.request(`/books/${marketId}`);
  }

  getOpenOrders() {
    return this.request(`/orders`);
  }

  placeOrder(order: PlaceOrderRequest) {
    return this.request(`/orders`, {
      method: "POST",
      body: {
        market: order.marketId,
        side: order.side,
        price: order.price,
        size: order.size,
        client_order_id: order.clientOrderId,
        time_in_force: order.timeInForce,
        type: order.orderType
      }
    });
  }

  cancelOrder(orderId: string) {
    return this.request(`/orders/${orderId}`, {
      method: "DELETE"
    });
  }
}
