import { GammaClient } from "../integrations/gammaClient";
import { logger } from "../utils/logger";

type GammaMarket = Record<string, unknown>;

export type ComplementPair = {
  marketId: string;
  complementId: string;
};

export type EquivalenceGroup = {
  key: string;
  marketIds: string[];
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const extractTokenId = (token: Record<string, unknown>) => {
  return (
    (token.token_id as string | undefined) ??
    (token.tokenId as string | undefined) ??
    (token.id as string | undefined)
  );
};

const extractQuestion = (market: GammaMarket) => {
  return (
    (market.question as string | undefined) ??
    (market.title as string | undefined) ??
    (market.name as string | undefined)
  );
};

const extractMarketId = (market: GammaMarket) => {
  return (market.id as string | undefined) ?? (market.marketId as string | undefined);
};

const getTokenIds = (market: GammaMarket): string[] => {
  if (market.yesTokenId && market.noTokenId) {
    return [market.yesTokenId as string, market.noTokenId as string];
  }

  const rawTokens = market.tokens;
  if (Array.isArray(rawTokens)) {
    const ids = rawTokens
      .map((token) => (typeof token === "object" && token ? extractTokenId(token) : undefined))
      .filter((id): id is string => Boolean(id));
    if (ids.length >= 2) {
      return ids.slice(0, 2);
    }
  }

  const outcomes = market.outcomes;
  if (Array.isArray(outcomes)) {
    const ids = outcomes
      .map((token) => (typeof token === "object" && token ? extractTokenId(token) : undefined))
      .filter((id): id is string => Boolean(id));
    if (ids.length >= 2) {
      return ids.slice(0, 2);
    }
  }

  return [];
};

export class PairDiscovery {
  constructor(private gamma: GammaClient) {}

  async discover() {
    const response = await this.gamma.listMarkets();
    const markets = (response as Record<string, unknown>).markets;
    if (!Array.isArray(markets)) {
      logger.warn("Gamma markets missing");
      return { pairs: [], groups: [], marketIds: [] };
    }

    const complementPairs: ComplementPair[] = [];
    const groupsMap = new Map<string, Set<string>>();
    const marketIds: string[] = [];

    markets.forEach((market) => {
      if (typeof market !== "object" || market === null) {
        return;
      }
      const marketId = extractMarketId(market as GammaMarket);
      if (marketId) {
        marketIds.push(marketId);
      }
      const question = extractQuestion(market as GammaMarket);
      if (question && marketId) {
        const key = normalize(question);
        if (!groupsMap.has(key)) {
          groupsMap.set(key, new Set());
        }
        groupsMap.get(key)!.add(marketId);
      }

      const tokenIds = getTokenIds(market as GammaMarket);
      if (tokenIds.length >= 2) {
        complementPairs.push({ marketId: tokenIds[0], complementId: tokenIds[1] });
      }
    });

    const groups: EquivalenceGroup[] = Array.from(groupsMap.entries())
      .map(([key, set]) => ({ key, marketIds: Array.from(set) }))
      .filter((group) => group.marketIds.length > 1);

    return { pairs: complementPairs, groups, marketIds };
  }
}
