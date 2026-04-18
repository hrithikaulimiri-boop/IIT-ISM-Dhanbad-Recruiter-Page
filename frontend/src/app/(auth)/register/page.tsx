"use client";

import { useState, useEffect } from "react";
import { Box, Button, Grid2 as Grid, MenuItem, Paper, Stack, TextField, Typography, Container, InputAdornment, OutlinedInput, Select, FormControl, InputLabel, Chip, Checkbox, CircularProgress } from "@mui/material";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { companyCountries, companySectors } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Building2, Sparkles, User, Mail, Lock, MapPin, Globe, Phone, Calendar } from "lucide-react";

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

export default function RegisterPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("register");
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const emptyContact = () => ({ name: "", designation: "", email: "", phone: "" });
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    company_name: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    postal_address: "",
    phone: "",
    landline: "",
    company_website: "",
    company_social_media: "",
    company_established_year: "",
    company_turnover: "",
    num_employees: "",
    company_sectors: [] as string[],
    contact_hr: { ...emptyContact(), designation: "Head of Talent Acquisition" },
    contact_2: emptyContact(),
    contact_3: emptyContact(),
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isRobotVerified, setIsRobotVerified] = useState(false);
  const [isVerifyingRobot, setIsVerifyingRobot] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (verificationMode && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [verificationMode, timer]);

  const handleAutofillHR = () => {
    setForm((prev) => ({
      ...prev,
      contact_hr: {
        ...prev.contact_hr,
        name: prev.name,
        email: prev.email,
        phone: prev.phone,
      },
    }));
  };

  const handleAutofillPostalAddress = () => {
    const fullAddress = `${form.street}, ${form.city}, ${form.state}, ${form.country} - ${form.pincode}`;
    setForm((prev) => ({
      ...prev,
      postal_address: fullAddress,
    }));
  };

  const handleCopyContact = (target: "contact_2" | "contact_3", source: "contact_hr" | "contact_2") => {
    const sourceData = source === "contact_hr" ? form.contact_hr : form.contact_2;
    setForm((prev) => ({
      ...prev,
      [target]: {
        ...sourceData,
      },
    }));
  };

  const normalizeWebsiteUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const isWebsitePlausible = (raw: string) => {
    const u = normalizeWebsiteUrl(raw);
    try {
      const parsed = new URL(u);
      const host = parsed.hostname || "";
      if (!host) return false;
      // Allow real domains, localhost (dev), and numeric IPs
      if (host === "localhost" || host.endsWith(".local")) return true;
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
      return host.includes(".");
    } catch {
      return false;
    }
  };

  const contactOk = (c: { name: string; designation: string; email: string; phone: string }) =>
    c.name.trim().length > 0 &&
    c.designation.trim().length > 0 &&
    /^\S+@\S+\.\S+$/.test(c.email) &&
    c.phone.trim().length > 0;

  const contact3Ok =
    !form.contact_3.name.trim() && !form.contact_3.email.trim()
      ? true
      : contactOk(form.contact_3);

  const getValidationError = () => {
    if (form.name.trim().length === 0) return "Contact name is required";
    if (form.email.trim().length === 0) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Invalid email format";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (form.company_name.trim().length === 0) return "Company name is required";
    if (form.street.trim().length === 0) return "Street is required";
    if (form.city.trim().length === 0) return "City is required";
    if (form.country.trim().length === 0) return "Country is required";
    if (form.pincode.trim().length === 0) return "Pincode is required";
    if (form.postal_address.trim().length === 0) return "Postal address is required";
    if (form.phone.trim().length === 0) return "Phone number is required";
    const estYear = Number(form.company_established_year);
    if (!/^\d{4}$/.test(form.company_established_year) || estYear < 1800) return "Establishment year must be 4 digits and 1800 or later";
    if (!isWebsitePlausible(form.company_website)) return "Company website is invalid (e.g. company.com)";
    if (form.company_turnover.trim().length === 0) return "Company turnover is required";
    if (form.num_employees.trim().length === 0) return "Number of employees is required";
    if (form.company_sectors.length === 0) return "At least one company sector is required";
    if (!contactOk(form.contact_hr)) return "Contact person 1 details are incomplete or email is invalid";
    if (!contactOk(form.contact_2)) return "Contact person 2 details are incomplete or email is invalid";
    if (!contact3Ok) return "Contact person 3 details are incomplete or email is invalid";
    if (!isRobotVerified) return "Please verify that you are not a robot";
    return null;
  };

  const submit = async () => {
    setMessage("");
    setError("");

    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const socialRaw = form.company_social_media.trim();
      const payload = {
        ...form,
        company_website: normalizeWebsiteUrl(form.company_website),
        company_social_media: socialRaw.includes("http") || socialRaw.includes(".")
          ? normalizeWebsiteUrl(socialRaw)
          : socialRaw,
        company_established_year: Number(form.company_established_year),
        num_employees: Number(form.num_employees),
      };
      await api.post("/auth/register-request", payload);
      setVerificationMode(true);
      setTimer(60);
      setCanResend(false);
      setMessage("Verification code sent to your email.");
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      setError(axiosErr.response?.data?.message || "Registration failed. Please check your details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const socialRaw = form.company_social_media.trim();
      const normalizedData = {
        ...form,
        company_website: normalizeWebsiteUrl(form.company_website),
        company_social_media: socialRaw.includes("http") || socialRaw.includes(".")
          ? normalizeWebsiteUrl(socialRaw)
          : socialRaw,
        company_established_year: Number(form.company_established_year),
        num_employees: Number(form.num_employees),
      };

      await api.post("/auth/verify-otp", { 
        email: form.email, 
        otp: code, 
        registration_data: normalizedData 
      });
      setMessage("Account registered successfully! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      if (axiosErr.response?.data?.errors) {
        const firstError = Object.values(axiosErr.response.data.errors)[0][0];
        setError(firstError);
      } else {
        setError(axiosErr.response?.data?.message || "Verification failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setError("");
    setMessage("Sending new OTP...");
    try {
      await api.post("/auth/resend-otp", { email: form.email });
      setTimer(60);
      setCanResend(false);
      setMessage("New OTP sent to your email.");
    } catch (err) {
      setError("Failed to resend OTP.");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
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

  if (!mounted) {
    // Return null during hydration to avoid mismatch.
    return null;
  }

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)",
      position: 'relative',
      overflowX: 'hidden',
      py: 8
    }}>
      {/* Animated Background Elements */}
      <FloatingIcon delay={0} initialX={100} initialY={100}><GraduationCap size={120} /></FloatingIcon>
      <FloatingIcon delay={1} initialX={-200} initialY={300}><Building2 size={80} /></FloatingIcon>
      <FloatingIcon delay={2} initialX={300} initialY={-200}><Sparkles size={100} /></FloatingIcon>

      <Container maxWidth="lg">
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
                color: "#004d40", 
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
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 3, md: 6 }, 
              borderRadius: 8,
              backdropFilter: "blur(20px)",
              bgcolor: "rgba(255, 255, 255, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              boxShadow: '0 20px 60px rgba(0,0,0,0.05)'
            }}
          >
            {verificationMode ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, color: '#004d40' }}>
                  Complete Email Verification
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
                  Enter the 6 digit OTP sent to your email for verification
                </Typography>
                
                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
                  {otp.map((digit, idx) => (
                    <TextField
                      key={idx}
                      id={`otp-${idx}`}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      inputProps={{ 
                        maxLength: 1
                      }}
                      sx={{ 
                        width: { xs: 45, sm: 60 },
                        '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.5)' },
                        '& .MuiInputBase-input': { textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, padding: '12px' }
                      }}
                    />
                  ))}
                </Stack>

                <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary', fontWeight: 500 }}>
                  {timer > 0 ? (
                    `Resend OTP in ${timer} seconds`
                  ) : (
                    <Button 
                      onClick={handleResendOtp} 
                      disabled={!canResend}
                      sx={{ color: '#00796b', fontWeight: 700, textTransform: 'none' }}
                    >
                      Resend OTP
                    </Button>
                  )}
                </Typography>

                <Button 
                  fullWidth
                  variant="contained" 
                  size="large"
                  onClick={handleVerifyOtp}
                  disabled={isSubmitting}
                  sx={{ 
                    py: 2,
                    borderRadius: 4,
                    textTransform: 'none',
                    fontSize: '1.2rem',
                    bgcolor: '#00796b',
                    fontWeight: 700,
                    boxShadow: '0 10px 20px rgba(0,121,107,0.2)',
                    '&:hover': { bgcolor: '#00695c' }
                  }}
                >
                  {isSubmitting ? "Verifying..." : "Complete Verification"}
                </Button>

                {error && (
                  <Typography color="error" sx={{ mt: 3, fontWeight: 600 }}>
                    {error}
                  </Typography>
                )}
                {message && (
                  <Typography color="success.main" sx={{ mt: 3, fontWeight: 600 }}>
                    {message}
                  </Typography>
                )}
              </Box>
            ) : (
              <>
                {/* Tab Toggle */}
                <Box sx={{ 
                  display: 'flex', 
                  bgcolor: 'rgba(0,0,0,0.03)', 
                  borderRadius: 4, 
                  p: 0.5, 
                  mb: 6,
                  maxWidth: 400,
                  mx: 'auto'
                }}>
                  <Button
                    fullWidth
                    onClick={() => router.push("/login")}
                    sx={{ 
                      borderRadius: 3.5, 
                      py: 1.5,
                      color: "text.secondary",
                      bgcolor: "transparent",
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' },
                      transition: 'all 0.3s ease',
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    Login Account
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => setActiveTab("register")}
                    sx={{ 
                      borderRadius: 3.5, 
                      py: 1.5,
                      color: activeTab === "register" ? "#fff" : "text.secondary",
                      bgcolor: activeTab === "register" ? "#00796b" : "transparent",
                      '&:hover': { bgcolor: activeTab === "register" ? "#00695c" : 'rgba(0,0,0,0.05)' },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    Register Account
                  </Button>
                </Box>

                <Stack spacing={4}>
                  <Box>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#004d40', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <User size={24} /> Basic Information
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField 
                          required 
                          label="Contact Name" 
                          fullWidth 
                          value={form.name} 
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField 
                          required 
                          label="Email" 
                          fullWidth 
                          value={form.email} 
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField 
                          required 
                          label="Password" 
                          type="password" 
                          fullWidth 
                          value={form.password} 
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField 
                          required 
                          label="Company Name" 
                          fullWidth 
                          value={form.company_name} 
                          onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                          sx={inputStyles}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Box>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#004d40', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <MapPin size={24} /> Company Details
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField required label="Street" fullWidth value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} sx={inputStyles} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField required label="City" fullWidth value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} sx={inputStyles} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField required label="State" fullWidth value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} sx={inputStyles} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          required
                          select
                          label="Country"
                          fullWidth
                          value={form.country}
                          onChange={(e) => setForm({ ...form, country: e.target.value })}
                          sx={inputStyles}
                        >
                          {companyCountries.map((country) => (
                            <MenuItem key={country} value={country}>{country}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField required label="Pincode" fullWidth value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} sx={inputStyles} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Stack direction="row" spacing={2} sx={{ mb: 1, alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Postal Address*</Typography>
                          <Button size="small" onClick={handleAutofillPostalAddress} sx={{ textTransform: 'none', color: '#00796b' }}>
                            Autofill from company address
                          </Button>
                        </Stack>
                        <TextField required fullWidth multiline rows={2} value={form.postal_address} onChange={(e) => setForm({ ...form, postal_address: e.target.value })} sx={inputStyles} />
                      </Grid>
                    </Grid>
                  </Box>

                  <Box>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#004d40', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Globe size={24} /> Online Presence & Financials
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField required label="Phone Number" fullWidth value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} sx={inputStyles} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField label="Landline (optional)" fullWidth value={form.landline} onChange={(e) => setForm({ ...form, landline: e.target.value })} sx={inputStyles} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField required label="Company Website" fullWidth value={form.company_website} onChange={(e) => setForm({ ...form, company_website: e.target.value })} sx={inputStyles} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField label="Social Media (optional)" fullWidth value={form.company_social_media} onChange={(e) => setForm({ ...form, company_social_media: e.target.value })} sx={inputStyles} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField required label="Year of Establishment" type="number" fullWidth value={form.company_established_year} onChange={(e) => setForm({ ...form, company_established_year: e.target.value })} sx={inputStyles} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField required label="Turnover" fullWidth value={form.company_turnover} onChange={(e) => setForm({ ...form, company_turnover: e.target.value })} sx={inputStyles} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField required label="Number of Employees" type="number" fullWidth value={form.num_employees} onChange={(e) => setForm({ ...form, num_employees: e.target.value })} sx={inputStyles} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <FormControl fullWidth sx={inputStyles}>
                          <InputLabel id="sectors-label">Category/Sector of Company*</InputLabel>
                          <Select
                            labelId="sectors-label"
                            multiple
                            value={form.company_sectors}
                            onChange={(e) => setForm({ ...form, company_sectors: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                            input={<OutlinedInput label="Category/Sector of Company*" />}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                  <Chip key={value} label={value} size="small" />
                                ))}
                              </Box>
                            )}
                          >
                            {companySectors.map((sector) => (
                              <MenuItem key={sector} value={sector}>
                                {sector}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box>
                    <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, color: '#004d40', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Phone size={24} /> Contact Persons
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                      At least two contact persons are compulsory.
                    </Typography>
                    
                    <Stack spacing={4}>
                      <Box sx={{ p: 3, bgcolor: 'rgba(0, 121, 107, 0.03)', borderRadius: 4, border: '1px solid rgba(0, 121, 107, 0.1)' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#00796b' }}>1. Head of Talent Acquisition (Compulsory)</Typography>
                          <Button size="small" variant="text" onClick={handleAutofillHR} sx={{ textTransform: 'none', color: '#00796b', fontWeight: 600 }}>
                            Autofill from registrant
                          </Button>
                        </Stack>
                        <Grid container spacing={3}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField required label="Name" fullWidth value={form.contact_hr.name} onChange={(e) => setForm({ ...form, contact_hr: { ...form.contact_hr, name: e.target.value } })} sx={inputStyles} />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField required label="Designation" fullWidth value={form.contact_hr.designation} onChange={(e) => setForm({ ...form, contact_hr: { ...form.contact_hr, designation: e.target.value } })} sx={inputStyles} />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField required label="Phone" fullWidth value={form.contact_hr.phone} onChange={(e) => setForm({ ...form, contact_hr: { ...form.contact_hr, phone: e.target.value } })} sx={inputStyles} />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField required label="Email" fullWidth value={form.contact_hr.email} onChange={(e) => setForm({ ...form, contact_hr: { ...form.contact_hr, email: e.target.value } })} sx={inputStyles} />
                          </Grid>
                        </Grid>
                      </Box>

                      <Box sx={{ p: 3, bgcolor: 'rgba(0, 121, 107, 0.03)', borderRadius: 4, border: '1px solid rgba(0, 121, 107, 0.1)' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#00796b' }}>2. Second Contact (Compulsory)</Typography>
                          <Button size="small" variant="text" onClick={() => handleCopyContact("contact_2", "contact_hr")} sx={{ textTransform: 'none', color: '#00796b', fontWeight: 600 }}>
                            Copy from Lead
                          </Button>
                        </Stack>
                        <Grid container spacing={3}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField required label="Name" fullWidth value={form.contact_2.name} onChange={(e) => setForm({ ...form, contact_2: { ...form.contact_2, name: e.target.value } })} sx={inputStyles} />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField required label="Designation" fullWidth value={form.contact_2.designation} onChange={(e) => setForm({ ...form, contact_2: { ...form.contact_2, designation: e.target.value } })} sx={inputStyles} />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField required label="Phone" fullWidth value={form.contact_2.phone} onChange={(e) => setForm({ ...form, contact_2: { ...form.contact_2, phone: e.target.value } })} sx={inputStyles} />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField required label="Email" fullWidth value={form.contact_2.email} onChange={(e) => setForm({ ...form, contact_2: { ...form.contact_2, email: e.target.value } })} sx={inputStyles} />
                          </Grid>
                        </Grid>
                      </Box>

                      <Box sx={{ p: 3, bgcolor: 'rgba(0, 121, 107, 0.03)', borderRadius: 4, border: '1px solid rgba(0, 121, 107, 0.1)' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#00796b' }}>3. Third Contact (Optional)</Typography>
                          <Button size="small" variant="text" onClick={() => handleCopyContact("contact_3", "contact_2")} sx={{ textTransform: 'none', color: '#00796b', fontWeight: 600 }}>
                            Copy from Second Contact
                          </Button>
                        </Stack>
                        <Grid container spacing={3}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField label="Name" fullWidth value={form.contact_3.name} onChange={(e) => setForm({ ...form, contact_3: { ...form.contact_3, name: e.target.value } })} sx={inputStyles} />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField label="Designation" fullWidth value={form.contact_3.designation} onChange={(e) => setForm({ ...form, contact_3: { ...form.contact_3, designation: e.target.value } })} sx={inputStyles} />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField label="Phone" fullWidth value={form.contact_3.phone} onChange={(e) => setForm({ ...form, contact_3: { ...form.contact_3, phone: e.target.value } })} sx={inputStyles} />
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <TextField label="Email" fullWidth value={form.contact_3.email} onChange={(e) => setForm({ ...form, contact_3: { ...form.contact_3, email: e.target.value } })} sx={inputStyles} />
                          </Grid>
                        </Grid>
                      </Box>
                    </Stack>
                  </Box>

                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        p: 2, 
                        bgcolor: 'rgba(0,0,0,0.02)', 
                        borderRadius: 3, 
                        border: '1px solid rgba(0,0,0,0.1)',
                        maxWidth: 300,
                        mx: 'auto'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        {isVerifyingRobot ? (
                          <CircularProgress size={24} sx={{ m: 1, color: '#00796b' }} />
                        ) : (
                          <Checkbox 
                            checked={isRobotVerified}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setIsVerifyingRobot(true);
                                setTimeout(() => {
                                  setIsVerifyingRobot(false);
                                  setIsRobotVerified(true);
                                }, 1500);
                              } else {
                                setIsRobotVerified(false);
                              }
                            }}
                            sx={{ 
                              color: '#00796b',
                              '&.Mui-checked': { color: '#00796b' }
                            }}
                          />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#004d40' }}>
                          I'm not a robot
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', ml: 2 }}>
                        <img 
                          src="https://www.gstatic.com/recaptcha/api2/logo_48.png" 
                          alt="reCAPTCHA" 
                          style={{ width: 30, height: 30, opacity: 0.8 }} 
                        />
                        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', color: 'text.secondary' }}>
                          reCAPTCHA
                        </Typography>
                      </Box>
                    </Box>

                    {error && (
                      <Typography color="error" align="center" sx={{ fontWeight: 600 }}>
                        {error}
                      </Typography>
                    )}

                    <Button 
                      variant="contained" 
                      size="large"
                      onClick={submit} 
                      disabled={isSubmitting || isVerifyingRobot}
                      sx={{ 
                        py: 2,
                        borderRadius: 4,
                        textTransform: 'none',
                        fontSize: '1.2rem',
                        bgcolor: '#00796b',
                        fontWeight: 700,
                        boxShadow: '0 10px 20px rgba(0,121,107,0.2)',
                        '&:hover': { bgcolor: '#00695c', boxShadow: '0 12px 24px rgba(0,121,107,0.3)' }
                      }}
                    >
                      {isSubmitting ? "Processing..." : "Complete Email Verification"}
                    </Button>
                </Stack>
              </>
            )}
          </Paper>
        </motion.div>

        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.7, letterSpacing: 1 }}>
            © 2026 IIT-ISM DHANBAD PLACEMENT CELL
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

const inputStyles = {
  '& .MuiOutlinedInput-root': { 
    borderRadius: 3,
    bgcolor: 'rgba(255,255,255,0.4)',
    transition: 'all 0.2s',
    '&:hover': {
      bgcolor: 'rgba(255,255,255,0.6)',
    },
    '&.Mui-focused': {
      bgcolor: 'rgba(255,255,255,0.8)',
    }
  }
};

