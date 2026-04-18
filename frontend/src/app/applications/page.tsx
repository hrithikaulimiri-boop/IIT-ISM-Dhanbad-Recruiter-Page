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
} from "@mui/material";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { authHeaders } from "@/lib/authHeaders";
import { useRouter, useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import { Edit3, Trash2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

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
};

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const portalType = (searchParams.get("portal") || "") as "INF" | "JNF" | "";
  const statusFilter = searchParams.get("status") || "";
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const latestRequestIdRef = useRef(0);
  const mountedRef = useRef(false);

  const isAdmin = (session?.user as any)?.role === "admin";

  const load = async () => {
    if (!session) return;
    setError("");
    const requestId = ++latestRequestIdRef.current;
    const params: Record<string, string> = { per_page: "200" };
    if (portalType) params.portal_type = portalType;
    if (statusFilter) params.status = statusFilter;
    
    try {
      const res = await api.get("/applications", { headers: authHeaders(session), params });
      if (!mountedRef.current || requestId !== latestRequestIdRef.current) return;
      setRows((res.data?.data || []) as ApplicationRow[]);
    } catch (err) {
      if (mountedRef.current && requestId === latestRequestIdRef.current) {
        setError("Failed to load applications.");
      }
    }
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
  }, [session, portalType, statusFilter]);

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
    if (row.is_withdrawn) return <Chip label="Withdrawn" size="small" variant="outlined" />;
    
    const statusMap: Record<string, { label: string; color: "success" | "error" | "warning" | "info" | "default" }> = {
      "submitted": { label: "Submitted", color: "info" as const },
      "approved": { label: "Approved", color: "success" as const },
      "rejected": { label: "Rejected", color: "error" as const },
      "selected": { label: "Approved", color: "success" as const },
      "pending": { label: "Pending", color: "warning" as const },
      "draft": { label: "Draft", color: "default" as const },
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
            } : {})
          }} 
        />
        {row.status === 'submitted' && row.created_at && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            on {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </Typography>
        )}
      </Stack>
    );
  };

  const getTitle = () => {
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
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#004d40', letterSpacing: -1 }}>
              {getTitle()}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              {rows.length} records found
            </Typography>
          </Box>
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

        <Paper sx={{ borderRadius: 4, overflow: "hidden", border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)' }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead sx={{ bgcolor: "rgba(0,121,107,0.05)" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3, pl: 4 }}>JOB PROFILE</TableCell>
                  {isAdmin && <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>COMPANY</TableCell>}
                  <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>STATUS</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3, textAlign: 'right', pr: 4 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 4 : 3} align="center" sx={{ py: 12 }}>
                      <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                        No applications found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ pl: 4 }}>
                        <Typography 
                          variant="subtitle2" 
                          onClick={() => startEditSubmitted(row, false)}
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
        </Paper>
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
