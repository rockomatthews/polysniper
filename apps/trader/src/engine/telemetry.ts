import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger";

type BotEvent = {
  event_type: string;
  market_id?: string | null;
  payload?: Record<string, unknown> | null;
};

export class Telemetry {
  private client: SupabaseClient | null = null;

  constructor(private url: string, private key: string) {}

  init() {
    if (!this.url || !this.key) {
      logger.warn("Supabase telemetry disabled (missing env)");
      return;
    }
    this.client = createClient(this.url, this.key);
  }

  async logEvent(event: BotEvent) {
    if (!this.client) {
      return;
    }
    const { error } = await this.client.from("bot_events").insert({
      event_type: event.event_type,
      market_id: event.market_id ?? null,
      payload: event.payload ?? null
    });
    if (error) {
      logger.warn("Supabase log failed", { error: error.message });
    }
  }
}
