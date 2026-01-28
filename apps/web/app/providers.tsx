"use client";

import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { ReactNode } from "react";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#5b7cfa"
    },
    background: {
      default: "#0b0f1a",
      paper: "#121829"
    }
  },
  shape: {
    borderRadius: 12
  }
});

export const Providers = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);
