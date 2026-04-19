"use client";

import { useRouter } from "next/navigation";
import { Box, Button, Container, Grid2 as Grid, Typography, Paper, Stack } from "@mui/material";
import { motion } from "framer-motion";
import { Briefcase, GraduationCap, ArrowRight, Sparkles } from "lucide-react";

import { IIT_ISM_LOGO } from "@/lib/logo";

export default function PortalSelectPage() {
  const router = useRouter();

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)",
      p: 4
    }}>
      <Container maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Box 
              component={motion.div} 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, rotateY: 360 }}
              transition={{ 
                rotateY: { duration: 15, repeat: Infinity, ease: "linear" },
                default: { duration: 0.8 }
              }}
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mb: 4,
                mx: 'auto',
                borderRadius: '50%',
                overflow: 'hidden',
                width: 120,
                height: 120,
                bgcolor: '#fff',
                p: 0.5,
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
              }}
            >
              <img 
                src={IIT_ISM_LOGO} 
                alt="IIT (ISM) Dhanbad Logo" 
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
              />
            </Box>
            <Typography variant="h6" sx={{ letterSpacing: 4, color: "text.secondary", fontWeight: 300, mb: 1, textTransform: 'uppercase' }}>
              Select Workspace
            </Typography>
            <Typography variant="h2" sx={{ fontWeight: 800, color: '#004d40', mb: 1, letterSpacing: -1 }}>
              CHOOSE YOUR PORTAL
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 400, color: '#00796b', opacity: 0.8 }}>
              IIT-ISM DHANBAD RECRUITMENT CELL
            </Typography>
          </Box>
        </motion.div>

        <Grid container spacing={4}>
          {[
            { 
              type: "JNF", 
              title: "Job Notification", 
              desc: "Full-time recruitment for final year students.", 
              icon: Briefcase,
              color: "#00796b"
            },
            { 
              type: "INF", 
              title: "Internship Notification", 
              desc: "Summer and winter internships for pre-final years.", 
              icon: GraduationCap,
              color: "#00897b"
            }
          ].map((portal, idx) => (
            <Grid key={portal.type} size={{ xs: 12, md: 6 }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1, duration: 0.8 }}
                whileHover={{ y: -10 }}
              >
                <Paper
                  sx={{
                    p: 5,
                    height: '100%',
                    borderRadius: 8,
                    bgcolor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.9)',
                      boxShadow: `0 30px 60px ${portal.color}20`,
                      '& .icon-box': { transform: 'scale(1.1) rotate(5deg)', bgcolor: `${portal.color}20` }
                    }
                  }}
                  onClick={() => router.push(`/login?type=${portal.type}`)}
                >
                  <Box 
                    className="icon-box"
                    sx={{ 
                      p: 3, 
                      borderRadius: 5, 
                      bgcolor: `${portal.color}10`, 
                      color: portal.color,
                      display: 'inline-flex',
                      mb: 4,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <portal.icon size={48} />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#004d40', mb: 2 }}>
                    {portal.type} PORTAL
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, fontWeight: 500, px: 2 }}>
                    {portal.desc}
                  </Typography>
                  <Button 
                    variant="contained" 
                    fullWidth
                    endIcon={<ArrowRight />}
                    sx={{ 
                      py: 2, 
                      borderRadius: 4, 
                      fontWeight: 800, 
                      fontSize: '1rem',
                      background: `linear-gradient(135deg, ${portal.color} 0%, #004d40 100%)`
                    }}
                  >
                    Enter Portal
                  </Button>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 10, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.5, letterSpacing: 1 }}>
            © 2026 IIT-ISM DHANBAD PLACEMENT CELL
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
