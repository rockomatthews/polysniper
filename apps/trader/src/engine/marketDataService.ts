import { OrderBook } from "@polysniper/core";
import { ClobClient } from "../integrations/clobClient";
import { WsClient } from "./wsClient";
import { logger } from "../utils/logger";

type BookUpdateHandler = (marketId: string) => void;

const parseSide = (raw: unknown): Array<[number, number]> => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((level) => {
      if (Array.isArray(level) && level.length >= 2) {
        return [Number(level[0]), Number(level[1])] as [number, number];
      }
      if (typeof level === "object" && level !== null) {
        const obj = level as Record<string, unknown>;
        return [Number(obj.price), Number(obj.size)] as [number, number];
      }
      return [NaN, NaN] as [number, number];
    })
    .filter(([price, size]) => Number.isFinite(price) && Number.isFinite(size));
};

export class MarketDataService {
  private books = new Map<string, OrderBook>();
  private handlers: BookUpdateHandler[] = [];

  constructor(
    private clob: ClobClient,
    private ws: WsClient,
    private staleBookMs: number
  ) {}

  onBookUpdate(handler: BookUpdateHandler) {
    this.handlers.push(handler);
  }

  getBook(marketId: string) {
    if (!this.books.has(marketId)) {
      this.books.set(marketId, new OrderBook());
    }
    return this.books.get(marketId)!;
  }

  isStale(marketId: string) {
    const book = this.books.get(marketId);
    if (!book) {
      return true;
    }
    return book.isStale(this.staleBookMs, Date.now());
  }

  async bootstrap(marketIds: string[]) {
    await Promise.all(
      marketIds.map(async (marketId) => {
        try {
          const snapshot = await this.clob.getOrderBook(marketId);
          const bids = parseSide((snapshot as Record<string, unknown>).bids);
          const asks = parseSide((snapshot as Record<string, unknown>).asks);
          const book = this.getBook(marketId);
          book.applySnapshot({
            marketId,
            bids: bids.map(([price, size]) => ({ price, size })),
            asks: asks.map(([price, size]) => ({ price, size })),
            timestamp: Date.now()
          });
        } catch (error) {
          logger.warn("Snapshot failed", { marketId, error: (error as Error).message });
        }
      })
    );
  }

  handleWsMessage(message: Record<string, unknown>) {
    const type = (message.type as string | undefined) ?? (message.event as string | undefined);
    const channel = message.channel as string | undefined;
    const isSnapshot = type === "book_snapshot" || (channel === "book" && type === "snapshot");
    const isDelta = type === "book_delta" || (channel === "book" && type === "delta");
    if (!isSnapshot && !isDelta) {
      return;
    }

    const marketId = (message.marketId as string) ?? (message.market as string);
    if (!marketId) {
      return;
    }

    if (isSnapshot) {
      const bids = parseSide(message.bids);
      const asks = parseSide(message.asks);
      const book = this.getBook(marketId);
      book.applySnapshot({
        marketId,
        bids: bids.map(([price, size]) => ({ price, size })),
        asks: asks.map(([price, size]) => ({ price, size })),
        timestamp: Date.now()
      });
      this.handlers.forEach((handler) => handler(marketId));
    } else if (isDelta) {
      const side = message.side as "bids" | "asks";
      const price = Number(message.price);
      const size = Number(message.size);
      if (!side || !Number.isFinite(price) || !Number.isFinite(size)) {
        return;
      }
      const book = this.getBook(marketId);
      book.applyDelta(side, price, size, Date.now());
      this.handlers.forEach((handler) => handler(marketId));
    }
  }
}
