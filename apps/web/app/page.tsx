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
import { StatCard } from "../components/StatCard";
import { EventsTable } from "../components/EventsTable";
import { ShadowMetrics } from "../components/ShadowMetrics";

const mockStats = [
  { label: "Live Status", value: "ARMED", helper: "Latency arb mode" },
  { label: "Markets Watched", value: "18", helper: "Top liquidity markets" },
  { label: "Open Orders", value: "6", helper: "Auto-cancel in 2s" },
  { label: "PnL (24h)", value: "+$124.50", helper: "Unrealized +$58.20" }
];

export default function Home() {
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
          {mockStats.map((stat) => (
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
                  <Switch defaultChecked />
                  <Typography>Enable live trading</Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Button variant="contained">Arm Strategy</Button>
                  <Button variant="outlined" color="error">
                    Emergency Stop
                  </Button>
                </Stack>
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
