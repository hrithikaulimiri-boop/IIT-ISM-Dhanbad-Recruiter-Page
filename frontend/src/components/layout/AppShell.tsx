"use client";

import React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { AppBar, Avatar, Box, Toolbar, Typography, Button } from "@mui/material";
import { motion } from "framer-motion";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  // Prevent hydration mismatch by waiting for mount
  if (!mounted) {
    return <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>{children}</Box>;
  }

  if (status === "unauthenticated") {
    return <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>{children}</Box>;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="sticky" color="transparent" elevation={0}>
          <Toolbar sx={{ backdropFilter: "blur(8px)", bgcolor: "rgba(255,255,255,0.65)" }}>
            <Typography 
              variant="h6" 
              component={Link} 
              href="/dashboard"
              sx={{ 
                flexGrow: 1, 
                textDecoration: 'none', 
                color: 'inherit',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Box component={motion.div} animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
                ✨
              </Box>
              IIT-ISM Placement Portal
            </Typography>
            <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>{(session?.user as any)?.companyName?.[0] || session?.user?.name?.[0] || "R"}</Avatar>
            <Typography variant="body2" sx={{ mr: 2, fontWeight: 600, color: 'text.secondary' }}>
              {(session?.user as any)?.companyName || session?.user?.name}
            </Typography>
            <Button variant="outlined" onClick={handleLogout}>Logout</Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 4, maxWidth: '1400px', mx: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
}
