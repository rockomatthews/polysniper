import { OrderBook } from "@polysniper/core";
import { RiskEngine } from "./riskEngine";
import { ExecutionService } from "./executionService";
import { Telemetry } from "./telemetry";
import { EquivalenceGroup } from "./pairDiscovery";
import { AutoTuner } from "./autoTuner";
import { logger } from "../utils/logger";

type ComplementPair = {
  marketId: string;
  complementId: string;
};

type OpportunityConfig = {
  feeBps: number;
  slippageBps: number;
  latencyBps: number;
  orderSize: number;
  adaptiveSpread: boolean;
  adaptiveAlpha: number;
  adaptiveMultiplier: number;
};

export class OpportunityEngine {
  private adaptiveSpreadBps = new Map<string, number>();
  private adaptiveMultiplier: number;

  constructor(
    private config: OpportunityConfig,
    private pairs: ComplementPair[],
    private groups: EquivalenceGroup[],
    private bookProvider: (marketId: string) => OrderBook,
    private risk: RiskEngine,
    private execution: ExecutionService,
    private telemetry?: Telemetry,
    private autoTuner?: AutoTuner
  ) {
    this.adaptiveMultiplier = config.adaptiveMultiplier;
  }

  setAutoTuner(autoTuner: AutoTuner | undefined) {
    this.autoTuner = autoTuner;
  }

  onBookUpdate(marketId: string) {
    const related = this.pairs.filter(
      (pair) => pair.marketId === marketId || pair.complementId === marketId
    );
    related.forEach((pair) => this.evaluateComplement(pair));

    const groupMatches = this.groups.filter((group) => group.marketIds.includes(marketId));
    groupMatches.forEach((group) => this.evaluateCrossMarket(group));
  }

  private evaluateComplement(pair: ComplementPair) {
    const bookA = this.bookProvider(pair.marketId);
    const bookB = this.bookProvider(pair.complementId);
    const bidA = bookA.bestBid();
    const bidB = bookB.bestBid();
    const askA = bookA.bestAsk();
    const askB = bookB.bestAsk();

    if (!bidA || !bidB || !askA || !askB) {
      return;
    }

    if (this.config.adaptiveSpread) {
      this.updateAdaptiveSpread(pair.marketId, bidA.price, askA.price);
      this.updateAdaptiveSpread(pair.complementId, bidB.price, askB.price);
    }

    const costBps = this.config.feeBps + this.config.slippageBps + this.config.latencyBps;
    const adaptiveA = this.getAdaptiveBps(pair.marketId);
    const adaptiveB = this.getAdaptiveBps(pair.complementId);
    const adaptive = Math.max(adaptiveA, adaptiveB);
    const threshold = (costBps + adaptive) / 10000;

    const sellEdge = bidA.price + bidB.price - (1 + threshold);
    if (sellEdge > 0) {
      const size = this.config.orderSize;
      const notional = size * (bidA.price + bidB.price);
      const riskCheck = this.risk.canPlace(pair.marketId, notional);
      if (!riskCheck.allowed) {
        this.telemetry?.logEvent({
          event_type: "risk_block",
          market_id: pair.marketId,
          payload: { reason: riskCheck.reason, notional }
        });
      this.autoTuner?.recordRiskBlock();
        return;
      }
      logger.info("Complement arb (sell)", { pair, sellEdge, size });
    this.telemetry?.logEvent({
        event_type: "opportunity",
        market_id: pair.marketId,
        payload: { type: "complement_sell", edge: sellEdge, size }
      });
      this.autoTuner?.recordOpportunity();
      this.execution.executePair({
        side: "sell",
        size,
        legA: { marketId: pair.marketId, price: bidA.price },
        legB: { marketId: pair.complementId, price: bidB.price }
      });
      return;
    }

    const buyEdge = (1 - threshold) - (askA.price + askB.price);
    if (buyEdge > 0) {
      const size = this.config.orderSize;
      const notional = size * (askA.price + askB.price);
      const riskCheck = this.risk.canPlace(pair.marketId, notional);
      if (!riskCheck.allowed) {
        this.telemetry?.logEvent({
          event_type: "risk_block",
          market_id: pair.marketId,
          payload: { reason: riskCheck.reason, notional }
        });
      this.autoTuner?.recordRiskBlock();
        return;
      }
      logger.info("Complement arb (buy)", { pair, buyEdge, size });
    this.telemetry?.logEvent({
        event_type: "opportunity",
        market_id: pair.marketId,
        payload: { type: "complement_buy", edge: buyEdge, size }
      });
      this.autoTuner?.recordOpportunity();
      this.execution.executePair({
        side: "buy",
        size,
        legA: { marketId: pair.marketId, price: askA.price },
        legB: { marketId: pair.complementId, price: askB.price }
      });
    }
  }

