"use client";

import React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { AppBar, Avatar, Box, Toolbar, Typography, Button, useMediaQuery, useTheme, IconButton, Stack } from "@mui/material";
import { motion } from "framer-motion";
import HelpFab from "@/components/common/HelpFab";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, ArrowLeft } from "lucide-react";

import { IIT_ISM_LOGO } from "@/lib/logo";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  const handleBack = () => {
    if (pathname === '/dashboard') return;
    router.back();
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

  const isAdmin = (session?.user as any)?.role === "admin";

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      bgcolor: "background.default",
      display: 'flex',
      flexDirection: 'column',
      background: (theme) => theme.palette.mode === 'light' 
        ? "linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)" 
        : "linear-gradient(135deg, #002d2d 0%, #001a1a 100%)"
    }}>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
          <Toolbar sx={{ backdropFilter: "blur(20px)", bgcolor: (theme) => theme.palette.mode === 'light' ? "rgba(255,255,255,0.7)" : "rgba(0,45,45,0.7)" }}>
            {pathname !== '/dashboard' && (
              <IconButton 
                onClick={handleBack}
                sx={{ mr: 2, color: '#00796b', bgcolor: 'rgba(0,121,107,0.05)', '&:hover': { bgcolor: 'rgba(0,121,107,0.1)' } }}
              >
                <ArrowLeft size={20} />
              </IconButton>
            )}
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
                animate={{ rotateY: 360 }} 
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  bgcolor: '#fff',
                  p: 0.2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <img 
                  src={IIT_ISM_LOGO} 
                  alt="IIT (ISM) Dhanbad Logo" 
                  style={{ width: 45, height: 45, objectFit: 'contain', borderRadius: '50%' }}
                />
              </Box>
              {isAdmin ? "IIT (ISM) ADMIN PORTAL" : "IIT (ISM) RECRUITER PORTAL"}
            </Typography>
            <Avatar sx={{ mr: 1.5, bgcolor: '#00796b', fontWeight: 700, border: '2px solid rgba(255,255,255,0.5)' }}>
              {isAdmin ? "A" : ((session?.user as any)?.companyName?.[0] || session?.user?.name?.[0] || "R")}
            </Avatar>
            <Box sx={{ mr: 3, display: { xs: 'none', md: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === 'light' ? '#004d40' : '#e0f2f1' }}>
                {isAdmin ? "Placement Admin" : ((session?.user as any)?.companyName || session?.user?.name)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, opacity: 0.8 }}>
                {isAdmin ? "ADMIN" : "RECRUITER"}
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
      
      {/* Global Footer */}
      <Box sx={{ 
        mt: 'auto', 
        py: 4, 
        px: 3, 
        textAlign: 'center', 
        bgcolor: 'rgba(0,0,0,0.02)', 
        borderTop: '1px solid rgba(0,0,0,0.05)',
        backdropFilter: 'blur(10px)'
      }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#004d40', mb: 2, letterSpacing: 0.5 }}>
          © 2026 INDIAN INSTITUTE OF TECHNOLOGY (ISM) DHANBAD • PLACEMENT CELL
        </Typography>
        <Stack direction="row" spacing={3} justifyContent="center">
          <Typography 
            component="a" 
            href="https://www.iitism.ac.in/" 
            target="_blank"
            sx={{ color: '#00796b', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
          >
            About IIT (ISM) Dhanbad
          </Typography>
          <Typography 
            component="a" 
            href="https://www.iitism.ac.in/career-development-centre" 
            target="_blank"
            sx={{ color: '#00796b', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
          >
            Meet Our CDC
          </Typography>
        </Stack>
      </Box>

      {pathname !== '/help' && <HelpFab />}
    </Box>
  );
}
