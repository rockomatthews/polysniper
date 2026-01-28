"use client";

import { useEffect, useState } from "react";
import { Grid } from "@mui/material";
import { StatCard } from "./StatCard";
import { supabaseClient } from "../lib/supabaseClient";

type BotEvent = {
  event_type: string;
  created_at: string;
};

type Metrics = {
  opportunities: number;
  shadowTrades: number;
  riskBlocks: number;
  executionErrors: number;
  killSwitches: number;
};

const emptyMetrics: Metrics = {
  opportunities: 0,
  shadowTrades: 0,
  riskBlocks: 0,
  executionErrors: 0,
  killSwitches: 0
};

export const ShadowMetrics = () => {
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = supabaseClient();
        const { data, error: queryError } = await supabase
          .from("bot_events")
          .select("event_type, created_at")
          .order("created_at", { ascending: false })
          .limit(200);
        if (queryError) {
          throw queryError;
        }
        const rows = (data ?? []) as BotEvent[];
        const next = { ...emptyMetrics };
        rows.forEach((event) => {
          if (event.event_type === "opportunity") next.opportunities += 1;
          if (event.event_type === "shadow_trade") next.shadowTrades += 1;
          if (event.event_type === "risk_block") next.riskBlocks += 1;
          if (event.event_type === "execution_error") next.executionErrors += 1;
          if (event.event_type === "kill_switch") next.killSwitches += 1;
        });
        setMetrics(next);
        setError("");
      } catch (err) {
        setError((err as Error).message);
      }
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <Grid container spacing={3}>
        <Grid xs={12}>
          <StatCard label="Shadow Metrics Error" value="-" helper={error} />
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid xs={12} md={3}>
        <StatCard label="Opportunities" value={`${metrics.opportunities}`} helper="Last 200 events" />
      </Grid>
      <Grid xs={12} md={3}>
        <StatCard label="Shadow Trades" value={`${metrics.shadowTrades}`} helper="Hit rate proxy" />
      </Grid>
      <Grid xs={12} md={2}>
        <StatCard label="Risk Blocks" value={`${metrics.riskBlocks}`} />
      </Grid>
      <Grid xs={12} md={2}>
        <StatCard label="Exec Errors" value={`${metrics.executionErrors}`} />
      </Grid>
      <Grid xs={12} md={2}>
        <StatCard label="Kill Switch" value={`${metrics.killSwitches}`} />
      </Grid>
    </Grid>
  );
};