  private evaluateCrossMarket(group: EquivalenceGroup) {
    const books = group.marketIds.map((marketId) => ({
      marketId,
      book: this.bookProvider(marketId)
    }));

    const bids = books
      .map(({ marketId, book }) => {
        const bid = book.bestBid();
        if (!bid) {
          return null;
        }
        if (this.config.adaptiveSpread) {
          this.updateAdaptiveSpread(marketId, bid.price, book.bestAsk()?.price ?? bid.price);
        }
        return { marketId, price: bid.price };
      })
      .filter((entry): entry is { marketId: string; price: number } => Boolean(entry));

    const asks = books
      .map(({ marketId, book }) => {
        const ask = book.bestAsk();
        if (!ask) {
          return null;
        }
        if (this.config.adaptiveSpread) {
          this.updateAdaptiveSpread(marketId, book.bestBid()?.price ?? ask.price, ask.price);
        }
        return { marketId, price: ask.price };
      })
      .filter((entry): entry is { marketId: string; price: number } => Boolean(entry));

    if (bids.length === 0 || asks.length === 0) {
      return;
    }

    const bestBid = bids.reduce((best, next) => (next.price > best.price ? next : best));
    const bestAsk = asks.reduce((best, next) => (next.price < best.price ? next : best));

    if (bestBid.marketId === bestAsk.marketId) {
      return;
    }

    const adaptiveBid = this.getAdaptiveBps(bestBid.marketId);
    const adaptiveAsk = this.getAdaptiveBps(bestAsk.marketId);
    const thresholdBps =
      this.config.feeBps + this.config.slippageBps + this.config.latencyBps + Math.max(adaptiveBid, adaptiveAsk);

    const edge = (bestBid.price - bestAsk.price) - thresholdBps / 10000;
    if (edge <= 0) {
      return;
    }

    const notional = this.config.orderSize * (bestBid.price + bestAsk.price);
    const riskCheck = this.risk.canPlace(bestAsk.marketId, notional);
    if (!riskCheck.allowed) {
      this.telemetry?.logEvent({
        event_type: "risk_block",
        market_id: bestAsk.marketId,
        payload: { reason: riskCheck.reason, notional }
      });
      this.autoTuner?.recordRiskBlock();
      return;
    }

    logger.info("Cross-market arb", {
      key: group.key,
      buy: bestAsk,
      sell: bestBid,
      edge
    });
    this.telemetry?.logEvent({
      event_type: "opportunity",
      market_id: bestAsk.marketId,
      payload: { type: "cross_market", edge, buy: bestAsk, sell: bestBid }
    });
    this.autoTuner?.recordOpportunity();
    this.execution.executeCross({
      buy: bestAsk,
      sell: bestBid,
      size: this.config.orderSize
    });
  }

  getAdaptiveMultiplier() {
    return this.adaptiveMultiplier;
  }

  setAdaptiveMultiplier(multiplier: number) {
    this.adaptiveMultiplier = multiplier;
  }

  private ensureMultiplier() {
    if (!Number.isFinite(this.adaptiveMultiplier)) {
      this.adaptiveMultiplier = this.config.adaptiveMultiplier;
    }
  }

  private updateAdaptiveSpread(marketId: string, bid: number, ask: number) {
    if (bid <= 0 || ask <= 0) {
      return;
    }
    const mid = (bid + ask) / 2;
    const spreadBps = ((ask - bid) / mid) * 10000;
    const prev = this.adaptiveSpreadBps.get(marketId) ?? spreadBps;
    const next = prev + this.config.adaptiveAlpha * (spreadBps - prev);
    this.adaptiveSpreadBps.set(marketId, next);
  }

  private getAdaptiveBps(marketId: string) {
    const spread = this.adaptiveSpreadBps.get(marketId) ?? 0;
    this.ensureMultiplier();
    return spread * this.adaptiveMultiplier;
  }
}
