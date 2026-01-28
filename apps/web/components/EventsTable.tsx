"use client";

import { useEffect, useState } from "react";
import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { supabaseClient } from "../lib/supabaseClient";

type BotEvent = {
  id: string;
  event_type: string;
  market_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export const EventsTable = () => {
  const [events, setEvents] = useState<BotEvent[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = supabaseClient();
        const { data, error: queryError } = await supabase
          .from("bot_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8);
        if (queryError) {
          throw queryError;
        }
        setEvents(data ?? []);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Recent Bot Events</Typography>
        {error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Market</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.event_type}</TableCell>
                  <TableCell>{event.market_id ?? "-"}</TableCell>
                  <TableCell>
                    {new Date(event.created_at).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
};
