"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AppBar, Avatar, Box, Drawer, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography, Button, ListItemIcon } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, Briefcase, GraduationCap, ClipboardList, FileCheck, FileSearch } from "lucide-react";
import { motion } from "framer-motion";

const MotionListItemIcon = motion(ListItemIcon);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const portalFilter = searchParams.get("portal");
  const typeFilter = searchParams.get("type");
  const { data: session, status } = useSession();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
  };

  if (status === "unauthenticated") {
    return <>{children}</>;
  }

  const isAdmin = (session?.user as any)?.role === "admin";

  const navItems = isAdmin 
    ? [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/applications", label: "All Applications", icon: ClipboardList },
        { href: "/applications?portal=JNF", label: "JNF Submissions", icon: FileCheck },
        { href: "/applications?portal=INF", label: "INF Submissions", icon: FileSearch },
      ]
    : [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/jobs?type=JNF", label: "JNF Jobs", icon: Briefcase },
        { href: "/jobs?type=INF", label: "INF Internships", icon: GraduationCap },
        { href: "/applications", label: "My Applications", icon: ClipboardList },
        { href: "/applications?portal=JNF", label: "JNF Submissions", icon: FileCheck },
        { href: "/applications?portal=INF", label: "INF Submissions", icon: FileSearch },
      ];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer variant="persistent" open={open} sx={{ "& .MuiDrawer-paper": { width: 260, p: 2 } }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}>
            ✨
          </motion.div>
          Recruiter Suite
        </Typography>
        <List>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = item.href.startsWith("/applications")
              ? pathname === "/applications" &&
                (item.href === "/applications"
                  ? !portalFilter
                  : !!portalFilter && item.href.endsWith(`portal=${portalFilter}`))
              : item.href.startsWith("/jobs")
                ? pathname === "/jobs" && !!typeFilter && item.href.endsWith(`type=${typeFilter}`)
              : pathname === item.href;

            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={isSelected}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  "&.Mui-selected": {
                    bgcolor: "primary.light",
                    color: "primary.main",
                    "& .MuiListItemIcon-root": { color: "primary.main" },
                  },
                }}
              >
                <MotionListItemIcon
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  sx={{ minWidth: 40 }}
                >
                  <Icon size={20} />
                </MotionListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Box sx={{ flexGrow: 1, ml: open ? "260px" : 0, transition: "all 0.2s" }}>
        <AppBar position="sticky" color="transparent" elevation={0}>
          <Toolbar sx={{ backdropFilter: "blur(8px)", bgcolor: "rgba(255,255,255,0.65)" }}>
            <IconButton onClick={() => setOpen((p) => !p)}><MenuIcon /></IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>Placement Management</Typography>
            <Avatar sx={{ mr: 1 }}>{session?.user?.name?.[0] || "R"}</Avatar>
            <Button variant="outlined" onClick={handleLogout}>Logout</Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
}
