"use client";

import { useState, useEffect } from "react";
import { Box, Button, Grid2 as Grid, MenuItem, Paper, Stack, TextField, Typography, Container, InputAdornment } from "@mui/material";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { courseOptions, courseToDisciplines } from "@/lib/constants";
import { motion } from "framer-motion";
import { GraduationCap, Sparkles, User, Mail, Phone, Calendar, Briefcase, Globe, MessageSquare, Award } from "lucide-react";

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
    sx={{ position: 'absolute', color: 'rgba(0, 121, 107, 0.2)' }}
  >
    {children}
  </Box>
);

export default function AlumniMentorshipPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    name: "",
    phone_number: "",
    year_of_completion: "",
    degree: "",
    discipline: "",
    current_job: "",
    areas_of_interest: "",
    linkedin_profile: "",
    general_comments: "",
    status: "draft"
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleResume = async (email: string) => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return;
    try {
      const res = await api.get(`/alumni-mentorship/resume/${email}`);
      if (res.data.data) {
        const saved = res.data.data;
        setForm({
          ...form,
          ...saved,
          general_comments: saved.general_comments || "",
          linkedin_profile: saved.linkedin_profile || "",
        });
        setMessage("Welcome back! Your previous progress has been loaded.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      // 404 is fine, means no draft exists
    }
  };

  const validateForm = (isDraft = false) => {
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) return "Valid email is required";
    
    if (!isDraft) {
      if (!form.name.trim()) return "Name is required";
      if (!form.phone_number.trim()) return "Phone number is required";
      if (!/^\d{4}$/.test(form.year_of_completion)) return "Year of completion must be 4 digits";
      if (!form.degree) return "Degree is required";
      if (!form.discipline) return "Discipline is required";
      if (!form.current_job.trim()) return "Current job is required";
      if (!form.areas_of_interest.trim()) return "Areas of interest are required";
    }
    
    if (form.linkedin_profile.trim() && !form.linkedin_profile.startsWith("http")) {
      return "If provided, LinkedIn profile must be a valid URL (starting with http/https)";
    }
    return null;
  };

  const handleSave = async (status: "draft" | "submitted") => {
    setMessage("");
    setError("");
    const validationError = validateForm(status === "draft");
    if (validationError) {
      setError(validationError);
      return;
    }

    if (status === "draft") setIsSaving(true);
    else setIsSubmitting(true);

    try {
      await api.post("/alumni-mentorship", { ...form, status });
      if (status === "draft") {
        setMessage("Draft saved successfully! You can resume using your email later.");
      } else {
        setMessage("Application submitted successfully! Redirecting to login...");
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || "Operation failed. Please try again.");
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

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
      <FloatingIcon delay={0} initialX={100} initialY={100}><GraduationCap size={120} /></FloatingIcon>
      <FloatingIcon delay={1} initialX={-200} initialY={300}><Briefcase size={80} /></FloatingIcon>
      <FloatingIcon delay={2} initialX={300} initialY={-200}><Sparkles size={100} /></FloatingIcon>
      <FloatingIcon delay={3} initialX={1000} initialY={500}><Award size={110} /></FloatingIcon>

      <Container maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 800, color: "#004d40", mb: 1 }}>
              ALUMNI MENTORSHIP
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 400, color: "#00796b", letterSpacing: 1 }}>
              IIT (ISM) DHANBAD
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
              borderRadius: 4,
              backdropFilter: "blur(20px)",
              bgcolor: "rgba(255, 255, 255, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              boxShadow: '0 20px 60px rgba(0,0,0,0.05)'
            }}
          >
            <Stack spacing={4}>
              <Box>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#004d40', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <User size={24} /> Basic Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField 
                      required
                      label="Full Name" 
                      fullWidth 
                      value={form.name} 
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      sx={inputStyles}
                      InputProps={{ startAdornment: <InputAdornment position="start"><User size={20} color="#00796b" /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField 
                      required
                      label="Email Address" 
                      fullWidth 
                      value={form.email} 
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      onBlur={(e) => handleResume(e.target.value)}
                      sx={inputStyles}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Mail size={20} color="#00796b" /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField 
                      required
                      label="Phone Number" 
                      fullWidth 
                      value={form.phone_number} 
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      sx={inputStyles}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Phone size={20} color="#00796b" /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField 
                      required
                      label="Year of Completion" 
                      fullWidth 
                      value={form.year_of_completion} 
                      onChange={(e) => setForm({ ...form, year_of_completion: e.target.value })}
                      sx={inputStyles}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Calendar size={20} color="#00796b" /></InputAdornment> }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#004d40', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <GraduationCap size={24} /> Education & Career
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      required
                      select
                      label="Degree at IIT (ISM)"
                      fullWidth
                      value={form.degree}
                      onChange={(e) => setForm({ ...form, degree: e.target.value, discipline: "" })}
                      sx={inputStyles}
                    >
                      {courseOptions.map((course) => (
                        <MenuItem key={course} value={course}>{course}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      required
                      select
                      label="Discipline"
                      fullWidth
                      disabled={!form.degree}
                      value={form.discipline}
                      onChange={(e) => setForm({ ...form, discipline: e.target.value })}
                      sx={inputStyles}
                    >
                      {form.degree ? (
                        (courseToDisciplines[form.degree as keyof typeof courseToDisciplines] || []).map((disc) => (
                          <MenuItem key={disc} value={disc}>{disc}</MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled value="">Select a degree first</MenuItem>
                      )}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField 
                      required
                      label="Current Job / Position" 
                      fullWidth 
                      value={form.current_job} 
                      onChange={(e) => setForm({ ...form, current_job: e.target.value })}
                      sx={inputStyles}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Briefcase size={20} color="#00796b" /></InputAdornment> }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField 
                      label="LinkedIn Profile Link (Optional)" 
                      fullWidth 
                      value={form.linkedin_profile} 
                      onChange={(e) => setForm({ ...form, linkedin_profile: e.target.value })}
                      sx={inputStyles}
                      InputProps={{ startAdornment: <InputAdornment position="start"><Globe size={20} color="#00796b" /></InputAdornment> }}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#004d40', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <MessageSquare size={24} /> Mentorship Interests
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField 
                      required
                      label="Areas of Interest (e.g. Entrepreneurship, Career Guidance, etc.)" 
                      fullWidth 
                      multiline
                      rows={3}
                      value={form.areas_of_interest} 
                      onChange={(e) => setForm({ ...form, areas_of_interest: e.target.value })}
                      sx={inputStyles}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField 
                      label="General Comments / Messages (Optional)" 
                      fullWidth 
                      multiline
                      rows={3}
                      value={form.general_comments} 
                      onChange={(e) => setForm({ ...form, general_comments: e.target.value })}
                      sx={inputStyles}
                    />
                  </Grid>
                </Grid>
              </Box>

              {error && <Typography color="error" align="center" sx={{ fontWeight: 600 }}>{error}</Typography>}
              {message && <Typography color="success.main" align="center" sx={{ fontWeight: 600 }}>{message}</Typography>}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button 
                  fullWidth
                  variant="contained" 
                  size="large"
                  onClick={() => handleSave("submitted")} 
                  disabled={isSubmitting || isSaving}
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
                  {isSubmitting ? "Submitting..." : "Submit Mentorship Application"}
                </Button>

                <Button 
                  fullWidth
                  variant="outlined" 
                  size="large"
                  onClick={() => handleSave("draft")} 
                  disabled={isSubmitting || isSaving}
                  sx={{ 
                    py: 2,
                    borderRadius: 4,
                    textTransform: 'none',
                    fontSize: '1.2rem',
                    color: '#00796b',
                    borderColor: '#00796b',
                    fontWeight: 700,
                    '&:hover': { borderColor: '#004d40', bgcolor: 'rgba(0,121,107,0.05)' }
                  }}
                >
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
              </Stack>
              
              <Button 
                variant="text" 
                onClick={() => router.push("/login")}
                sx={{ textTransform: 'none', color: '#004d40', fontWeight: 600 }}
              >
                Back to Login
              </Button>
            </Stack>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
}

const inputStyles = {
  '& .MuiOutlinedInput-root': { 
    borderRadius: 3,
    bgcolor: 'rgba(255,255,255,0.4)',
    transition: 'all 0.2s',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.6)' },
    '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.8)' }
  }
};
