import "dotenv/config";

import { config } from "./config";
import { ClobClient } from "./integrations/clobClient";
import { GammaClient } from "./integrations/gammaClient";
import { MarketSelector } from "./engine/marketSelector";
import { OrderManager } from "./engine/orderManager";
import { RiskEngine } from "./engine/riskEngine";
import { WsClient } from "./engine/wsClient";
import { logger } from "./utils/logger";
import { Telemetry } from "./engine/telemetry";
import { MarketDataService } from "./engine/marketDataService";
import { OpportunityEngine } from "./engine/opportunityEngine";
import { ExecutionService } from "./engine/executionService";
import { PairDiscovery } from "./engine/pairDiscovery";
import { AutoTuner } from "./engine/autoTuner";
import { ControlService } from "./engine/controlService";
import { PositionsService } from "./engine/positionsService";

const parseHeaders = (json: string) => {
  if (!json) {
    return null;
  }
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch (error) {
    throw new Error(`Invalid CLOB_AUTH_HEADERS: ${(error as Error).message}`);
  }
};

const resolveAuthHeaders = () => {
  const parsed = parseHeaders(config.clobAuthHeadersJson);
  if (parsed) {
    return parsed;
  }
  if (!config.clobApiKey) {
    return {};
  }
  return {
    "X-API-KEY": config.clobApiKey,
    "X-API-SECRET": config.clobApiSecret,
    "X-API-PASSPHRASE": config.clobApiPassphrase
  };
};

const resolveWsSubscribePayload = (marketIds: string[]) => {
  if (config.clobWsSubscribeJson) {
    try {
      return JSON.parse(config.clobWsSubscribeJson);
    } catch (error) {
      throw new Error(`Invalid CLOB_WS_SUBSCRIBE_PAYLOAD: ${(error as Error).message}`);
    }
  }
  return {
    type: "subscribe",
    channels: [
      {
        name: "book",
        marketIds
      }
    ]
  };
};

const main = async () => {
  const gamma = new GammaClient(config.gammaApiBase);
  const selector = new MarketSelector(gamma);
  const initialMarkets = await selector.selectMarkets(config.marketIds);

  let discoveredPairs: { marketId: string; complementId: string }[] = [];
  let equivalenceGroups: { key: string; marketIds: string[] }[] = [];
  let discoveredMarketIds: string[] = [];

  if (config.autoDiscoverPairs || config.crossMarketEnabled) {
    try {
      const discovery = await new PairDiscovery(gamma).discover();
      discoveredPairs = discovery.pairs;
      equivalenceGroups = discovery.groups;
      discoveredMarketIds = discovery.marketIds;
      logger.info("Gamma discovery", {
        pairs: discoveredPairs.length,
        groups: equivalenceGroups.length,
        markets: discoveredMarketIds.length
      });
    } catch (error) {
      logger.warn("Gamma discovery failed", { error: (error as Error).message });
    }
  }

  const manualPairIds = config.complementPairs
    .flatMap((pair) => pair.split(":").map((id) => id.trim()))
    .filter(Boolean);
  const pairIds = Array.from(
    new Set([
      ...manualPairIds,
      ...discoveredPairs.flatMap((pair) => [pair.marketId, pair.complementId])
    ])
  );
  const marketIds = Array.from(
    new Set([...initialMarkets, ...pairIds, ...discoveredMarketIds])
  );

  const telemetry = new Telemetry(config.supabaseUrl, config.supabaseServiceKey);
  telemetry.init();

  const controlService = new ControlService(
    config.supabaseUrl,
    config.supabaseServiceKey,
    telemetry,
    config.controlPollMs
  );
  controlService.init();
  await controlService.start();

  const positionsService = new PositionsService(
    config.dataApiBase,
    config.dataApiUser,
    telemetry,
    config.positionsPollMs,
    config.positionsLimit
  );
  positionsService.start();

  const clob = new ClobClient(config.clobApiBase, resolveAuthHeaders);
  const orderManager = new OrderManager(clob, telemetry);
  const riskEngine = new RiskEngine({
    maxNotionalPerMarket: config.maxNotionalPerMarket,
    maxTotalExposure: config.maxTotalExposure,
    dailyLossLimit: config.dailyLossLimit,
    maxOrdersPerMinute: config.maxOrdersPerMinute
  });

  const execution = new ExecutionService(
    {
      paperTrading: config.paperTrading,
      timeInForce: config.orderTimeInForce || undefined,
      orderType: config.orderTimeInForce ? "limit" : undefined,
      maxConsecutiveErrors: config.maxConsecutiveErrors,
      shadowMode: config.shadowMode
    },
    orderManager,
    telemetry
  );

  const ws = new WsClient(config.clobWsUrl);
  const marketData = new MarketDataService(clob, ws, config.staleBookMs);
  await marketData.bootstrap(marketIds);

  const manualPairs = config.complementPairs
    .map((pair) => pair.split(":").map((id) => id.trim()))
    .filter((parts) => parts.length === 2)
    .map(([marketId, complementId]) => ({ marketId, complementId }));
  const pairs = config.autoDiscoverPairs
    ? [...manualPairs, ...discoveredPairs]
    : manualPairs;
  const groups = config.crossMarketEnabled ? equivalenceGroups : [];

  const opportunityEngine = new OpportunityEngine(
    {
      feeBps: config.feeBps,
      slippageBps: config.slippageBps,
      latencyBps: config.latencyBps,
      orderSize: config.orderSize,
      adaptiveSpread: config.adaptiveSpread,
      adaptiveAlpha: config.adaptiveAlpha,
      adaptiveMultiplier: config.adaptiveMultiplier
    },
    pairs,
    groups,
    (marketId) => marketData.getBook(marketId),
    riskEngine,
    execution,
    telemetry
  );

  const autoTuner = config.autoTuner
    ? new AutoTuner(
        {
          window: config.tunerWindow,
          step: config.tunerStep,
          minMultiplier: config.tunerMinMultiplier,
          maxMultiplier: config.tunerMaxMultiplier
        },
        opportunityEngine
      )
    : undefined;

  execution.setAutoTuner(autoTuner);
  execution.setControlService(controlService);
  opportunityEngine.setAutoTuner(autoTuner);

  ws.onMessage((message) => {
    if (typeof message !== "object" || message === null) {
      return;
    }
    marketData.handleWsMessage(message as Record<string, unknown>);
  });

  marketData.onBookUpdate((marketId) => {
    if (marketData.isStale(marketId)) {
      return;
    }
    opportunityEngine.onBookUpdate(marketId);
  });

  ws.connect();
  ws.send(resolveWsSubscribePayload(marketIds));
  logger.info("Trader started", {
    markets: marketIds.length,
    pairs: pairs.length,
    groups: groups.length
  });
  telemetry.logEvent({ event_type: "trader_started", payload: { markets: marketIds } });

  setInterval(() => {
    const control = controlService.getState();
    telemetry.logEvent({
      event_type: "heartbeat",
      payload: {
        armed: control.armed,
        live_trading: control.liveTrading,
        shadow_mode: config.shadowMode,
        paper_trading: config.paperTrading,
        markets: marketIds.length,
        pairs: pairs.length,
        groups: groups.length
      }
    });
  }, 10_000);
};

main().catch((error) => {
  logger.error("Trader failed to start", { error: (error as Error).message });
  process.exit(1);
});
