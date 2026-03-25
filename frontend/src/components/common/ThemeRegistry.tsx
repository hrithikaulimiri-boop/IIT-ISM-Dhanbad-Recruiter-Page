"use client";

import * as React from "react";
import { CssBaseline, IconButton } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { getTheme } from "@/lib/theme";

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const saved = window.localStorage.getItem("theme-mode");
    if (saved === "dark" || saved === "light") setMode(saved);
  }, []);

  const toggle = () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    window.localStorage.setItem("theme-mode", next);
  };

  // Prevent hydration mismatch by only rendering client-specific parts after mount
  return (
    <ThemeProvider theme={getTheme(mode)}>
      <CssBaseline />
      {mounted && (
        <IconButton
          color="inherit"
          onClick={toggle}
          sx={{ position: "fixed", right: 24, bottom: 24, bgcolor: "background.paper", zIndex: 1300, boxShadow: 3 }}
        >
          {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
        </IconButton>
      )}
      {children}
    </ThemeProvider>
  );
}
