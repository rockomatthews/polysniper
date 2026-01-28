import { OrderBook, calculateSpreadBps } from "@polysniper/core";
import { OrderManager } from "../engine/orderManager";
import { RiskEngine } from "../engine/riskEngine";
import { Telemetry } from "../engine/telemetry";
import { logger } from "../utils/logger";

type StrategyConfig = {
  spreadMinBps: number;
  minEdgeBps: number;
  orderSize: number;
  cooldownMs: number;
};

export class SpreadArbStrategy {
  private books = new Map<string, OrderBook>();
  private lastActionAt = new Map<string, number>();

  constructor(
    private config: StrategyConfig,
    private orderManager: OrderManager,
    private riskEngine: RiskEngine,
    private telemetry?: Telemetry
  ) {}

  ensureBook(marketId: string) {
    if (!this.books.has(marketId)) {
      this.books.set(marketId, new OrderBook());
    }
    return this.books.get(marketId)!;
  }

  applySnapshot(marketId: string, bids: Array<[number, number]>, asks: Array<[number, number]>) {
    const book = this.ensureBook(marketId);
    book.applySnapshot({
      marketId,
      bids: bids.map(([price, size]) => ({ price, size })),
      asks: asks.map(([price, size]) => ({ price, size })),
      timestamp: Date.now()
    });
    this.tryTrade(marketId);
  }

  applyDelta(marketId: string, side: "bids" | "asks", price: number, size: number) {
    const book = this.ensureBook(marketId);
    book.applyDelta(side, price, size, Date.now());
    this.tryTrade(marketId);
  }

  private cooldownOk(marketId: string) {
    const now = Date.now();
    const last = this.lastActionAt.get(marketId) ?? 0;
    if (now - last < this.config.cooldownMs) {
      return false;
    }
    this.lastActionAt.set(marketId, now);
    return true;
  }

  private async tryTrade(marketId: string) {
    const book = this.books.get(marketId);
    if (!book) {
      return;
    }

    const bid = book.bestBid();
    const ask = book.bestAsk();
    if (!bid || !ask) {
      return;
    }

    const spreadBps = calculateSpreadBps(bid.price, ask.price);
    if (spreadBps < this.config.spreadMinBps) {
      return;
    }

    if (!this.cooldownOk(marketId)) {
      return;
    }

    const buyEdgeBps = ((ask.price - bid.price) / ask.price) * 10000;
    if (buyEdgeBps < this.config.minEdgeBps) {
      return;
    }

    const notional = this.config.orderSize * bid.price;
    const riskCheck = this.riskEngine.canPlace(marketId, notional);
    if (!riskCheck.allowed) {
      logger.warn("Risk blocked order", { marketId, reason: riskCheck.reason });
      this.telemetry?.logEvent({
        event_type: "risk_block",
        market_id: marketId,
        payload: { reason: riskCheck.reason, notional }
      });
      return;
    }

    try {
      this.riskEngine.recordOrder();
      await this.orderManager.placeOrder({
        marketId,
        side: "buy",
        price: bid.price,
        size: this.config.orderSize
      });
    } catch (error) {
      logger.error("Order failed", { marketId, error: (error as Error).message });
      this.telemetry?.logEvent({
        event_type: "order_error",
        market_id: marketId,
        payload: { error: (error as Error).message }
      });
    }
  }
}
