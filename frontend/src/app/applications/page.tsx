"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Button,
  IconButton,
  Tooltip as MuiTooltip,
  TableContainer,
  Menu,
  MenuItem,
  Checkbox,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid2 as Grid,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { authHeaders } from "@/lib/authHeaders";
import { useRouter, useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import { Filter, Download, FileText, ChevronDown, Check, X, Search, MoreVertical, Edit3, Trash2, Calendar, MapPin, ExternalLink, FilterX, XCircle, Building2, Briefcase, GraduationCap, IndianRupee, Clock, Eye, ShieldCheck, User, Mail, Phone, ListChecks, Info, AlertCircle, Globe, Award, BrainCircuit } from "lucide-react";

type ApplicationRow = {
  id: number;
  job_id: number;
  profile_name?: string;
  company_name?: string;
  status: string; // Updated to handle raw backend statuses
  is_withdrawn?: boolean;
  is_editable?: boolean;
  admin_edited?: boolean;
  created_at?: string;
  last_completed_step?: number;
  job_type?: string;
};

const DetailItem = ({ label, value, icon, isLink = false, fullWidth = false }: { label: string, value: any, icon?: React.ReactNode, isLink?: boolean, fullWidth?: boolean }) => (
  <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2, height: '100%', gridColumn: fullWidth ? 'span 12' : 'span 1' }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Typography>
    <Stack direction="row" spacing={1} alignItems={typeof value === 'string' && value.length > 50 ? 'flex-start' : 'center'} sx={{ mt: 1 }}>
      {icon && <Box sx={{ color: '#00796b', mt: typeof value === 'string' && value.length > 50 ? 0.5 : 0 }}>{icon}</Box>}
      {isLink && value ? (
        <Typography 
          component="a" 
          href={value.startsWith('http') ? value : `https://${value}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          sx={{ fontWeight: 600, color: '#00796b', textDecoration: 'none', '&:hover': { textDecoration: 'underline' }, display: 'flex', alignItems: 'center', gap: 0.5, wordBreak: 'break-all' }}
        >
          {value} <ExternalLink size={14} />
        </Typography>
      ) : (
        <Typography sx={{ fontWeight: 600, color: '#004d40', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {Array.isArray(value) ? value.join(', ') : (value === true ? "Yes" : (value === false ? "No" : (value || "N/A")))}
        </Typography>
      )}
    </Stack>
  </Box>
);

const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
  <Typography variant="h6" sx={{ color: '#004d40', fontWeight: 800, mb: 2, mt: 1, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '2px solid rgba(0,121,107,0.1)', pb: 1 }}>
    <Icon size={22} /> {title}
  </Typography>
);

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [fetchingJob, setFetchingJob] = useState(false);
  const latestRequestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const isAdmin = (session?.user as any)?.role === "admin";

  const fetchJobDetails = async (jobId: number) => {
    if (!session) return;
    setFetchingJob(true);
    try {
      const res = await api.get(`/jobs/${jobId}`, { headers: authHeaders(session) });
      setSelectedJob(res.data);
    } catch (err) {
      console.error("Failed to fetch job details:", err);
      setError("Failed to fetch job details");
    } finally {
      setFetchingJob(false);
    }
  };

  useEffect(() => {
    // Sync filters with URL params once on initial load or search params change
    const statusParam = searchParams.get('status');
    const portalParam = searchParams.get('portal');
    
    setFilterStatus(statusParam ? [statusParam] : []);
    setFilterType(portalParam ? [portalParam] : []);
    
    load();
  }, [searchParams, session]);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    const requestId = ++latestRequestIdRef.current;
    
    try {
      const res = await api.get("/applications", { headers: authHeaders(session) });
      if (requestId !== latestRequestIdRef.current) return;
      setRows(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) {
      if (requestId === latestRequestIdRef.current) {
        console.error("Load failed:", err);
        setError("Failed to fetch applications");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const filteredApplications = Array.isArray(rows) ? rows.filter(app => {
    const jobType = (app as any).job_type || (app as any).type || 'JNF';
    const matchesType = filterType.length === 0 || filterType.includes(jobType);
    
    // Status Logic: 
    // 1. "draft" matches both "draft" and "pending"
    // 2. "submitted" matches "submitted", "approved", and "rejected"
    let matchesStatus = filterStatus.length === 0;
    if (!matchesStatus) {
      matchesStatus = filterStatus.some(s => {
        const currentStatus = app.status as string;
        if (s === 'draft') return (currentStatus === 'draft' || currentStatus === 'pending') && !app.is_withdrawn;
        if (s === 'submitted') {
          if (isAdmin) return currentStatus === 'submitted';
          return ['submitted', 'approved', 'rejected'].includes(currentStatus);
        }
        if (s === 'withdrawn') return app.is_withdrawn || currentStatus === 'withdrawn';
        return currentStatus === s;
      });
    }
    
    return matchesType && matchesStatus;
  }) : [];

  const toggleFilter = (type: 'type' | 'status', value: string) => {
    if (type === 'type') {
      setFilterType(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    } else {
      setFilterStatus(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    }
  };

  const clearFilters = () => {
    setFilterType([]);
    setFilterStatus([]);
  };

  const updateStatus = async (id: number, next: "selected" | "rejected") => {
    if (!session) return;
    setMessage("");
    setError("");
    try {
      await api.put(
        `/applications/${id}`,
        { status: next, is_job: true },
        { headers: { ...authHeaders(session), "Content-Type": "application/json" } }
      );
      setMessage(`Application ${next === 'selected' ? 'approved' : 'rejected'} successfully.`);
      await load();
    } catch (err) {
      setError("Failed to update application status.");
    }
  };

  useEffect(() => {
    setIsMounted(true);
    mountedRef.current = true;
    load();
    return () => {
      // We don't set it to false here because we want subsequent effects in the same mount lifecycle to work
    };
  }, [session, filterType, filterStatus]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  const startEditSubmitted = (row: ApplicationRow, editMode: boolean = false) => {
    if (!session) return;
    // Redirect to jobs page with the specific job ID and mode
    const mode = editMode ? "editMode=true" : "viewMode=true";
    router.push(`/jobs?resumeId=${row.job_id}&${mode}`);
  };

  const withdraw = async (id: number) => {
    if (!session) return;
    if (!window.confirm("Withdraw this submission? It will be moved back to drafts.")) return;
    setMessage("");
    setError("");
    try {
      await api.post(`/applications/${id}/withdraw`, {}, { headers: authHeaders(session) });
      setMessage("Submission withdrawn.");
      await load();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || "Failed to withdraw submission.");
    }
  };

  const deleteApplication = async (id: number) => {
    if (!session) return;
    if (!window.confirm("Are you sure you want to delete this profile? This action cannot be undone.")) return;
    setMessage("");
    setError("");
    try {
      await api.delete(`/applications/${id}`, { headers: authHeaders(session) });
      setMessage("Profile deleted successfully.");
      await load();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || "Failed to delete profile.");
    }
  };

  const steps = ["Company + Job", "Eligibility", "Salary", "Hiring Stages", "Declaration"];

  const getStatusChip = (row: ApplicationRow) => {
    if (row.is_withdrawn || row.status === 'withdrawn') return <Chip label="Withdrawn" size="small" variant="outlined" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }} />;
    
    const statusMap: Record<string, { label: string; color: "success" | "error" | "warning" | "info" | "default" }> = {
      "submitted": { label: "Submitted", color: "info" as const },
      "approved": { label: "Approved", color: "success" as const },
      "rejected": { label: "Rejected", color: "error" as const },
      "selected": { label: "Approved", color: "success" as const },
      "pending": { label: "Pending", color: "warning" as const },
      "draft": { label: "Pending", color: "warning" as const },
      "in progress": { label: "In Progress", color: "warning" as const },
    };
    
    const config = statusMap[row.status] || { label: row.status, color: "default" as const };
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip 
          label={config.label} 
          color={config.color} 
          size="small" 
          sx={{ 
            fontWeight: 900, 
            textTransform: 'uppercase', 
            fontSize: '0.65rem',
            letterSpacing: 1,
            px: 1,
            ...(row.status === 'approved' || row.status === 'selected' ? {
              bgcolor: '#e8f5e9',
              color: '#2e7d32',
              border: '1px solid #c8e6c9',
              boxShadow: '0 2px 8px rgba(46, 125, 50, 0.15)'
            } : row.status === 'rejected' ? {
              bgcolor: '#ffebee',
              color: '#c62828',
              border: '1px solid #ffcdd2',
              boxShadow: '0 2px 8px rgba(198, 40, 40, 0.15)'
            } : row.status === 'draft' || row.status === 'pending' ? {
              bgcolor: '#fff3e0',
              color: '#ef6c00',
              border: '1px solid #ffe0b2',
            } : {})
          }} 
        />
        {row.status === 'submitted' && row.created_at && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            on {new Date(row.created_at).toLocaleString('en-IN', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Typography>
        )}
        {(row.status === 'approved' || row.status === 'selected' || row.status === 'rejected') && row.created_at && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            on {new Date(row.created_at).toLocaleString('en-IN', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Typography>
        )}
        {row.status === 'draft' && row.created_at && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            withdrawn on {new Date(row.created_at).toLocaleString('en-IN', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Typography>
        )}
      </Stack>
    );
  };

  const getTitle = () => {
    const portalType = filterType.length === 1 ? filterType[0] : null;
    const statusFilter = filterStatus.length === 1 ? filterStatus[0] : null;
    if (isAdmin) {
      if (statusFilter === "in progress") return "Pending Approval Submissions";
      if (portalType === "JNF") return "JNF Submissions";
      if (portalType === "INF") return "INF Submissions";
      return "All Company Submissions";
    }
    if (portalType === "JNF") return "My JNF Applications";
    if (portalType === "INF") return "My INF Applications";
    return "All My Applications";
  };

  return (
    <AppShell>
      <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, md: 4 } }}>
        <Stack direction="row" spacing={2} sx={{ mb: 4 }} alignItems="center">
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#004d40', flexGrow: 1, letterSpacing: -1 }}>
            {filterStatus.length === 1 && filterStatus[0] === 'approved' ? 'Approved Submissions' : 
             filterStatus.length === 1 && filterStatus[0] === 'rejected' ? 'Rejected Submissions' :
             filterStatus.length === 1 && filterStatus[0] === 'submitted' && isAdmin ? 'Pending for Approval' :
             filterType.length === 1 ? `${filterType[0]} Submissions` : 'All Applications'}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ bgcolor: 'rgba(255,255,255,0.5)', p: 0.5, borderRadius: 3, border: '1px solid rgba(0,121,107,0.1)' }}>
          <MuiTooltip title="Filter Options">
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: '#00796b' }}>
              <Filter size={20} />
            </IconButton>
          </MuiTooltip>
          {(filterType.length > 0 || filterStatus.length > 0) && (
            <MuiTooltip title="Clear All Filters">
              <IconButton onClick={clearFilters} sx={{ color: '#c62828' }}>
                <FilterX size={20} />
              </IconButton>
            </MuiTooltip>
          )}
        </Stack>
        </Stack>

        {message && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9", borderRadius: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{message}</Typography>
          </Paper>
        )}
        {error && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2", borderRadius: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{error}</Typography>
          </Paper>
        )}

        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: "hidden", border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)' }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead sx={{ bgcolor: "rgba(0,121,107,0.05)" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3, pl: 4 }}>JOB PROFILE</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>TYPE</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>COMPANY</TableCell>}
                  <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3, textAlign: 'right', pr: 4 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4} align="center" sx={{ py: 12 }}>
                      <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                        No applications found matching your criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((row) => (
                    <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ pl: 4 }}>
                        <Typography 
                          variant="subtitle2" 
                          onClick={() => fetchJobDetails(row.job_id)}
                          sx={{ 
                            fontWeight: 700, 
                            color: '#004d40', 
                            cursor: 'pointer',
                            '&:hover': { color: '#00796b', textDecoration: 'underline' }
                          }}
                        >
                          {row.profile_name || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={row.job_type || (row as any).type || "JNF"} 
                          size="small" 
                          sx={{ 
                            fontWeight: 800, 
                            bgcolor: (row.job_type || (row as any).type) === 'INF' ? '#e0f2f1' : '#e0f7fa',
                            color: (row.job_type || (row as any).type) === 'INF' ? '#00695c' : '#006064'
                          }} 
                        />
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#00695c' }}>
                            {row.company_name || "N/A"}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell>
                        {getStatusChip(row)}
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 4 }}>
                        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                          <MuiTooltip title="Quick View">
                            <IconButton 
                              size="small" 
                              onClick={() => fetchJobDetails(row.job_id)} 
                              sx={{ color: '#00796b', bgcolor: 'rgba(0,121,107,0.05)', '&:hover': { bgcolor: 'rgba(0,121,107,0.1)' } }}
                            >
                              <Eye size={18} />
                            </IconButton>
                          </MuiTooltip>
                          {isAdmin && (row.status === 'in progress' || row.status === 'submitted') && (
                            <>
                              {!row.admin_edited && (
                                <MuiTooltip title="One-time Edit">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => startEditSubmitted(row, true)} 
                                    sx={{ color: '#0288d1', bgcolor: 'rgba(2,136,209,0.05)', '&:hover': { bgcolor: 'rgba(2,136,209,0.1)' } }}
                                  >
                                    <Edit3 size={18} />
                                  </IconButton>
                                </MuiTooltip>
                              )}
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => updateStatus(row.id, 'selected')}
                                sx={{ 
                                  borderRadius: 2, 
                                  textTransform: 'none', 
                                  fontWeight: 800,
                                  background: 'linear-gradient(135deg, #00796b 0%, #004d40 100%)',
                                  px: 2
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => updateStatus(row.id, 'rejected')}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, px: 2 }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {!isAdmin && (
                            <>
                              {row.is_editable ? (
                                <MuiTooltip title="Edit Profile">
                                  <IconButton 
                                    size="small" 
                                    onClick={() => startEditSubmitted(row, true)} 
                                    sx={{ color: '#00796b', bgcolor: 'rgba(0,121,107,0.05)', '&:hover': { bgcolor: 'rgba(0,121,107,0.1)' } }}
                                  >
                                    <Edit3 size={18} />
                                  </IconButton>
                                </MuiTooltip>
                              ) : (
                                <MuiTooltip title="Edits Locked">
                                  <span>
                                    <IconButton size="small" disabled sx={{ opacity: 0.3 }}>
                                      <XCircle size={18} />
                                    </IconButton>
                                  </span>
                                </MuiTooltip>
                              )}
                              {!row.is_withdrawn && (
                                <MuiTooltip title="Withdraw Submission">
                                  <IconButton 
                                    size="small" 
                                    color="warning" 
                                    onClick={() => withdraw(row.id)}
                                    sx={{ bgcolor: 'rgba(237,108,2,0.05)', '&:hover': { bgcolor: 'rgba(237,108,2,0.1)' } }}
                                  >
                                    <Trash2 size={18} />
                                  </IconButton>
                                </MuiTooltip>
                              )}
                            </>
                          )}
                          {isAdmin && (row.status === 'selected' || row.status === 'rejected' || row.status === 'approved' || row.status === 'selected') && (
                             <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', py: 1 }}>
                               Decision Finalized
                             </Typography>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </TableContainer>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: { borderRadius: 3, mt: 1, minWidth: 200, p: 1, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' } }}
        >
          {/* Hide TYPE filter if pre-filtered by portal from dashboard */}
          {!searchParams.get('portal') && (
            <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', fontWeight: 800, color: 'text.secondary' }}>TYPE</Typography>
          )}
          {!searchParams.get('portal') && ['JNF', 'INF'].map(type => (
            <MenuItem key={type} onClick={() => toggleFilter('type', type)} sx={{ borderRadius: 2, gap: 2 }}>
              <Checkbox size="small" checked={filterType.includes(type)} sx={{ p: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{type}</Typography>
            </MenuItem>
          ))}
          {!searchParams.get('portal') && (
            <Divider sx={{ my: 1 }} />
          )}

          {/* Hide STATUS filter if pre-filtered by status from dashboard */}
          {!searchParams.get('status') && (
            <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', fontWeight: 800, color: 'text.secondary' }}>STATUS</Typography>
          )}
          {!searchParams.get('status') && (isAdmin ? (
            [
              { id: 'submitted', label: 'Pending for Approval' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'withdrawn', label: 'Withdrawn' }
            ]
          ) : (
            [
              { id: 'draft', label: 'Pending' },
              { id: 'submitted', label: 'Submitted' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'withdrawn', label: 'Withdrawn' }
            ]
          )).map(status => (
            <MenuItem key={status.id} onClick={() => toggleFilter('status', status.id)} sx={{ borderRadius: 2, gap: 2 }}>
              <Checkbox size="small" checked={filterStatus.includes(status.id)} sx={{ p: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{status.label}</Typography>
            </MenuItem>
          ))}
        </Menu>

        {/* View Details Dialog */}
        <Dialog 
          open={!!selectedJob} 
          onClose={() => setSelectedJob(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 4, p: 2 } }}
        >
          <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" component="span" sx={{ fontWeight: 800, color: '#004d40' }}>
              {selectedJob?.job_type} Profile: {selectedJob?.profile_name}
            </Typography>
            <IconButton onClick={() => setSelectedJob(null)}><X /></IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: { xs: 2, md: 4 }, bgcolor: 'rgba(0,0,0,0.01)' }}>
            {selectedJob && (
              <Stack spacing={5}>
                {/* 1. Company Section */}
                <Box>
                  <SectionHeader icon={Building2} title="Company Information" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}><DetailItem label="Company Name" value={selectedJob.company?.name} icon={<Building2 size={18} />} /></Grid>
                    <Grid size={{ xs: 12, md: 6 }}><DetailItem label="Website" value={selectedJob.company?.website} icon={<ExternalLink size={18} />} isLink /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Sector" value={selectedJob.company?.sector} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Employees" value={selectedJob.company?.employee_count} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Turnover" value={selectedJob.company?.annual_turnover} /></Grid>
                    <Grid size={{ xs: 12 }}><DetailItem label="Postal Address" value={selectedJob.company?.postal_address} icon={<MapPin size={18} />} /></Grid>
                  </Grid>
                  
                  {selectedJob.company?.contacts && selectedJob.company.contacts.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2, ml: 1 }}>CONTACT PERSONS</Typography>
                      <Grid container spacing={2}>
                        {selectedJob.company.contacts.map((contact: any, idx: number) => (
                          <Grid key={idx} size={{ xs: 12, md: 6 }}>
                            <Box sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
                              <Typography sx={{ fontWeight: 800, color: '#004d40', mb: 1 }}>{contact.name}</Typography>
                              <Stack spacing={0.5}>
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 600 }}>
                                  <Briefcase size={14} /> {contact.designation}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 600 }}>
                                  <Mail size={14} /> {contact.email}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontWeight: 600 }}>
                                  <Phone size={14} /> {contact.mobile_no || contact.phone || "N/A"}
                                </Typography>
                              </Stack>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Box>

                {/* 2. Job Profile Section */}
                <Box>
                  <SectionHeader icon={Briefcase} title="Job Profile" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}><DetailItem label="Profile Name" value={selectedJob.profile_name} icon={<Briefcase size={18} />} /></Grid>
                    <Grid size={{ xs: 12, md: 6 }}><DetailItem label="Designation" value={selectedJob.job_designation} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Job Type" value={selectedJob.job_type} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Work Mode" value={selectedJob.work_mode} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Job Category" value={selectedJob.job_categories} /></Grid>
                    <Grid size={{ xs: 12, md: 6 }}><DetailItem label="General Location" value={selectedJob.location} icon={<Globe size={18} />} /></Grid>
                    <Grid size={{ xs: 12, md: 6 }}><DetailItem label="Specific Posting" value={selectedJob.place_of_posting} /></Grid>
                    
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Expected Hires" value={selectedJob.expected_hires} /></Grid>
                    {selectedJob.job_type === 'JNF' && (
                      <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Joining Month" value={selectedJob.joining_month} /></Grid>
                    )}
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Training Period" value={selectedJob.training_period} /></Grid>
                    
                    <Grid size={{ xs: 12 }}><DetailItem label="Required Skills" value={selectedJob.required_skills} icon={<ListChecks size={18} />} /></Grid>
                    <Grid size={{ xs: 12 }}><DetailItem label="Job Description" value={selectedJob.description} icon={<FileText size={18} />} fullWidth /></Grid>
                    <Grid size={{ xs: 12, md: 6 }}><DetailItem label="Bond Details" value={selectedJob.bond} icon={<ShieldCheck size={18} />} /></Grid>
                    
                    {selectedJob.job_type === 'INF' && (
                      <Grid size={{ xs: 12, md: 6 }}><DetailItem label="PPO Provision" value={selectedJob.ppo_provision} /></Grid>
                    )}
                    
                    <Grid size={{ xs: 12 }}><DetailItem label="Onboarding Procedure" value={selectedJob.onboarding_procedure} /></Grid>
                    <Grid size={{ xs: 12 }}><DetailItem label="Additional Information" value={selectedJob.additional_info || selectedJob.additional_info_1000} /></Grid>
                  </Grid>
                </Box>

                {/* 3. Eligibility Section */}
                <Box>
                  <SectionHeader icon={GraduationCap} title="Eligibility Criteria" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Min CGPA" value={selectedJob.eligibility?.global_min_cgpa} icon={<Award size={18} />} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Max Backlogs" value={selectedJob.eligibility?.global_max_backlogs} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Allow Backlogs" value={selectedJob.eligibility?.global_allow_backlogs} /></Grid>
                    <Grid size={{ xs: 12, md: 6 }}><DetailItem label="High School %" value={selectedJob.eligibility?.high_school_percentage} /></Grid>
                    <Grid size={{ xs: 12, md: 6 }}><DetailItem label="Gender Filter" value={selectedJob.eligibility?.gender_filter} /></Grid>
                  </Grid>
                  
                  {selectedJob.eligibility?.disciplines_json && selectedJob.eligibility.disciplines_json.filter((d: any) => d.selected).length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2, ml: 1 }}>SELECTED DISCIPLINES</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selectedJob.eligibility.disciplines_json.filter((d: any) => d.selected).map((d: any, idx: number) => (
                          <Chip key={idx} label={`${d.course}: ${d.discipline}`} size="small" sx={{ fontWeight: 700, bgcolor: 'rgba(0,121,107,0.05)', color: '#004d40' }} />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* 4. Salary Section */}
                <Box>
                  <SectionHeader icon={IndianRupee} title="Salary Details" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Currency" value={selectedJob.salary?.currency} icon={<IndianRupee size={18} />} /></Grid>
                    {selectedJob.job_type === 'INF' && (
                      <Grid size={{ xs: 12, md: 8 }}><DetailItem label="Internship Duration" value={selectedJob.salary?.internship_duration} icon={<Clock size={18} />} /></Grid>
                    )}
                  </Grid>
                  
                  {selectedJob.job_type === 'JNF' ? (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2, ml: 1 }}>BONUSES & PERKS</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Joining Bonus" value={selectedJob.salary?.additional_components?.global?.joining_bonus} /></Grid>
                        <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Retention Bonus" value={selectedJob.salary?.additional_components?.global?.retention_bonus} /></Grid>
                        <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Relocation" value={selectedJob.salary?.additional_components?.global?.relocation_allowance} /></Grid>
                        <Grid size={{ xs: 12, md: 6 }}><DetailItem label="ESOPs / Stocks" value={selectedJob.salary?.additional_components?.global?.esops_vest_period} /></Grid>
                        <Grid size={{ xs: 12, md: 6 }}><DetailItem label="Bond Deductions" value={selectedJob.salary?.additional_components?.global?.bond_deductions} /></Grid>
                      </Grid>
                    </Box>
                  ) : (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2, ml: 1 }}>PERKS & BENEFITS</Typography>
                      <DetailItem label="Other Perks" value={selectedJob.salary?.other_perks} fullWidth />
                    </Box>
                  )}

                  {/* Salary Structure Table (if multiple) */}
                  {(selectedJob.salary?.salaries_json || selectedJob.salary?.stipend_json) && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2, ml: 1 }}>PROGRAMME BREAKUP</Typography>
                      <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800, color: '#004d40' }}>PROGRAMME</TableCell>
                              {selectedJob.job_type === 'JNF' ? (
                                <>
                                  <TableCell sx={{ fontWeight: 800, color: '#004d40' }}>CTC</TableCell>
                                  <TableCell sx={{ fontWeight: 800, color: '#004d40' }}>FIXED</TableCell>
                                  <TableCell sx={{ fontWeight: 800, color: '#004d40' }}>MONTHLY</TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell sx={{ fontWeight: 800, color: '#004d40' }}>STIPEND</TableCell>
                                  <TableCell sx={{ fontWeight: 800, color: '#004d40' }}>HRA</TableCell>
                                  <TableCell sx={{ fontWeight: 800, color: '#004d40' }}>TOTAL</TableCell>
                                </>
                              )}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(selectedJob.salary?.salaries_json || selectedJob.salary?.stipend_json || [])
                              .filter((s: any) => s.selected)
                              .map((s: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell sx={{ fontWeight: 700 }}>{s.programme}</TableCell>
                                  {selectedJob.job_type === 'JNF' ? (
                                    <>
                                      <TableCell>{s.ctc_annual}</TableCell>
                                      <TableCell>{s.base_fixed}</TableCell>
                                      <TableCell>{s.monthly_take_home}</TableCell>
                                    </>
                                  ) : (
                                    <>
                                      <TableCell>{s.base_stipend}</TableCell>
                                      <TableCell>{s.hra}</TableCell>
                                      <TableCell>{s.total}</TableCell>
                                    </>
                                  )}
                                </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Box>

                {/* 5. Selection Process Section */}
                <Box>
                  <SectionHeader icon={Clock} title="Selection Process" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Psychometric Test" value={selectedJob.has_psychometric_test} icon={<BrainCircuit size={18} />} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Medical Test" value={selectedJob.has_medical_test} icon={<AlertCircle size={18} />} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Screening Info" value={selectedJob.other_screening_details} /></Grid>
                  </Grid>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2, ml: 1 }}>HIRING STAGES</Typography>
                    <Stack spacing={2}>
                      {selectedJob.stages?.filter((s: any) => s.duration || s.test_type).map((stage: any, idx: number) => (
                        <Box key={idx} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography sx={{ fontWeight: 800, color: '#004d40' }}>Stage {stage.sequence}: {stage.test_type}</Typography>
                            <Chip label={stage.selection_mode} size="small" sx={{ fontWeight: 700, bgcolor: '#e0f2f1', color: '#00695c' }} />
                          </Stack>
                          <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>DURATION</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{stage.duration || "N/A"}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>INTERVIEW MODE</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{stage.interview_mode || "N/A"}</Typography>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>INFRASTRUCTURE</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{stage.infrastructure_requirements || "None"}</Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Box>

                {/* 6. Declaration Section */}
                <Box>
                  <SectionHeader icon={ShieldCheck} title="Declaration & Signatory" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}><DetailItem label="Signatory Name" value={selectedJob.declaration?.authorised_signatory_name} icon={<User size={18} />} /></Grid>
                    <Grid size={{ xs: 12, md: 6 }}><DetailItem label="Designation" value={selectedJob.declaration?.authorised_signatory_designation} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Date" value={selectedJob.declaration?.authorised_signatory_date} icon={<Calendar size={18} />} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="Signature (Typed)" value={selectedJob.declaration?.typed_signature} /></Grid>
                    <Grid size={{ xs: 12, md: 4 }}><DetailItem label="RTI / NIRF Consent" value={selectedJob.declaration?.rti_nirf_consent} /></Grid>
                    <Grid size={{ xs: 12 }}><DetailItem label="Declaration Agreed" value={selectedJob.declaration?.agreed} icon={<Check size={18} />} /></Grid>
                  </Grid>
                  
                  {selectedJob.declaration?.aipc_guidelines && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 2, ml: 1 }}>AIPC GUIDELINES COMPLIANCE</Typography>
                      <Box sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
                        <Grid container spacing={1}>
                          {Object.entries(selectedJob.declaration.aipc_guidelines).map(([key, value], idx) => (
                            <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                {value ? <Check size={14} color="#2e7d32" /> : <X size={14} color="#c62828" />}
                                <Typography variant="caption" sx={{ fontWeight: 600, color: value ? '#2e7d32' : 'text.secondary' }}>
                                  {key.split('_').join(' ').toUpperCase()}
                                </Typography>
                              </Stack>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Stack>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </AppShell>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 4 }}><Typography>Loading...</Typography></Box>}>
      <ApplicationsContent />
    </Suspense>
  );
}
