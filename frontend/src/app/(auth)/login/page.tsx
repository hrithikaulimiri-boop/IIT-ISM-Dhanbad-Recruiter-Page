"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Box, Button, Paper, Stack, TextField, Typography, Container, InputAdornment } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, GraduationCap, Sparkles, Building2, UserPlus } from "lucide-react";

const FloatingIcon = ({ children, delay = 0, initialX = 0, initialY = 0 }: { children: React.ReactNode, delay?: number, initialX?: number, initialY?: number }) => (
  <motion.div
    initial={{ x: initialX, y: initialY, opacity: 0 }}
    animate={{ 
      y: [initialY, initialY - 20, initialY],
      opacity: [0.2, 0.5, 0.2],
    }}
    transition={{ 
      duration: 4, 
      repeat: Infinity, 
      delay,
      ease: "easeInOut" 
    }}
    style={{ position: 'absolute', color: 'rgba(25, 118, 210, 0.2)' }}
  >
    {children}
  </motion.div>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Invalid credentials. Please try again.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements */}
      <FloatingIcon delay={0} initialX={100} initialY={100}><GraduationCap size={120} /></FloatingIcon>
      <FloatingIcon delay={1} initialX={-200} initialY={300}><Building2 size={80} /></FloatingIcon>
      <FloatingIcon delay={2} initialX={300} initialY={-200}><Sparkles size={100} /></FloatingIcon>
      <FloatingIcon delay={0.5} initialX={-400} initialY={-100}><GraduationCap size={60} /></FloatingIcon>

      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                repeatType: "reverse" 
              }}
            >
              <Typography 
                variant="h3" 
                component="h1" 
                sx={{ 
                  fontWeight: 800, 
                  background: "linear-gradient(45deg, #1976d2, #9c27b0)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  mb: 1
                }}
              >
                IIT ISM Dhanbad
              </Typography>
            </motion.div>
            <Typography variant="h5" color="textSecondary" sx={{ fontWeight: 500 }}>
              Recruiter Portal
            </Typography>
          </Box>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Paper 
            elevation={10} 
            sx={{ 
              p: { xs: 3, md: 5 }, 
              borderRadius: 4,
              backdropFilter: "blur(10px)",
              bgcolor: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.3)"
            }}
          >
            <Stack spacing={3}>
              <Typography variant="h6" align="center" gutterBottom>
                Welcome Back
              </Typography>
              
              <TextField 
                label="Email Address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                fullWidth 
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={20} color="#666" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField 
                label="Password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                fullWidth 
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={20} color="#666" />
                    </InputAdornment>
                  ),
                }}
              />

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Typography color="error" variant="body2" align="center">
                      {error}
                    </Typography>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button 
                variant="contained" 
                size="large"
                onClick={handleLogin}
                disabled={loading}
                sx={{ 
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)'
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                <Typography variant="body2" color="textSecondary" sx={{ px: 2 }}>
                  OR
                </Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
              </Box>

              <Button 
                variant="outlined" 
                size="large"
                component={Link} 
                href="/register"
                startIcon={<UserPlus size={20} />}
                sx={{ 
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem'
                }}
              >
                Create Recruiter Account
              </Button>
            </Stack>
          </Paper>
        </motion.div>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="textSecondary">
            © 2026 IIT ISM Dhanbad Placement Cell. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
