"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Box, Button, Paper, Stack, TextField, Typography, Container, InputAdornment, GlobalStyles } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, GraduationCap, Sparkles, Building2, UserPlus, Info, Users, BookOpen, Award } from "lucide-react";

const FloatingIcon = ({ children, delay = 0, initialX = 0, initialY = 0, size = 1 }: { children: React.ReactNode, delay?: number, initialX?: number, initialY?: number, size?: number }) => (
  <Box
    component={motion.div}
    initial={{ x: initialX, y: initialY, opacity: 0, scale: size }}
    animate={{ 
      y: [initialY, initialY - 30, initialY],
      opacity: [0.1, 0.3, 0.1],
      rotate: [0, 10, 0]
    }}
    transition={{ 
      duration: 6, 
      repeat: Infinity, 
      delay,
      ease: "easeInOut" 
    }}
    sx={{ position: 'absolute', color: 'rgba(0, 121, 107, 0.15)', pointerEvents: 'none' }}
  >
    {children}
  </Box>
);

const InfoBox = ({ title, content, icon: Icon, delay, href }: { title: string, content: string, icon: any, delay: number, href?: string }) => (
  <Box
    component={motion.div}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay }}
    sx={{ height: '100%' }}
  >
    <Paper
      elevation={0}
      component={href ? "a" : Paper}
      href={href}
      target={href?.startsWith('http') ? "_blank" : undefined}
      rel={href?.startsWith('http') ? "noopener noreferrer" : undefined}
      sx={{
        p: 4,
        height: '100%',
        borderRadius: 6,
        bgcolor: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        transition: 'all 0.3s ease',
        cursor: href ? 'pointer' : 'default',
        textDecoration: 'none',
        display: 'block',
        '&:hover': {
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          transform: 'translateY(-5px)',
          boxShadow: '0 15px 35px rgba(0, 121, 107, 0.1)',
        }
      }}
    >
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Box sx={{ p: 2, borderRadius: 4, bgcolor: 'rgba(0, 121, 107, 0.1)', color: '#00796b' }}>
          <Icon size={32} strokeWidth={1.5} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#004d40', letterSpacing: -0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, fontWeight: 500 }}>
          {content}
        </Typography>
      </Stack>
    </Paper>
  </Box>
);

const BackgroundSlideshow = () => {
  const [index, setIndex] = useState(0);
  // Using user-provided campus images stored in public/backgrounds
  const images = [
    "/campus_main.jpg",
    "/backgrounds/bg1.gif",
    "/backgrounds/bg2.jpeg",
    "/backgrounds/bg3.jpeg",
    "/backgrounds/bg4.jpeg",
    "/backgrounds/bg5.jpeg"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <Box sx={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      zIndex: -1, 
      overflow: 'hidden',
      bgcolor: '#004d40'
    }}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={images[index]}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "linear" }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <motion.img 
            src={images[index]} 
            alt="Campus"
            initial={{ scale: 1.1 }}
            animate={{ 
              scale: 1,
              x: index % 2 === 0 ? [-10, 10] : [10, -10],
              y: index % 3 === 0 ? [-10, 10] : [10, -10]
            }}
            transition={{ 
              scale: { duration: 5, ease: "linear" },
              x: { duration: 5, ease: "linear" },
              y: { duration: 5, ease: "linear" }
            }}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              position: 'absolute'
            }} 
          />
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,77,64,0.5))',
            pointerEvents: 'none'
          }} />
        </motion.div>
      </AnimatePresence>
    </Box>
  );
};

