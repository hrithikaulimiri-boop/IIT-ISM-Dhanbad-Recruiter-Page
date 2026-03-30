"use client";

import { useEffect, useRef, useState } from "react";
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
import { useSearchParams } from "next/navigation";
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
  created_at?: string;
  last_completed_step?: number;
};

export default function ApplicationsPage() {
  const searchParams = useSearchParams();
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
        { status: next },
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

  const startEditSubmitted = async (row: ApplicationRow) => {
    if (!session || !row.is_editable) return;
    const newProfileName = window.prompt("Update job profile name", row.profile_name)?.trim();
    if (!newProfileName) return;
    
    setMessage("");
    setError("");
    try {
      await api.put(
        `/applications/${row.id}`,
        { profile_name: newProfileName },
        { headers: { ...authHeaders(session), "Content-Type": "application/json" } }
      );
      setMessage("Application updated. Further edits are disabled.");
      await load();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || "Failed to update application.");
    }
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
      "pending": { label: "Pending", color: "warning" as const },
      "draft": { label: "Draft", color: "default" as const },
      // Fallbacks for student applications
      "selected": { label: "Approved", color: "success" as const },
      "in progress": { label: "In Progress", color: "warning" as const },
    };
    
    const config = statusMap[row.status] || { label: row.status, color: "default" as const };
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip label={config.label} color={config.color} size="small" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }} />
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
      <Box sx={{ mb: 6 }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Typography variant="h6" sx={{ letterSpacing: 4, color: "text.secondary", fontWeight: 300, mb: 1, textTransform: 'uppercase' }}>
            Recruitment Management
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#004d40', mb: 1, letterSpacing: -1 }}>
            {getTitle()}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 400, color: '#00796b', opacity: 0.8 }}>
            {isAdmin ? "ADMINISTRATIVE APPROVAL WORKSPACE" : "TRACK ALL YOUR SUBMISSIONS"}
          </Typography>
        </motion.div>
      </Box>

      {message && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(56, 142, 60, 0.1)', color: '#2e7d32', borderRadius: 4, border: '1px solid rgba(56, 142, 60, 0.2)' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{message}</Typography>
        </Paper>
      )}
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#c62828', borderRadius: 4, border: '1px solid rgba(211, 47, 47, 0.2)' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{error}</Typography>
        </Paper>
      )}

      <Paper sx={{ borderRadius: 6, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(0,121,107,0.05)' }}>
              <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>JOB NAME</TableCell>
              {isAdmin ? <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>COMPANY</TableCell> : <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>PROGRESS</TableCell>}
              <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>SUBMITTED ON</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>STATUS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 12 }}>
                  <Typography color="text.secondary" variant="h6" sx={{ fontWeight: 600 }}>No applications found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  component={motion.tr}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  hover
                >
                  <TableCell sx={{ fontWeight: 700, color: '#004d40' }}>{row.profile_name || `Job #${row.job_id}`}</TableCell>
                  {isAdmin ? (
                    <TableCell sx={{ fontWeight: 600 }}>{row.company_name || session?.user?.name || "-"}</TableCell>
                  ) : (
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {row.last_completed_step !== undefined ? steps[row.last_completed_step] : "—"}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {row.created_at ? new Date(row.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(row)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={() => window.location.href = `/jobs?resume=${row.job_id}`}
                        sx={{ borderRadius: 2.5, fontWeight: 800, borderColor: '#00796b', color: '#00796b' }}
                      >
                        View Details
                      </Button>
                      {isAdmin ? (
                        <>
                          <Button 
                            size="small" 
                            variant="contained" 
                            color="success"
                            onClick={() => updateStatus(row.id, 'selected')}
                            disabled={row.status === 'selected'}
                            sx={{ borderRadius: 2.5, fontWeight: 800, background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)' }}
                          >
                            Approve
                          </Button>
                          <Button 
                            size="small" 
                            variant="contained" 
                            color="error"
                            onClick={() => updateStatus(row.id, 'rejected')}
                            disabled={row.status === 'rejected'}
                            sx={{ borderRadius: 2.5, fontWeight: 800, background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)' }}
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <>
                          {row.is_editable && !row.is_withdrawn && (
                            <MuiTooltip title="Quick Rename">
                              <IconButton 
                                size="small" 
                                onClick={() => void startEditSubmitted(row)}
                                sx={{ color: '#00796b', bgcolor: 'rgba(0,121,107,0.05)', '&:hover': { bgcolor: 'rgba(0,121,107,0.1)' } }}
                              >
                                <Edit3 size={16} />
                              </IconButton>
                            </MuiTooltip>
                          )}
                          {!row.is_withdrawn && (row.status === 'submitted' || row.status === 'pending') && (
                            <MuiTooltip title="Withdraw to Draft">
                              <IconButton 
                                size="small" 
                                color="warning"
                                onClick={() => withdraw(row.id)}
                                sx={{ bgcolor: 'rgba(237, 108, 2, 0.05)', color: '#ed6c02', '&:hover': { bgcolor: 'rgba(237, 108, 2, 0.1)' } }}
                              >
                                <XCircle size={16} />
                              </IconButton>
                            </MuiTooltip>
                          )}
                          {(row.status === 'draft' || row.status === 'pending') && (
                            <MuiTooltip title="Delete Permanently">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => deleteApplication(row.id)}
                                sx={{ bgcolor: 'rgba(211, 47, 47, 0.05)', color: '#d32f2f', '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.1)' } }}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </MuiTooltip>
                          )}
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
    </AppShell>
  );
}
