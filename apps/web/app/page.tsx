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

export default function Home() {
  const [armed, setArmed] = useState(false);
  const [liveTrading, setLiveTrading] = useState(false);
  const [controlError, setControlError] = useState("");

  const loadControl = async () => {
    try {
      const response = await fetch("/api/control");
      if (!response.ok) {
        throw new Error("Failed to load control state");
      }
      const data = await response.json();
      setArmed(Boolean(data.armed));
      setLiveTrading(Boolean(data.live_trading));
      setControlError("");
    } catch (error) {
      setControlError((error as Error).message);
    }
  };

  const updateControl = async (next: { armed?: boolean; live_trading?: boolean }) => {
    try {
      const response = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          armed: next.armed ?? armed,
          live_trading: next.live_trading ?? liveTrading
        })
      });
      if (!response.ok) {
        throw new Error("Failed to update control state");
      }
      const data = await response.json();
      setArmed(Boolean(data.armed));
      setLiveTrading(Boolean(data.live_trading));
      setControlError("");
    } catch (error) {
      setControlError((error as Error).message);
    }
  };

  useEffect(() => {
    loadControl();
    const interval = setInterval(loadControl, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      label: "Live Status",
      value: armed ? (liveTrading ? "ARMED" : "ARMED (SHADOW)") : "DISARMED",
      helper: liveTrading ? "Live trading enabled" : "Shadow or paper mode"
    },
    { label: "Markets Watched", value: "18", helper: "Top liquidity markets" },
    { label: "Open Orders", value: "6", helper: "Auto-cancel in 2s" },
    { label: "PnL (24h)", value: "+$124.50", helper: "Unrealized +$58.20" }
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
