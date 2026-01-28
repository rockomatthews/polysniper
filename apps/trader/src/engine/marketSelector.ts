import { GammaClient } from "../integrations/gammaClient";
import { logger } from "../utils/logger";

export class MarketSelector {
  constructor(private gamma: GammaClient) {}

  async selectMarkets(preferredIds: string[]) {
    if (preferredIds.length > 0) {
      logger.info("Using configured market IDs", { count: preferredIds.length });
      return preferredIds;
    }

    const response = await this.gamma.listMarkets();
    const marketIds = response.markets?.slice(0, 25).map((market) => market.id) ?? [];
    logger.info("Selected default markets from Gamma", { count: marketIds.length });
    return marketIds;
  }
}
