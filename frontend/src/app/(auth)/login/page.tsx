"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Box, Button, Paper, Stack, TextField, Typography, Container, InputAdornment } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, GraduationCap, Sparkles, Building2, UserPlus } from "lucide-react";

const FloatingIcon = ({ children, delay = 0, initialX = 0, initialY = 0 }: { children: React.ReactNode, delay?: number, initialX?: number, initialY?: number }) => (
  <Box
    component={motion.div}
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
    sx={{ position: 'absolute', color: 'rgba(25, 118, 210, 0.2)' }}
  >
    {children}
  </Box>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) {
    // Defer rendering until after mount to avoid hydration mismatch
    return (
      <Box sx={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)"
      }} />
    );
  }

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)", // Calmer, aesthetic teal/mint gradient
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements - Calmer Colors */}
      <FloatingIcon delay={0} initialX={100} initialY={100}><GraduationCap size={120} /></FloatingIcon>
      <FloatingIcon delay={1} initialX={-200} initialY={300}><Building2 size={80} /></FloatingIcon>
      <FloatingIcon delay={2} initialX={300} initialY={-200}><Sparkles size={100} /></FloatingIcon>
      <FloatingIcon delay={0.5} initialX={-400} initialY={-100}><GraduationCap size={60} /></FloatingIcon>

      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                letterSpacing: 4, 
                color: "text.secondary", 
                fontWeight: 300,
                mb: 1,
                textTransform: 'uppercase'
              }}
            >
              Welcome
            </Typography>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 800, 
                color: "#004d40", // Dark teal for professional look
                mb: 1,
                fontSize: { xs: '2rem', md: '3rem' },
                letterSpacing: -0.5
              }}
            >
              IIT-ISM DHANBAD
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 400, 
                color: "#00796b", 
                letterSpacing: 1,
                opacity: 0.8
              }}
            >
              RECRUITER PORTAL
            </Typography>
          </Box>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 3, md: 5 }, 
              borderRadius: 6,
              backdropFilter: "blur(20px)",
              bgcolor: "rgba(255, 255, 255, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              boxShadow: '0 20px 40px rgba(0,0,0,0.05)'
            }}
          >
            {/* Tab Toggle */}
            <Box sx={{ 
              display: 'flex', 
              bgcolor: 'rgba(0,0,0,0.03)', 
              borderRadius: 4, 
              p: 0.5, 
              mb: 4,
              position: 'relative'
            }}>
              <Button
                fullWidth
                onClick={() => setActiveTab("login")}
                sx={{ 
                  borderRadius: 3.5, 
                  py: 1.5,
                  color: activeTab === "login" ? "#fff" : "text.secondary",
                  bgcolor: activeTab === "login" ? "#00796b" : "transparent",
                  '&:hover': { bgcolor: activeTab === "login" ? "#00695c" : 'rgba(0,0,0,0.05)' },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem',
                  zIndex: 1
                }}
              >
                Login Account
              </Button>
              <Button
                fullWidth
                onClick={() => router.push("/register")}
                sx={{ 
                  borderRadius: 3.5, 
                  py: 1.5,
                  color: "text.secondary",
                  bgcolor: "transparent",
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                  transition: 'all 0.3s ease',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem',
                  zIndex: 1
                }}
              >
                Register Account
              </Button>
            </Box>

            <AnimatePresence mode="wait">
              {activeTab === "login" && (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Stack spacing={3}>
                    <TextField 
                      label="Email Address" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      fullWidth 
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Mail size={18} color="#00796b" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.5)'
                        } 
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
                            <Lock size={18} color="#00796b" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.5)'
                        } 
                      }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1.5 }}>
                      <Link href="/forgot-password" style={{ textDecoration: 'none' }}>
                        <Typography variant="body2" sx={{ 
                          color: "#00796b", 
                          fontWeight: 600,
                          '&:hover': { color: '#004d40', textDecoration: 'underline' },
                          cursor: 'pointer'
                        }}>
                          Forgot Password?
                        </Typography>
                      </Link>
                    </Box>

                    {error && (
                      <Typography color="error" variant="body2" align="center" sx={{ fontWeight: 500 }}>
                        {error}
                      </Typography>
                    )}

                    <Button 
                      variant="contained" 
                      size="large"
                      onClick={handleLogin}
                      disabled={loading}
                      sx={{ 
                        py: 1.8,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontSize: '1.1rem',
                        bgcolor: '#00796b',
                        fontWeight: 700,
                        boxShadow: '0 10px 20px rgba(0,121,107,0.2)',
                        '&:hover': { bgcolor: '#00695c', boxShadow: '0 12px 24px rgba(0,121,107,0.3)' }
                      }}
                    >
                      {loading ? "Signing in..." : "Sign In to Portal"}
                    </Button>
                  </Stack>
                </motion.div>
              )}
            </AnimatePresence>
          </Paper>
        </motion.div>

        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.7, letterSpacing: 1 }}>
            © 2026 IIT-ISM DHANBAD PLACEMENT CELL
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
