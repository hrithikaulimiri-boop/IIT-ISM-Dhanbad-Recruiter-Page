"use client";

import { useState, useEffect } from "react";
import { Box, Button, Paper, Stack, TextField, Typography, Container, InputAdornment, IconButton } from "@mui/material";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, GraduationCap, Sparkles, Building2, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

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

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRequestOtp = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setStep("otp");
      setMessage("OTP sent to your email.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    const otpString = otp.join("");
    if (otpString.length < 6) {
      setError("Please enter the full 6-digit OTP");
      return;
    }
    setStep("reset");
    setError("");
    setMessage("");
  };

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", {
        email,
        otp: otp.join(""),
        password,
        password_confirmation: confirmPassword
      });
      setMessage("Password reset successfully! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)",
      position: 'relative',
      overflow: 'hidden'
    }}>
      <FloatingIcon delay={0} initialX={100} initialY={100}><GraduationCap size={120} /></FloatingIcon>
      <FloatingIcon delay={1} initialX={-200} initialY={300}><Building2 size={80} /></FloatingIcon>
      <FloatingIcon delay={2} initialX={300} initialY={-200}><Sparkles size={100} /></FloatingIcon>

      <Container maxWidth="sm">
        <Box sx={{ mb: 4 }}>
          <IconButton onClick={() => step === "email" ? router.push("/login") : setStep(step === "otp" ? "email" : "otp")} sx={{ color: "#00796b", mb: 2 }}>
            <ArrowLeft size={24} />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#004d40", mb: 1 }}>
            {step === "email" ? "Forgot Password?" : step === "otp" ? "Verify OTP" : "Reset Password"}
          </Typography>
          <Typography variant="body1" sx={{ color: "#00796b", opacity: 0.8 }}>
            {step === "email" ? "Enter your email to receive a password reset code." : step === "otp" ? `Enter the 6-digit code sent to ${email}` : "Create a new secure password for your account."}
          </Typography>
        </Box>

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
          <AnimatePresence mode="wait">
            {step === "email" && (
              <motion.div key="email" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
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
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.5)' } }}
                  />
                  {error && <Typography color="error" variant="body2" align="center">{error}</Typography>}
                  <Button variant="contained" size="large" onClick={handleRequestOtp} disabled={loading} sx={{ py: 1.8, borderRadius: 3, bgcolor: '#00796b', fontWeight: 700 }}>
                    {loading ? "Sending..." : "Send Reset Code"}
                  </Button>
                </Stack>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <Stack spacing={4} alignItems="center">
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {otp.map((digit, idx) => (
                      <TextField
                        key={idx}
                        id={`otp-${idx}`}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        inputProps={{ maxLength: 1 }}
                        sx={{ 
                          width: { xs: 45, sm: 60 },
                          '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.5)' },
                          '& .MuiInputBase-input': { textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, padding: '12px' }
                        }}
                      />
                    ))}
                  </Box>
                  {error && <Typography color="error" variant="body2" align="center">{error}</Typography>}
                  {message && <Typography color="success.main" variant="body2" align="center">{message}</Typography>}
                  <Button variant="contained" fullWidth size="large" onClick={handleVerifyOtp} sx={{ py: 1.8, borderRadius: 3, bgcolor: '#00796b', fontWeight: 700 }}>
                    Verify Code
                  </Button>
                  <Button variant="text" onClick={handleRequestOtp} disabled={loading} sx={{ color: '#00796b', fontWeight: 600 }}>
                    Resend Code
                  </Button>
                </Stack>
              </motion.div>
            )}

            {step === "reset" && (
              <motion.div key="reset" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <Stack spacing={3}>
                  <TextField 
                    label="New Password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    fullWidth 
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyRound size={18} color="#00796b" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.5)' } }}
                  />
                  <TextField 
                    label="Confirm New Password" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    fullWidth 
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <ShieldCheck size={18} color="#00796b" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.5)' } }}
                  />
                  {error && <Typography color="error" variant="body2" align="center">{error}</Typography>}
                  {message && <Typography color="success.main" variant="body2" align="center">{message}</Typography>}
                  <Button variant="contained" size="large" onClick={handleResetPassword} disabled={loading} sx={{ py: 1.8, borderRadius: 3, bgcolor: '#00796b', fontWeight: 700 }}>
                    {loading ? "Resetting..." : "Update Password"}
                  </Button>
                </Stack>
              </motion.div>
            )}
          </AnimatePresence>
        </Paper>

        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.7, letterSpacing: 1 }}>
            © 2026 IIT-ISM DHANBAD PLACEMENT CELL
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
