"use client";

import AppShell from "@/components/layout/AppShell";
import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography, Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, Stack, Divider, Button, Grid2 as Grid } from "@mui/material";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { authHeaders } from "@/lib/authHeaders";
import { Eye, Mail, Phone, Calendar, Briefcase, GraduationCap, MessageSquare, X, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AlumniApplication {
  id: number;
  email: string;
  name: string;
  phone_number: string;
  year_of_completion: string;
  degree: string;
  discipline: string;
  current_job: string;
  areas_of_interest: string;
  linkedin_profile: string;
  general_comments: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  created_at: string;
}

export default function AdminAlumniMentorshipPage() {
  const { data: session } = useSession();
  const [applications, setApplications] = useState<AlumniApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<AlumniApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (session) {
      fetchApplications();
    }
  }, [session]);

  const fetchApplications = async () => {
    try {
      const res = await api.get("/alumni-mentorship", { headers: authHeaders(session) });
      setApplications(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch alumni applications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: "approved" | "rejected") => {
    setUpdating(true);
    try {
      await api.put(`/alumni-mentorship/${id}/status`, { status }, { headers: authHeaders(session) });
      await fetchApplications();
      setSelectedApp(null);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusChip = (status: string) => {
    const colors = {
      draft: { bg: '#e0e0e0', text: '#616161' },
      submitted: { bg: '#e3f2fd', text: '#1976d2' },
      approved: { bg: '#e8f5e9', text: '#2e7d32' },
      rejected: { bg: '#ffebee', text: '#c62828' }
    };
    const color = colors[status as keyof typeof colors] || colors.draft;
    return (
      <Chip 
        label={status.toUpperCase()} 
        size="small" 
        sx={{ bgcolor: color.bg, color: color.text, fontWeight: 800, borderRadius: 1.5, fontSize: '0.65rem' }} 
      />
    );
  };

  return (
    <AppShell>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
          Alumni Mentorship Forms
        </Typography>
      </Box>

      <Paper sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: '#004d40', pl: 4 }}>NAME</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#004d40' }}>DEGREE & DISCIPLINE</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#004d40' }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#004d40' }}>YEAR</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#004d40' }}>SUBMITTED ON</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#004d40', textAlign: 'right', pr: 4 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10 }}><Typography>Loading applications...</Typography></TableCell></TableRow>
            ) : applications.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 10 }}><Typography color="text.secondary">No mentorship applications found.</Typography></TableCell></TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id} hover>
                  <TableCell sx={{ fontWeight: 700, color: '#00695c', pl: 4 }}>
                    <Stack>
                      {app.name || "N/A"}
                      <Typography variant="caption" color="text.secondary">{app.email}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{app.degree || "N/A"}</Typography>
                    <Typography variant="caption" color="text.secondary">{app.discipline || "N/A"}</Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(app.status)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{app.year_of_completion || "N/A"}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {new Date(app.created_at).toLocaleString('en-IN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell align="right" sx={{ pr: 4 }}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          onClick={() => setSelectedApp(app)}
                          sx={{ bgcolor: 'rgba(251, 140, 0, 0.1)', color: '#fb8c00', '&:hover': { bgcolor: 'rgba(251, 140, 0, 0.2)' } }}
                        >
                          <Eye size={18} />
                        </IconButton>
                      </Tooltip>
                      {app.status === 'submitted' && (
                        <>
                          <Button 
                            variant="contained" 
                            size="small" 
                            color="success"
                            onClick={() => handleStatusUpdate(app.id, 'approved')}
                            disabled={updating}
                            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="contained" 
                            size="small" 
                            color="error"
                            onClick={() => handleStatusUpdate(app.id, 'rejected')}
                            disabled={updating}
                            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog 
        open={!!selectedApp} 
        onClose={() => setSelectedApp(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, p: 2 } }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#004d40' }}>Mentor Profile</Typography>
          <IconButton onClick={() => setSelectedApp(null)}><X /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {selectedApp && (
            <Stack spacing={4}>
              <Box>
                <Typography variant="h6" sx={{ color: '#00796b', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Eye size={20} /> Personal Details
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem icon={<Eye size={18} />} label="Full Name" value={selectedApp.name} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem icon={<Mail size={18} />} label="Email" value={selectedApp.email} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem icon={<Phone size={18} />} label="Phone" value={selectedApp.phone_number} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem icon={<Calendar size={18} />} label="Graduation Year" value={selectedApp.year_of_completion} />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography variant="h6" sx={{ color: '#00796b', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GraduationCap size={20} /> Education & Professional
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem label="Degree" value={selectedApp.degree} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailItem label="Discipline" value={selectedApp.discipline} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <DetailItem icon={<Briefcase size={18} />} label="Current Job" value={selectedApp.current_job} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <DetailItem icon={<Globe size={18} />} label="LinkedIn" value={selectedApp.linkedin_profile} isLink />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography variant="h6" sx={{ color: '#00796b', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MessageSquare size={20} /> Mentorship & Comments
                </Typography>
                <Stack spacing={2}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>AREAS OF INTEREST</Typography>
                    <Typography sx={{ mt: 1, fontWeight: 500 }}>{selectedApp.areas_of_interest}</Typography>
                  </Box>
                  {selectedApp.general_comments && (
                    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>GENERAL COMMENTS</Typography>
                      <Typography sx={{ mt: 1, fontWeight: 500 }}>{selectedApp.general_comments}</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              {selectedApp.status === 'submitted' && (
                <Box sx={{ pt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button 
                    variant="contained" 
                    color="error" 
                    onClick={() => handleStatusUpdate(selectedApp.id, 'rejected')}
                    disabled={updating}
                    sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}
                  >
                    Reject Application
                  </Button>
                  <Button 
                    variant="contained" 
                    color="success" 
                    onClick={() => handleStatusUpdate(selectedApp.id, 'approved')}
                    disabled={updating}
                    sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}
                  >
                    Approve Application
                  </Button>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

const DetailItem = ({ icon, label, value, isLink }: { icon?: any, label: string, value: string, isLink?: boolean }) => (
  <Box>
    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.5 }}>{label.toUpperCase()}</Typography>
    <Stack direction="row" spacing={1} alignItems="center">
      {icon && <Box sx={{ color: '#00796b' }}>{icon}</Box>}
      {isLink ? (
        <Typography 
          component="a" 
          href={value} 
          target="_blank" 
          sx={{ color: '#00796b', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          {value}
        </Typography>
      ) : (
        <Typography sx={{ fontWeight: 600, color: '#004d40' }}>{value}</Typography>
      )}
    </Stack>
  </Box>
);
