"use client";

import { createTheme } from "@mui/material/styles";

const common = {
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    h4: { fontWeight: 700, letterSpacing: -0.4 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          background: "linear-gradient(90deg, #6366F1 0%, #A78BFA 100%)",
        },
        root: {
          borderRadius: 14,
          transition: "all 0.2s ease",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        },
      },
    },
  },
};

export const getTheme = (mode: "light" | "dark") =>
  createTheme({
    ...common,
    palette: {
      mode,
      primary: { main: "#6366F1" },
      secondary: { main: "#A78BFA" },
      success: { main: "#34D399" },
      background:
        mode === "light"
          ? { default: "#F9FAFB", paper: "#FFFFFF" }
          : { default: "#0F172A", paper: "#111827" },
    },
  });
