import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Telemetry } from "./telemetry";
import { logger } from "../utils/logger";

export type ControlState = {
  armed: boolean;
  liveTrading: boolean;
  updatedAt?: string;
};

export class ControlService {
  private client: SupabaseClient | null = null;
  private state: ControlState = { armed: false, liveTrading: false };
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private url: string,
    private key: string,
    private telemetry?: Telemetry,
    private pollMs = 5000
  ) {}

  init() {
    if (!this.url || !this.key) {
      logger.warn("Control service disabled (missing Supabase env)");
      return;
    }
    this.client = createClient(this.url, this.key);
  }

  getState() {
    return this.state;
  }

  async start() {
    if (!this.client) {
      return;
    }
    await this.refresh();
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
    if (!this.client) {
      return;
    }
    const { data, error } = await this.client
      .from("bot_controls")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.warn("Control fetch failed", { error: error.message });
      return;
    }

    let record = data;
    if (!record) {
      const { data: inserted, error: insertError } = await this.client
        .from("bot_controls")
        .insert({ armed: false, live_trading: false })
        .select("*")
        .single();
      if (insertError) {
        logger.warn("Control insert failed", { error: insertError.message });
        return;
      }
      record = inserted;
    }

    const nextState: ControlState = {
      armed: Boolean(record.armed),
      liveTrading: Boolean(record.live_trading),
      updatedAt: record.updated_at as string | undefined
    };

    const changed =
      nextState.armed !== this.state.armed ||
      nextState.liveTrading !== this.state.liveTrading;
    this.state = nextState;
    if (changed) {
      this.telemetry?.logEvent({
        event_type: "control_state",
        payload: nextState
      });
    }
  }
}
