"use client";

import { useEffect, useMemo, useState } from "react";
import { Paper, Stack, Typography } from "@mui/material";
import { supabaseClient } from "../lib/supabaseClient";

type BotEvent = {
  id: string;
  event_type: string;
  market_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const describeEvent = (event: BotEvent) => {
  const payload = event.payload ?? {};
  switch (event.event_type) {
    case "trader_started":
      return "Trader started and listening to markets.";
    case "heartbeat":
      return `Heartbeat: armed=${payload.armed} live=${payload.live_trading} shadow=${payload.shadow_mode}`;
    case "control_state":
      return `Control update: armed=${payload.armed} live=${payload.liveTrading} connected=${payload.connected}`;
    case "control_block":
      return `Blocked by control: ${payload.reason ?? "unknown"}`;
    case "opportunity":
      return `Opportunity: ${payload.type ?? "unknown"} edge=${payload.edge ?? "-"} size=${payload.size ?? "-"}`;
    case "shadow_trade":
      if (payload.legA && payload.legB) {
        const legA = payload.legA as Record<string, unknown>;
        const legB = payload.legB as Record<string, unknown>;
        return `Shadow trade: side=${payload.side ?? "-"} size=${payload.size ?? "-"} ${legA.marketId ?? "A"}@${legA.price ?? "-"} + ${legB.marketId ?? "B"}@${legB.price ?? "-"}`;
      }
      if (payload.buy && payload.sell) {
        const buy = payload.buy as Record<string, unknown>;
        const sell = payload.sell as Record<string, unknown>;
        return `Shadow trade (cross): buy ${buy.marketId ?? "-"}@${buy.price ?? "-"} sell ${sell.marketId ?? "-"}@${sell.price ?? "-"}`;
      }
      return `Shadow trade: size=${payload.size ?? "-"} side=${payload.side ?? "-"}`;
    case "paper_trade":
      if (payload.legA && payload.legB) {
        const legA = payload.legA as Record<string, unknown>;
        const legB = payload.legB as Record<string, unknown>;
        return `Paper trade: side=${payload.side ?? "-"} size=${payload.size ?? "-"} ${legA.marketId ?? "A"}@${legA.price ?? "-"} + ${legB.marketId ?? "B"}@${legB.price ?? "-"}`;
      }
      return `Paper trade: size=${payload.size ?? "-"} side=${payload.side ?? "-"}`;
    case "positions_snapshot":
      return `Balance: positions=${payload.count ?? "-"} value=$${Number(payload.currentValue ?? 0).toFixed(2)} pnl=$${Number(payload.cashPnl ?? 0).toFixed(2)}`;
    case "funds_insufficient":
      return `Not enough funds to trade: required=$${Number(payload.required ?? 0).toFixed(2)} current=$${Number(payload.currentValue ?? 0).toFixed(2)}`;
    case "order_attempt":
      return `Order attempt: ${payload.side ?? "-"} ${payload.size ?? "-"} @ ${payload.price ?? "-"}`;
    case "order_error":
      return `Order error: ${payload.error ?? "unknown"}`;
    case "execution_error":
      return `Execution error: ${payload.error ?? "unknown"}`;
    case "risk_block":
      return `Risk block: ${payload.reason ?? "unknown"}`;
    case "kill_switch":
      return "Kill switch engaged.";
    default:
      return event.event_type;
  }
};

export const ActivityFeed = () => {
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = supabaseClient();
        const { data, error: queryError } = await supabase
          .from("bot_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(25);
        if (queryError) {
          throw queryError;
        }
        setEvents(data ?? []);
        setError("");
      } catch (err) {
        setError((err as Error).message);
      }
    };

    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const rows = useMemo(() => events.map(describeEvent), [events]);

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={1}>
        <Typography variant="h6">Live Activity Feed</Typography>
        {error ? (
          <Typography color="error">{error}</Typography>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">
            No activity yet. Check that the trader is running and Supabase events are flowing.
          </Typography>
        ) : (
          rows.map((message, index) => (
            <Typography key={`${events[index]?.id ?? index}`} variant="body2">
              {message}
            </Typography>
          ))
        )}
      </Stack>
    </Paper>
  );
};
