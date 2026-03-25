"use client";

import AppShell from "@/components/layout/AppShell";
import { Box, Button, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { authHeaders } from "@/lib/authHeaders";

type DocType = "company" | "job" | "salary";
type DocRow = { id: number; file_name: string; mime_type: string; size: number; created_at?: string };
type JobOption = { job_id: number; profile_name: string; salary?: { salary_id: number } | null };

export default function DocumentsPage() {
  const { data: session } = useSession();
  const [docType, setDocType] = useState<DocType>("company");
  const [entityId, setEntityId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<DocRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [jobs, setJobs] = useState<JobOption[]>([]);

  const endpoint = useMemo(() => `/documents/${docType}/${entityId}`, [docType, entityId]);

  const loadDocuments = async () => {
    if (!session || !entityId) return;
    setError("");
    try {
      const res = await api.get(endpoint, { headers: authHeaders(session) });
      setRows((res.data?.data || []) as DocRow[]);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setRows([]);
      setError(axiosErr.response?.data?.message || "Failed to load documents.");
    }
  };

  useEffect(() => {
    let active = true;
    if (!session) return;
    (async () => {
      const userCompanyId = session.user.companyId ? String(session.user.companyId) : "";
      if (active && userCompanyId) {
        setEntityId(userCompanyId);
      }

      const jobsRes = await api.get("/jobs", { headers: authHeaders(session) });
      const jobsData = ((jobsRes.data?.data || jobsRes.data || []) as JobOption[]).filter((j) => !!j?.job_id);
      if (active) {
        setJobs(jobsData);
      }
    })();
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    if (docType === "company") {
      setEntityId(session.user.companyId ? String(session.user.companyId) : "");
      return;
    }
    if (docType === "job") {
      setEntityId(jobs[0]?.job_id ? String(jobs[0].job_id) : "");
      return;
    }
    const salaryId = jobs.find((job) => job.salary?.salary_id)?.salary?.salary_id;
    setEntityId(salaryId ? String(salaryId) : "");
  }, [docType, jobs, session]);

  useEffect(() => {
    if (!session || !entityId) return;
    void loadDocuments();
  }, [session, endpoint, entityId]);

  const upload = async () => {
    if (!session || !files.length) return;
    setError("");
    setMessage("");

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        await api.post(endpoint, formData, {
          headers: { ...authHeaders(session), "Content-Type": "multipart/form-data" },
        });
      }
      setMessage(`${files.length} file(s) uploaded to ${docType}_document.`);
      setFiles([]);
      await loadDocuments();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const validationErrors = axiosErr.response?.data?.errors;
      const firstValidationMessage = validationErrors ? Object.values(validationErrors).flat()[0] : undefined;
      setError(firstValidationMessage || axiosErr.response?.data?.message || "Upload failed.");
    }
  };

  const remove = async (id: number) => {
    if (!session) return;
    setError("");
    setMessage("");
    try {
      await api.delete(`/documents/${docType}/${id}`, { headers: authHeaders(session) });
      await loadDocuments();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setError(axiosErr.response?.data?.message || "Delete failed.");
    }
  };

  return (
    <AppShell>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Document Uploads
      </Typography>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Document Type"
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocType)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="company">Company Document</MenuItem>
            <MenuItem value="job">Job Document</MenuItem>
            <MenuItem value="salary">Salary Document</MenuItem>
          </TextField>
          <TextField
            label={docType === "company" ? "Company ID" : docType === "job" ? "Job ID" : "Salary ID"}
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
          />
          <Button variant="outlined" onClick={loadDocuments}>Refresh</Button>
        </Stack>
      </Paper>

      <Paper
        sx={{
          p: 4,
          border: "2px dashed",
          borderColor: "divider",
          textAlign: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Upload files</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Endpoint: {endpoint}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
          />
        </Box>
        <Stack spacing={1} sx={{ my: 2, alignItems: "center" }}>
          {files.map((file) => (
            <Typography key={file.name} variant="body2">
              {file.name} ({Math.ceil(file.size / 1024)} KB)
            </Typography>
          ))}
        </Stack>
        <Button variant="contained" onClick={upload} disabled={!files.length || !entityId}>
          Upload
        </Button>
        {message ? (
          <Typography sx={{ mt: 2 }} color="success.main">
            {message}
          </Typography>
        ) : null}
        {error ? (
          <Typography sx={{ mt: 2 }} color="error">
            {error}
          </Typography>
        ) : null}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Uploaded Documents</Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>File Name</TableCell>
              <TableCell>MIME</TableCell>
              <TableCell>Size (KB)</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.file_name}</TableCell>
                <TableCell>{row.mime_type}</TableCell>
                <TableCell>{Math.ceil((row.size || 0) / 1024)}</TableCell>
                <TableCell>
                  <IconButton color="error" onClick={() => remove(row.id)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </AppShell>
  );
}
