export type Side = "buy" | "sell";

export type Market = {
  id: string;
  question: string;
  active: boolean;
  yesTokenId?: string;
  noTokenId?: string;
};

export type OrderBookLevel = {
  price: number;
  size: number;
};

export type OrderBookSnapshot = {
  marketId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
};

export type TradeFill = {
  marketId: string;
  side: Side;
  price: number;
  size: number;
  fee: number;
  timestamp: number;
};

export type Position = {
  marketId: string;
  size: number;
  avgPrice: number;
  unrealizedPnl: number;
};

export type RiskLimits = {
  maxNotionalPerMarket: number;
  maxTotalExposure: number;
  dailyLossLimit: number;
  maxOrdersPerMinute: number;
};