import { IIT_ISM_LOGO } from "@/lib/logo";

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
      if (result.error === "CredentialsSignin") {
        setError("Invalid email or password.");
      } else {
        setError(result.error);
      }
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  if (!mounted) {
    // Return null during hydration to avoid mismatch.
    return null;
  }

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden',
      pb: 10
    }}>
      <GlobalStyles styles={{ body: { margin: 0, padding: 0 } }} />
      <BackgroundSlideshow />
      
      {/* Motion Wallpaper Elements */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }}>
        <FloatingIcon delay={0} initialX={-100} initialY={100} size={1.5}><GraduationCap size={150} /></FloatingIcon>
        <FloatingIcon delay={1} initialX={1200} initialY={400} size={1.2}><Building2 size={120} /></FloatingIcon>
        <FloatingIcon delay={2} initialX={400} initialY={-100} size={1.8}><Sparkles size={100} /></FloatingIcon>
        <FloatingIcon delay={0.5} initialX={-200} initialY={700} size={1}><BookOpen size={80} /></FloatingIcon>
        <FloatingIcon delay={3} initialX={1000} initialY={-50} size={1.3}><Award size={110} /></FloatingIcon>
        
        {/* Animated Gradient Orbs */}
        <Box
          component={motion.div}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          sx={{ 
            position: 'absolute', 
            top: '20%', 
            left: '10%', 
            width: 400, 
            height: 400, 
            borderRadius: '50%', 
            background: 'radial-gradient(circle, rgba(0, 121, 107, 0.1) 0%, transparent 70%)',
            filter: 'blur(60px)'
          }}
        />
        <Box
          component={motion.div}
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.6, 0.4],
            x: [0, -40, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          sx={{ 
            position: 'absolute', 
            bottom: '10%', 
            right: '15%', 
            width: 500, 
            height: 500, 
            borderRadius: '50%', 
            background: 'radial-gradient(circle, rgba(0, 77, 64, 0.1) 0%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pt: 10 }}>
        {/* Main Hero & Login Section */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 12 }}>
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Stack direction="row" spacing={3} alignItems="center" justifyContent="center" sx={{ mb: 4 }}>
                <Box 
                  component={motion.div} 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 360 }}
                  transition={{ 
                    rotateY: { duration: 15, repeat: Infinity, ease: "linear" },
                    default: { duration: 0.8 }
                  }}
                  sx={{ 
                    width: { xs: 80, md: 120 }, 
                    height: { xs: 80, md: 120 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    bgcolor: '#fff',
                    p: 0.5,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  }}
                >
                  <img 
                    src={IIT_ISM_LOGO} 
                    alt="IIT (ISM) Dhanbad Logo" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain', 
                      borderRadius: '50%'
                    }} 
                  />
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography 
                    variant="h2" 
                    component="h1" 
                    sx={{ 
                      fontWeight: 900, 
                      color: "#fff",
                      mb: 0,
                      fontSize: { xs: '1.8rem', md: '3.5rem' },
                      letterSpacing: -1,
                      lineHeight: 1,
                      textShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}
                  >
                    IIT (ISM) DHANBAD
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: "#b2dfdb", 
                      letterSpacing: { xs: 2, md: 4 },
                      fontSize: { xs: '0.9rem', md: '1.5rem' },
                      mt: 1,
                      textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                    }}
                  >
                    RECRUITER ACCESS PORTAL
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </motion.div>

          <Box sx={{ width: '100%', maxWidth: 500 }}>
            {/* Alumni Mentorship Box (Now Before Login) */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <Paper
                elevation={0}
                sx={{
                  mb: 3,
                  p: 2.5,
                  borderRadius: 6,
                  backdropFilter: "blur(20px)",
                  bgcolor: "rgba(255, 255, 255, 0.9)", // Light white background
                  border: "1px solid rgba(0, 121, 107, 0.2)",
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: "rgba(255, 255, 255, 1)",
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 30px rgba(0, 77, 64, 0.1)',
                  }
                }}
                onClick={() => router.push("/alumni-mentorship")}
              >
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                  <Box sx={{ p: 1, borderRadius: 3, bgcolor: '#004d40', color: '#fff' }}>
                    <Users size={20} />
                  </Box>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1a1a1a', letterSpacing: -0.2 }}>
                      Are you an Alumni?
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#004d40', display: 'block' }}>
                      Fill out this alumni mentorship form! →
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
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
                      borderRadius: 8,
                      backdropFilter: "blur(30px)",
                      bgcolor: "rgba(255, 255, 255, 0.85)", // Slightly more opaque for better contrast
                      border: "1px solid rgba(255, 255, 255, 0.5)",
                      boxShadow: '0 30px 60px rgba(0, 77, 64, 0.15)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Decorative Logo in Card Background */}
                    <Box sx={{ 
                      position: 'absolute', 
                      top: -20, 
                      right: -20, 
                      opacity: 0.05, 
                      pointerEvents: 'none',
                      transform: 'rotate(15deg)'
                    }}>
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/en/3/3a/Indian_Institute_of_Technology_%28Indian_School_of_Mines%29%2C_Dhanbad_Logo.png" 
                        alt="" 
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        style={{ width: 200, height: 200 }} 
                      />
                    </Box>

                    {/* Tab Toggle */}
                <Box sx={{ 
                  display: 'flex', 
                  bgcolor: 'rgba(0,0,0,0.04)', 
                  borderRadius: 5, 
                  p: 0.7, 
                  mb: 4
                }}>
                  <Button
                    fullWidth
                    onClick={() => setActiveTab("login")}
                    sx={{ 
                      borderRadius: 4, 
                      py: 1.8,
                      color: activeTab === "login" ? "#fff" : "#004d40",
                      bgcolor: activeTab === "login" ? "#00796b" : "transparent",
                      '&:hover': { bgcolor: activeTab === "login" ? "#00695c" : 'rgba(0,0,0,0.05)' },
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: 800,
                      textTransform: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    Portal Login
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => router.push("/register")}
                    sx={{ 
                      borderRadius: 4, 
                      py: 1.8,
                      color: "#004d40",
                      bgcolor: "transparent",
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                      transition: 'all 0.3s ease',
                      fontWeight: 800,
                      textTransform: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    Register Now
                  </Button>
                </Box>

                <AnimatePresence mode="wait">
                  {activeTab === "login" && (
                    <motion.div
                      key="login-form"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Stack spacing={3.5}>
                        <TextField 
                          label="Institutional Email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          fullWidth 
                          variant="outlined"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Mail size={20} color="#00796b" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 4,
                              bgcolor: 'rgba(255,255,255,0.6)',
                              '& fieldset': { borderColor: 'rgba(0,121,107,0.2)' },
                              '&:hover fieldset': { borderColor: '#00796b' },
                            } 
                          }}
                        />
                        
                        <TextField 
                          label="Access Password" 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          fullWidth 
                          variant="outlined"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Lock size={20} color="#00796b" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: 4,
                              bgcolor: 'rgba(255,255,255,0.6)',
                              '& fieldset': { borderColor: 'rgba(0,121,107,0.2)' },
                              '&:hover fieldset': { borderColor: '#00796b' },
                            } 
                          }}
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1.5 }}>
                          <Link href="/forgot-password" style={{ textDecoration: 'none' }}>
                            <Typography variant="body2" sx={{ 
                              color: "#00796b", 
                              fontWeight: 700,
                              '&:hover': { color: '#004d40', textDecoration: 'underline' },
                              cursor: 'pointer'
                            }}>
                              Recover Account Credentials?
                            </Typography>
                          </Link>
                        </Box>

                        {error && (
                          <Paper sx={{ p: 1.5, bgcolor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 3 }}>
                            <Typography color="error" variant="caption" align="center" sx={{ fontWeight: 600, display: 'block' }}>
                              {error}
                            </Typography>
                          </Paper>
                        )}

                        <Button 
                          variant="contained" 
                          size="large"
                          onClick={handleLogin}
                          disabled={loading}
                          sx={{ 
                            py: 2.2,
                            borderRadius: 4,
                            textTransform: 'none',
                            fontSize: '1.1rem',
                            bgcolor: '#00796b',
                            fontWeight: 800,
                            boxShadow: '0 15px 30px rgba(0,121,107,0.25)',
                            '&:hover': { 
                              bgcolor: '#004d40', 
                              boxShadow: '0 20px 40px rgba(0,121,107,0.35)',
                              transform: 'translateY(-2px)'
                            },
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {loading ? "Authenticating..." : "Authorize Access"}
                        </Button>
                      </Stack>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Paper>
            </motion.div>
          </Box>
        </Box>

        {/* Information Grid */}
        <Box sx={{ mt: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ width: '100%' }}>
            <Box sx={{ flex: 1 }}>
              <InfoBox 
                delay={0.4}
                icon={Info}
                title="About IIT (ISM) Dhanbad"
                href="https://www.iitism.ac.in/"
                content="Established in 1926, IIT (ISM) Dhanbad is an institution of national importance with a century-long legacy in Earth Sciences and Engineering. Our world-class faculty and cutting-edge research facilities nurture the brightest minds in the country, producing industry-ready professionals across diverse domains of technology and management."
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <InfoBox 
                delay={0.6}
                icon={Users}
                title="Meet Our CDC"
                href="https://www.iitism.ac.in/career-development-centre"
                content="The Career Development Cell (CDC) at IIT (ISM) Dhanbad acts as a vital bridge between academia and the professional world. Our dedicated team facilitates seamless recruitment processes, internship drives, and corporate interactions, ensuring that our recruiters find the perfect talent match while our students achieve their career aspirations."
              />
            </Box>
          </Stack>
        </Box>

        <Box sx={{ mt: 10, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: "#004d40", fontWeight: 700, opacity: 0.6, letterSpacing: 2 }}>
            © 2026 INDIAN INSTITUTE OF TECHNOLOGY (ISM) DHANBAD • PLACEMENT CELL
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
