"use client";

import React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { AppBar, Avatar, Box, Toolbar, Typography, Button, useMediaQuery, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import HelpFab from "@/components/common/HelpFab";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  // Prevent hydration mismatch by returning a stable structure until mounted
  if (!mounted) {
    return <div style={{ minHeight: "100vh" }}>{children}</div>;
  }

  if (status === "loading") {
    return <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }} />;
  }

  if (status === "unauthenticated") {
    return <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>{children}</Box>;
  }

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      bgcolor: "background.default",
      background: (theme) => theme.palette.mode === 'light' 
        ? "linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)" 
        : "linear-gradient(135deg, #002d2d 0%, #001a1a 100%)"
    }}>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <Toolbar sx={{ backdropFilter: "blur(20px)", bgcolor: (theme) => theme.palette.mode === 'light' ? "rgba(255,255,255,0.7)" : "rgba(0,45,45,0.7)" }}>
            <Typography 
              variant="h6" 
              component={Link} 
              href="/dashboard"
              sx={{ 
                flexGrow: 1, 
                textDecoration: 'none', 
                color: (theme) => theme.palette.mode === 'light' ? '#004d40' : '#e0f2f1',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                letterSpacing: -0.5
              }}
            >
              <Box 
                component={motion.div} 
                animate={{ rotate: 360 }} 
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <Sparkles size={24} color="#00796b" />
              </Box>
              IIT-ISM RECRUITER PORTAL
            </Typography>
            <Avatar sx={{ mr: 1.5, bgcolor: '#00796b', fontWeight: 700, border: '2px solid rgba(255,255,255,0.5)' }}>
              {(session?.user as any)?.companyName?.[0] || session?.user?.name?.[0] || "R"}
            </Avatar>
            <Box sx={{ mr: 3, display: { xs: 'none', md: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === 'light' ? '#004d40' : '#e0f2f1' }}>
                {(session?.user as any)?.companyName || session?.user?.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, opacity: 0.8 }}>
                RECRUITER
              </Typography>
            </Box>
            <Button 
              variant="outlined" 
              onClick={handleLogout}
              sx={{ 
                borderRadius: 3, 
                px: 3, 
                borderColor: '#00796b', 
                color: '#00796b',
                '&:hover': { bgcolor: 'rgba(0,121,107,0.05)', borderColor: '#004d40' }
              }}
            >
              Logout
            </Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, md: 5 }, maxWidth: '1440px', mx: 'auto' }}>{children}</Box>
      </Box>
      {pathname !== '/help' && <HelpFab />}
    </Box>
  );
}
