import { OrderBookLevel, OrderBookSnapshot } from "./types";

type SideLevels = Map<number, number>;

const toSortedLevels = (levels: SideLevels, desc: boolean): OrderBookLevel[] => {
  const entries = Array.from(levels.entries());
  entries.sort((a, b) => (desc ? b[0] - a[0] : a[0] - b[0]));
  return entries.map(([price, size]) => ({ price, size }));
};

export class OrderBook {
  private bids: SideLevels = new Map();
  private asks: SideLevels = new Map();
  private lastTimestamp = 0;

  applySnapshot(snapshot: OrderBookSnapshot) {
    this.bids.clear();
    this.asks.clear();
    snapshot.bids.forEach((level) => this.bids.set(level.price, level.size));
    snapshot.asks.forEach((level) => this.asks.set(level.price, level.size));
    this.lastTimestamp = snapshot.timestamp;
  }

  applyDelta(side: "bids" | "asks", price: number, size: number, timestamp: number) {
    const book = side === "bids" ? this.bids : this.asks;
    if (size <= 0) {
      book.delete(price);
    } else {
      book.set(price, size);
    }
    this.lastTimestamp = Math.max(this.lastTimestamp, timestamp);
  }

  bestBid(): OrderBookLevel | null {
    const levels = toSortedLevels(this.bids, true);
    return levels[0] ?? null;
  }

  bestAsk(): OrderBookLevel | null {
    const levels = toSortedLevels(this.asks, false);
    return levels[0] ?? null;
  }

  midPrice(): number | null {
    const bid = this.bestBid();
    const ask = this.bestAsk();
    if (!bid || !ask) {
      return null;
    }
    return (bid.price + ask.price) / 2;
  }

  spreadBps(): number | null {
    const bid = this.bestBid();
    const ask = this.bestAsk();
    if (!bid || !ask) {
      return null;
    }
    const mid = (bid.price + ask.price) / 2;
    return ((ask.price - bid.price) / mid) * 10000;
  }

  isStale(maxAgeMs: number, now: number): boolean {
    return now - this.lastTimestamp > maxAgeMs;
  }

  snapshot(marketId: string, now: number): OrderBookSnapshot {
    return {
      marketId,
      bids: toSortedLevels(this.bids, true),
      asks: toSortedLevels(this.asks, false),
      timestamp: now
    };
  }
}
