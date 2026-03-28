"use client";

import AppShell from "@/components/layout/AppShell";
import { Grid2 as Grid, Typography, Box, Paper, Stack } from "@mui/material";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Briefcase, GraduationCap, ClipboardList, FileCheck, FileSearch } from "lucide-react";
import Link from "next/link";

const NavCard = ({ title, icon: Icon, href, color, delay }: { title: string, icon: any, href: string, color: string, delay: number }) => (
  <Box
    component={motion.div}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -8, scale: 1.02 }}
    sx={{ height: '100%' }}
  >
    <Paper
      component={Link}
      href={href}
      sx={{
        p: 4,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        textDecoration: 'none',
        borderRadius: 6,
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease',
        '&:hover': {
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: `0 20px 40px ${color}20`,
          '& .MuiBox-root': {
            transform: 'scale(1.1) rotate(5deg)',
            bgcolor: `${color}20`,
          }
        }
      }}
    >
      <Box 
        sx={{ 
          p: 3, 
          borderRadius: 5, 
          bgcolor: `${color}10`, 
          color: color,
          mb: 3,
          transition: 'all 0.3s ease'
        }}
      >
        <Icon size={48} strokeWidth={1.5} />
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 800, color: '#004d40', mb: 1, letterSpacing: -0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, opacity: 0.8 }}>
        Manage your {title.toLowerCase()} processes
      </Typography>
    </Paper>
  </Box>
);

export default function DashboardPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const navItems = isAdmin 
    ? [
        { title: "ALL SUBMISSIONS", icon: ClipboardList, href: "/applications", color: "#00796b", delay: 0.1 },
        { title: "PENDING APPROVAL", icon: FileSearch, href: "/applications?status=in progress", color: "#00897b", delay: 0.2 },
        { title: "JNF SUBMISSIONS", icon: FileCheck, href: "/applications?portal=JNF", color: "#009688", delay: 0.3 },
        { title: "INF SUBMISSIONS", icon: GraduationCap, href: "/applications?portal=INF", color: "#26a69a", delay: 0.4 },
      ]
    : [
        { title: "APPLICATION FOR JNF", icon: Briefcase, href: "/jobs?type=JNF", color: "#00796b", delay: 0.1 },
        { title: "APPLICATION FOR INF", icon: GraduationCap, href: "/jobs?type=INF", color: "#00897b", delay: 0.2 },
        { title: "MY APPLICATIONS", icon: ClipboardList, href: "/applications", color: "#009688", delay: 0.3 },
        { title: "JNF SUBMISSIONS", icon: FileCheck, href: "/applications?portal=JNF", color: "#26a69a", delay: 0.4 },
        { title: "INF SUBMISSIONS", icon: FileSearch, href: "/applications?portal=INF", color: "#4db6ac", delay: 0.5 },
      ];

  return (
    <AppShell>
      <Box sx={{ mb: 6 }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Typography variant="h6" sx={{ letterSpacing: 4, color: "text.secondary", fontWeight: 300, mb: 1, textTransform: 'uppercase' }}>
            Welcome back,
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#004d40', mb: 1, letterSpacing: -1 }}>
            {(session?.user as any)?.name || (isAdmin ? 'Admin' : 'Recruiter')}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 400, color: '#00796b', opacity: 0.8 }}>
            IIT-ISM DHANBAD {isAdmin ? 'ADMIN' : 'RECRUITER'} PORTAL
          </Typography>
        </motion.div>
      </Box>

      <Grid container spacing={4}>
        {isAdmin ? (
          navItems.map((item) => (
            <Grid key={item.title} size={{ xs: 12, md: 6 }}>
              <NavCard {...item} />
            </Grid>
          ))
        ) : (
          <>
            {navItems.slice(0, 2).map((item) => (
              <Grid key={item.title} size={{ xs: 12, md: 6 }}>
                <NavCard {...item} />
              </Grid>
            ))}
            {navItems.slice(2).map((item) => (
              <Grid key={item.title} size={{ xs: 12, md: 4 }}>
                <NavCard {...item} />
              </Grid>
            ))}
          </>
        )}
      </Grid>

      <Box sx={{ mt: 10, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.5, letterSpacing: 1 }}>
          © 2026 IIT-ISM DHANBAD PLACEMENT CELL
        </Typography>
      </Box>
    </AppShell>
  );
}
