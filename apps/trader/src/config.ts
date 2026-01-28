const required = (key: string, fallback = ""): string => {
  const value = process.env[key] ?? fallback;
  if (!value && fallback === "") {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const asNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value: string, fallback: boolean) => {
  if (!value) {
    return fallback;
  }
  return ["true", "1", "yes", "y"].includes(value.toLowerCase());
};

export const config = {
  clobApiBase: required("CLOB_API_BASE", "https://clob.polymarket.com"),
  clobWsUrl: required("CLOB_WS_URL", "wss://ws-subscriptions-clob.polymarket.com"),
  gammaApiBase: required("GAMMA_API_BASE", "https://gamma-api.polymarket.com"),
  dataApiBase: required("DATA_API_BASE", "https://data-api.polymarket.com"),
  clobApiKey: process.env.CLOB_API_KEY ?? "",
  clobApiSecret: process.env.CLOB_API_SECRET ?? "",
  clobApiPassphrase: process.env.CLOB_API_PASSPHRASE ?? "",
  clobAuthHeadersJson: process.env.CLOB_AUTH_HEADERS ?? "",
  clobWsSubscribeJson: process.env.CLOB_WS_SUBSCRIBE_PAYLOAD ?? "",
  marketIds: (process.env.MARKET_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
  complementPairs: (process.env.COMPLEMENT_PAIRS ?? "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean),
  autoDiscoverPairs: asBoolean(process.env.AUTO_DISCOVER_PAIRS ?? "", true),
  crossMarketEnabled: asBoolean(process.env.CROSS_MARKET_ENABLED ?? "", true),
  spreadMinBps: asNumber(process.env.SPREAD_MIN_BPS ?? "", 20),
  minEdgeBps: asNumber(process.env.MIN_EDGE_BPS ?? "", 5),
  orderSize: asNumber(process.env.ORDER_SIZE ?? "", 5),
  cooldownMs: asNumber(process.env.COOLDOWN_MS ?? "", 1500),
  paperTrading: asBoolean(process.env.PAPER_TRADING ?? "", true),
  orderTimeInForce: process.env.ORDER_TIME_IN_FORCE ?? "",
  feeBps: asNumber(process.env.FEE_BPS ?? "", 100),
  slippageBps: asNumber(process.env.SLIPPAGE_BPS ?? "", 5),
  latencyBps: asNumber(process.env.LATENCY_BPS ?? "", 5),
  staleBookMs: asNumber(process.env.STALE_BOOK_MS ?? "", 1500),
  maxConsecutiveErrors: asNumber(process.env.MAX_CONSECUTIVE_ERRORS ?? "", 5),
  adaptiveSpread: asBoolean(process.env.ADAPTIVE_SPREAD ?? "", true),
  adaptiveAlpha: asNumber(process.env.ADAPTIVE_ALPHA ?? "", 0.2),
  adaptiveMultiplier: asNumber(process.env.ADAPTIVE_MULTIPLIER ?? "", 1.4),
  shadowMode: asBoolean(process.env.SHADOW_MODE ?? "", true),
  autoTuner: asBoolean(process.env.AUTO_TUNER ?? "", true),
  tunerWindow: asNumber(process.env.TUNER_WINDOW ?? "", 40),
  tunerStep: asNumber(process.env.TUNER_STEP ?? "", 0.05),
  tunerMinMultiplier: asNumber(process.env.TUNER_MIN_MULTIPLIER ?? "", 1.1),
  tunerMaxMultiplier: asNumber(process.env.TUNER_MAX_MULTIPLIER ?? "", 2.5),
  controlPollMs: asNumber(process.env.CONTROL_POLL_MS ?? "", 5000),
  maxNotionalPerMarket: asNumber(process.env.MAX_NOTIONAL_PER_MARKET ?? "", 250),
  maxTotalExposure: asNumber(process.env.MAX_TOTAL_EXPOSURE ?? "", 1000),
  dailyLossLimit: asNumber(process.env.DAILY_LOSS_LIMIT ?? "", 200),
  maxOrdersPerMinute: asNumber(process.env.MAX_ORDERS_PER_MIN ?? "", 20),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? "",
  dataApiUser: process.env.DATA_API_USER ?? "",
  positionsPollMs: asNumber(process.env.POSITIONS_POLL_MS ?? "", 15000),
  positionsLimit: asNumber(process.env.POSITIONS_LIMIT ?? "", 200),
  minBalanceUsdc: asNumber(process.env.MIN_BALANCE_USDC ?? "", 25)
};
