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
  status: "in progress" | "selected" | "rejected";
  is_withdrawn?: boolean;
  is_editable?: boolean;
  created_at?: string;
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
    if (!window.confirm("Withdraw this application?")) return;
    setMessage("");
    setError("");
    try {
      await api.post(`/applications/${id}/withdraw`, {}, { headers: authHeaders(session) });
      setMessage("Application withdrawn.");
      await load();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || "Failed to withdraw application.");
    }
  };

  const getStatusChip = (row: ApplicationRow) => {
    if (row.is_withdrawn) return <Chip label="Withdrawn" size="small" variant="outlined" />;
    
    const statusMap = {
      "selected": { label: "Approved", color: "success" as const },
      "rejected": { label: "Rejected", color: "error" as const },
      "in progress": { label: "Pending", color: "warning" as const },
    };
    
    const config = statusMap[row.status] || { label: row.status, color: "default" as const };
    return <Chip label={config.label} color={config.color} size="small" />;
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box component={motion.div} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {getTitle()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAdmin ? "Administrative view: Approve or reject submissions from all companies." : "View and manage applications submitted by your company."}
          </Typography>
        </Box>
      </Box>

      {message && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.dark', borderRadius: 2 }}>
          <Typography variant="body2">{message}</Typography>
        </Paper>
      )}
      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.dark', borderRadius: 2 }}>
          <Typography variant="body2">{error}</Typography>
        </Paper>
      )}

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Job Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Company Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">No applications found.</Typography>
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
                  sx={{ display: 'table-row' }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{row.profile_name || `Job #${row.job_id}`}</TableCell>
                  <TableCell>{row.company_name || session?.user?.name || "-"}</TableCell>
                  <TableCell>
                    {row.created_at ? new Date(row.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : "—"}
                  </TableCell>
                  <TableCell>{getStatusChip(row)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      {isAdmin ? (
                        <>
                          <Button 
                            size="small" 
                            variant="contained" 
                            color="success"
                            onClick={() => updateStatus(row.id, 'selected')}
                            disabled={row.status === 'selected'}
                          >
                            Approve
                          </Button>
                          <Button 
                            size="small" 
                            variant="contained" 
                            color="error"
                            onClick={() => updateStatus(row.id, 'rejected')}
                            disabled={row.status === 'rejected'}
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <>
                          {row.is_editable && !row.is_withdrawn && (
                            <MuiTooltip title="Edit once">
                              <IconButton 
                                size="small" 
                                onClick={() => void startEditSubmitted(row)}
                                sx={{ color: 'primary.main', bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
                              >
                                <Edit3 size={16} />
                              </IconButton>
                            </MuiTooltip>
                          )}
                          {!row.is_withdrawn && row.status === 'in progress' && (
                            <MuiTooltip title="Withdraw">
                              <IconButton 
                                size="small" 
                                color="warning"
                                onClick={() => withdraw(row.id)}
                                sx={{ bgcolor: 'warning.light', '&:hover': { bgcolor: 'warning.main', color: 'white' } }}
                              >
                                <XCircle size={16} />
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
