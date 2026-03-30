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
      primary: { main: "#00796b", dark: "#004d40", light: "#b2dfdb" },
      secondary: { main: "#00897b" },
      success: { main: "#009688" },
      background:
        mode === "light"
          ? { default: "#e0f2f1", paper: "rgba(255, 255, 255, 0.8)" }
          : { default: "#002d2d", paper: "rgba(0, 45, 45, 0.8)" },
    },
    components: {
      ...common.components,
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 32,
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.05)",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            fontWeight: 700,
            textTransform: "none",
            padding: "10px 24px",
          },
          containedPrimary: {
            background: "linear-gradient(135deg, #00796b 0%, #004d40 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #00695c 0%, #003d33 100%)",
            },
          },
        },
      },
    },
  });
