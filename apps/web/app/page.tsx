"use client";

import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Switch,
  Typography
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { useEffect, useState } from "react";
import { StatCard } from "../components/StatCard";
import { EventsTable } from "../components/EventsTable";
import { ShadowMetrics } from "../components/ShadowMetrics";
import { ActivityFeed } from "../components/ActivityFeed";
import { supabaseClient } from "../lib/supabaseClient";

export default function Home() {
  const [armed, setArmed] = useState(false);
  const [liveTrading, setLiveTrading] = useState(false);
  const [connected, setConnected] = useState(true);
  const [controlError, setControlError] = useState("");
  const [balanceValue, setBalanceValue] = useState<string>("-");
  const [balancePnl, setBalancePnl] = useState<string>("-");

  const loadControl = async () => {
    try {
      console.info("Control load requested");
      const response = await fetch("/api/control");
      console.info("Control load response", response.status);
      if (!response.ok) {
        throw new Error("Failed to load control state");
      }
      const data = await response.json();
      console.info("Control load payload", data);
      setArmed(Boolean(data.armed));
      setLiveTrading(Boolean(data.live_trading));
      setConnected(data.connected === undefined ? true : Boolean(data.connected));
      setControlError("");
    } catch (error) {
      console.error("Control load failed", error);
      setControlError((error as Error).message);
    }
  };

  const updateControl = async (next: {
    armed?: boolean;
    live_trading?: boolean;
    connected?: boolean;
  }) => {
    try {
      console.info("Control update requested", next);
      const response = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          armed: next.armed ?? armed,
          live_trading: next.live_trading ?? liveTrading,
          connected: next.connected ?? connected
        })
      });
      console.info("Control update response", response.status);
      if (!response.ok) {
        throw new Error("Failed to update control state");
      }
      const data = await response.json();
      console.info("Control update payload", data);
      setArmed(Boolean(data.armed));
      setLiveTrading(Boolean(data.live_trading));
      setConnected(data.connected === undefined ? true : Boolean(data.connected));
      setControlError("");
    } catch (error) {
      console.error("Control update failed", error);
      setControlError((error as Error).message);
    }
  };

  useEffect(() => {
    console.info("Control polling start");
    loadControl();
    const interval = setInterval(loadControl, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const supabase = supabaseClient();
        const { data, error } = await supabase
          .from("bot_events")
          .select("payload, created_at")
          .eq("event_type", "positions_snapshot")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) {
          throw error;
        }
        const payload = (data?.payload ?? {}) as Record<string, unknown>;
        const value = Number(payload.currentValue ?? NaN);
        const pnl = Number(payload.cashPnl ?? NaN);
        if (Number.isFinite(value)) {
          setBalanceValue(`$${value.toFixed(2)}`);
        }
        if (Number.isFinite(pnl)) {
          setBalancePnl(`$${pnl.toFixed(2)}`);
        }
      } catch (error) {
        setBalanceValue("-");
        setBalancePnl("-");
      }
    };

    loadBalance();
    const interval = setInterval(loadBalance, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      label: "Live Status",
      value: connected
        ? armed
          ? liveTrading
            ? "ARMED"
            : "ARMED (SHADOW)"
          : "DISARMED"
        : "DISCONNECTED",
      helper: connected
        ? liveTrading
          ? "Live trading enabled"
          : "Shadow or paper mode"
        : "Trader disconnected"
    },
    { label: "Balance", value: balanceValue, helper: "Portfolio value (USDC)" },
    { label: "Cash PnL", value: balancePnl, helper: "Data API cash PnL" },
    { label: "Markets Watched", value: "18", helper: "Top liquidity markets" }
  ];

  return (
    <Container sx={{ py: 6 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h3" gutterBottom>
            Polysniper Control Plane
          </Typography>
          <Typography color="text.secondary">
            Live spread/latency arb execution with risk limits and manual overrides.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {stats.map((stat) => (
            <Grid size={{ xs: 12, md: 3 }} key={stat.label}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        <ShadowMetrics />

        <ActivityFeed />

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Strategy Controls</Typography>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Switch
                    checked={liveTrading}
                    onChange={(event) => updateControl({ live_trading: event.target.checked })}
                  />
                  <Typography>Enable live trading</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Switch
                    checked={connected}
                    onChange={(event) =>
                      updateControl({ connected: event.target.checked, armed: false })
                    }
                  />
                  <Typography>Trader connected</Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" onClick={() => updateControl({ armed: true })}>
                    Arm Strategy
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => updateControl({ armed: false })}
                  >
                    Emergency Stop
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => updateControl({ connected: false, armed: false })}
                  >
                    Disconnect
                  </Button>
                </Stack>
                {controlError ? (
                  <Typography color="error">{controlError}</Typography>
                ) : null}
              </Stack>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Risk Limits</Typography>
                <Typography color="text.secondary">
                  Max notional per market: $250
                </Typography>
                <Typography color="text.secondary">
                  Max total exposure: $1,000
                </Typography>
                <Typography color="text.secondary">Daily loss limit: $200</Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <EventsTable />
      </Stack>
    </Container>
  );
}
