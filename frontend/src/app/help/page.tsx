"use client";

import React from 'react';
import { Box, Typography, Paper, Container, Button, Stack, Link } from '@mui/material';
import AppShell from '@/components/layout/AppShell';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const HelpPage = () => {
  const router = useRouter();

  return (
    <AppShell>
      <Container maxWidth="md" sx={{ py: 8 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 8 },
              borderRadius: 8,
              textAlign: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.05)'
            }}
          >
            {/* Background Accent */}
            <Box
              sx={{
                position: 'absolute',
                top: -40,
                right: -40,
                opacity: 0.05,
                transform: 'rotate(15deg)',
                color: '#00796b'
              }}
            >
              <HelpOutlineIcon sx={{ fontSize: 300 }} />
            </Box>

            <Stack spacing={5} alignItems="center">
              <Box
                sx={{
                  bgcolor: 'rgba(0, 121, 107, 0.1)',
                  p: 3,
                  borderRadius: 5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00796b'
                }}
              >
                <HelpOutlineIcon sx={{ fontSize: 50 }} />
              </Box>

              <Box>
                <Typography variant="h6" sx={{ letterSpacing: 4, color: "text.secondary", fontWeight: 300, mb: 1, textTransform: 'uppercase' }}>
                  Support Center
                </Typography>
                <Typography variant="h2" gutterBottom sx={{ fontWeight: 800, color: '#004d40', letterSpacing: -1 }}>
                  Are you lost?
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 400, color: '#00796b', opacity: 0.8 }}>
                  We're here to help you navigate through the portal.
                </Typography>
              </Box>

              <Box sx={{ width: '100%', maxWidth: 550, my: 4 }}>
                <Typography variant="body1" sx={{ mb: 6, lineHeight: 1.8, color: 'text.secondary', fontSize: '1.1rem', fontWeight: 500 }}>
                  For any discrepancies, technical issues, or queries regarding the recruitment process at IIT (ISM) Dhanbad, please feel free to reach out to us.
                </Typography>

                <Stack spacing={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      borderRadius: 5,
                      bgcolor: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.8)',
                      transition: 'all 0.3s ease',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 20px rgba(0,0,0,0.03)' },
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: 'rgba(0,121,107,0.1)', borderRadius: 3, color: '#00796b' }}>
                      <EmailIcon />
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                        Email Support
                      </Typography>
                      <Link href="mailto:cdc@iitism.ac.in" underline="hover" sx={{ display: 'block', fontWeight: 800, color: '#004d40', fontSize: '1.2rem' }}>
                        cdc@iitism.ac.in
                      </Link>
                    </Box>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      borderRadius: 5,
                      bgcolor: 'rgba(255, 255, 255, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.8)',
                      transition: 'all 0.3s ease',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 20px rgba(0,0,0,0.03)' },
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: 'rgba(0,121,107,0.1)', borderRadius: 3, color: '#00796b' }}>
                      <PhoneIcon />
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                        Contact Number
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: '#004d40', fontSize: '1.2rem' }}>
                        +91 326 223 5235
                      </Typography>
                    </Box>
                  </Paper>
                </Stack>
              </Box>

              <Button
                variant="text"
                startIcon={<ArrowBackIcon />}
                onClick={() => router.back()}
                sx={{ borderRadius: 3, px: 4, py: 1.5, color: '#00796b', fontWeight: 800, fontSize: '1rem' }}
              >
                Go Back to Portal
              </Button>
            </Stack>
          </Paper>
        </motion.div>
      </Container>
    </AppShell>
  );
};

export default HelpPage;
