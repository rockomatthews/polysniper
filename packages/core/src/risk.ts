import { RiskLimits, TradeFill } from "./types";

export type RiskState = {
  totalExposure: number;
  dailyPnl: number;
  ordersInLastMinute: number;
  lastOrderWindowStart: number;
  exposureByMarket: Record<string, number>;
};

export const createRiskState = (): RiskState => ({
  totalExposure: 0,
  dailyPnl: 0,
  ordersInLastMinute: 0,
  lastOrderWindowStart: Date.now(),
  exposureByMarket: {}
});

export const resetOrderWindowIfNeeded = (state: RiskState, now: number) => {
  if (now - state.lastOrderWindowStart >= 60_000) {
    state.lastOrderWindowStart = now;
    state.ordersInLastMinute = 0;
  }
};

export const recordOrder = (state: RiskState, now: number) => {
  resetOrderWindowIfNeeded(state, now);
  state.ordersInLastMinute += 1;
};

export const recordFill = (state: RiskState, fill: TradeFill) => {
  const notional = fill.price * fill.size;
  state.totalExposure += notional;
  state.exposureByMarket[fill.marketId] =
    (state.exposureByMarket[fill.marketId] ?? 0) + notional;
  state.dailyPnl -= fill.fee;
};

export const checkRisk = (
  state: RiskState,
  limits: RiskLimits,
  marketId: string,
  nextNotional: number,
  now: number
) => {
  resetOrderWindowIfNeeded(state, now);

  if (state.dailyPnl <= -limits.dailyLossLimit) {
    return { allowed: false, reason: "Daily loss limit reached" };
  }

  if (state.ordersInLastMinute >= limits.maxOrdersPerMinute) {
    return { allowed: false, reason: "Order rate limit reached" };
  }

  const marketExposure = state.exposureByMarket[marketId] ?? 0;
  if (marketExposure + nextNotional > limits.maxNotionalPerMarket) {
    return { allowed: false, reason: "Market exposure limit reached" };
  }

  if (state.totalExposure + nextNotional > limits.maxTotalExposure) {
    return { allowed: false, reason: "Total exposure limit reached" };
  }

  return { allowed: true, reason: "" };
};
