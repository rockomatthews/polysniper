import { Telemetry } from "./telemetry";
import { logger } from "../utils/logger";

type Position = {
  currentValue?: number;
  cashPnl?: number;
  title?: string;
  outcome?: string;
  size?: number;
  curPrice?: number;
};

export class PositionsService {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private baseUrl: string,
    private user: string,
    private telemetry?: Telemetry,
    private pollMs = 15000,
    private limit = 200,
    private minBalanceUsdc = 25,
    private getControlState?: () => { armed: boolean; liveTrading: boolean; connected: boolean }
  ) {}

  start() {
    if (!this.user) {
      logger.warn("Positions polling disabled (missing DATA_API_USER)");
      return;
    }
    this.refresh().catch(() => undefined);
    this.timer = setInterval(() => {
      this.refresh().catch(() => undefined);
    }, this.pollMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async refresh() {
    const url = new URL("/positions", this.baseUrl);
    url.searchParams.set("user", this.user);
    url.searchParams.set("limit", String(this.limit));
    url.searchParams.set("sortBy", "CURRENT");
    url.searchParams.set("sortDirection", "DESC");

    const response = await fetch(url.toString());
    if (!response.ok) {
      const text = await response.text();
      logger.warn("Positions fetch failed", { status: response.status, text });
      return;
    }

    const positions = (await response.json()) as Position[];
    const totals = positions.reduce(
      (acc, position) => {
        acc.currentValue += Number(position.currentValue ?? 0);
        acc.cashPnl += Number(position.cashPnl ?? 0);
        acc.count += 1;
        return acc;
      },
      { currentValue: 0, cashPnl: 0, count: 0 }
    );

    const top = positions.slice(0, 5).map((position) => ({
      title: position.title,
      outcome: position.outcome,
      size: position.size,
      curPrice: position.curPrice,
      currentValue: position.currentValue
    }));

    this.telemetry?.logEvent({
      event_type: "positions_snapshot",
      payload: {
        user: this.user,
        currentValue: totals.currentValue,
        cashPnl: totals.cashPnl,
        count: totals.count,
        top
      }
    });

    const control = this.getControlState?.();
    if (control && control.liveTrading && totals.currentValue < this.minBalanceUsdc) {
      this.telemetry?.logEvent({
        event_type: "funds_insufficient",
        payload: {
          required: this.minBalanceUsdc,
          currentValue: totals.currentValue
        }
      });
    }
  }
}
