"use client";

import AppShell from "@/components/layout/AppShell";
import { Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Paper, Stack, Step, StepLabel, Stepper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, InputAdornment, Grid } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { authHeaders } from "@/lib/authHeaders";
import { infAipcGuidelineItems, jnfAipcGuidelineItems, courseOptions, courseToDisciplines, stageDurationOptions } from "@/lib/constants";
import { Briefcase, MapPin, Globe, Calendar, Link as LinkIcon, FileText, IndianRupee, Award, ShieldCheck, ListOrdered, Clock, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const buildAipcDefaults = (items: { key: string }[]) =>
  Object.fromEntries(items.map((g) => [g.key, false])) as Record<string, boolean>;

const steps = ["Company + Job", "Salary", "Eligibility", "Declaration"];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
type JobRow = { job_id: number; profile_name: string; job_type: "INF" | "JNF"; cycle_id: number; salary?: { salary_id: number } | null };
type CycleRow = { cycle_id: number; name: string };
type HiringStageRow = { stage_id: number; name: string };
type EligibilityRule = { discipline: string; course: string; min_cgpa: string; min_hires: string; criteria: string };

interface BaseForm {
  company_id: number;
  cycle_id: number;
  job_type: "INF" | "JNF";
  profile_name: string;
  description: string;
  location: string;
  work_mode: "online" | "offline";
  offline_job_location: string;
  annual_turnover: string;
  training_period: string;
  bond: string;
  registration_link: string;
  joining_month: string;
  onboarding_procedure: string;
  num_employees: string;
  sector: string;
  nirf_objection: string;
  eligibility: {
    min_cgpa: string;
    gender: string;
    slp_requirement: string;
    disciplines_json: EligibilityRule[];
  };
  declaration: { agreed: boolean; declaration_text: string; aipc_guidelines: Record<string, boolean> };
  stages: Array<{ stage_id: string; sequence: string; duration: string }>;
}

interface JnfForm extends BaseForm {
  job_type: "JNF";
  salary: {
    currency: string;
    ctc_lpa: string;
    fixed_component: string;
    joining_bonus: string;
    retention_bonus: string;
    variable_component: string;
    esops: string;
    stocks_options: string;
  };
}

interface InfForm extends BaseForm {
  job_type: "INF";
  salary: {
    currency: string;
    stipend: string;
    internship_duration: string;
  };
}

const inputStyles = {
  "& .MuiInputLabel-root": { fontWeight: 700, fontSize: '0.95rem', color: 'text.secondary' },
  "& .MuiOutlinedInput-root": { 
    borderRadius: 2,
    bgcolor: 'rgba(0,0,0,0.02)',
    "&:hover": { bgcolor: 'rgba(0,0,0,0.04)' },
    "&.Mui-focused": { bgcolor: 'transparent' },
    "& input": { fontWeight: 500 }
  }
};

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const typeFilter = (searchParams.get("type") || "JNF") as "INF" | "JNF";
  const [activeStep, setActiveStep] = useState(0);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [hiringStages, setHiringStages] = useState<HiringStageRow[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [jobDescriptionFiles, setJobDescriptionFiles] = useState<File[]>([]);
  const [salaryDescriptionFiles, setSalaryDescriptionFiles] = useState<File[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  const initialJnf: JnfForm = {
    company_id: 0,
    cycle_id: 1,
    job_type: "JNF",
    profile_name: "",
    description: "",
    location: "",
    work_mode: "offline",
    offline_job_location: "",
    annual_turnover: "",
    training_period: "",
    bond: "",
    registration_link: "",
    joining_month: "",
    onboarding_procedure: "",
    num_employees: "",
    sector: "",
    nirf_objection: "No",
    salary: { 
      currency: "INR",
      ctc_lpa: "", 
      fixed_component: "", 
      joining_bonus: "", 
      retention_bonus: "", 
      variable_component: "", 
      esops: "", 
      stocks_options: "",
    },
    eligibility: {
      min_cgpa: "",
      gender: "All",
      slp_requirement: "",
      disciplines_json: [{ discipline: "", course: "", min_cgpa: "", min_hires: "", criteria: "" }],
    },
    declaration: { agreed: false, declaration_text: "", aipc_guidelines: buildAipcDefaults(jnfAipcGuidelineItems) },
    stages: [{ stage_id: "", sequence: "1", duration: "" }],
  };

  const initialInf: InfForm = {
    company_id: 0,
    cycle_id: 2,
    job_type: "INF",
    profile_name: "",
    description: "",
    location: "",
    work_mode: "offline",
    offline_job_location: "",
    annual_turnover: "",
    training_period: "",
    bond: "",
    registration_link: "",
    joining_month: "",
    onboarding_procedure: "",
    num_employees: "",
    sector: "",
    nirf_objection: "No",
    salary: { 
      currency: "INR",
      stipend: "", 
      internship_duration: "",
    },
    eligibility: {
      min_cgpa: "",
      gender: "All",
      slp_requirement: "",
      disciplines_json: [{ discipline: "", course: "", min_cgpa: "", min_hires: "", criteria: "" }],
    },
    declaration: { agreed: false, declaration_text: "", aipc_guidelines: buildAipcDefaults(infAipcGuidelineItems) },
    stages: [{ stage_id: "", sequence: "1", duration: "" }],
  };

  const [jnfForm, setJnfForm] = useState<JnfForm>(initialJnf);
  const [infForm, setInfForm] = useState<InfForm>(initialInf);

  const form = typeFilter === "INF" ? infForm : jnfForm;
  const setForm = (val: any) => {
    if (typeFilter === "INF") {
      setInfForm(typeof val === 'function' ? val : (prev: any) => ({ ...prev, ...val }));
    } else {
      setJnfForm(typeof val === 'function' ? val : (prev: any) => ({ ...prev, ...val }));
    }
  };

  const currentAipcItems = typeFilter === "INF" ? infAipcGuidelineItems : jnfAipcGuidelineItems;

  const { canSubmit, allAipcChecked, validationErrors } = useMemo(() => {
    const checked = currentAipcItems.every((g) => form.declaration.aipc_guidelines[g.key]);
    const errors: string[] = [];

    if (!form.profile_name) errors.push("Job Name is required");
    if (!form.description) errors.push("Description is required");
    if (!form.location) errors.push("Location is required");
    if (!form.annual_turnover.trim()) errors.push("Company Turnover is required");
    
    if (typeFilter === "INF") {
      if (!(form as InfForm).salary.stipend) errors.push("Monthly Stipend is required");
      if (!(form as InfForm).salary.internship_duration) errors.push("Internship Duration is required");
    } else {
      if (!(form as JnfForm).salary.ctc_lpa) errors.push("CTC LPA is required");
    }

    if (!checked) errors.push("All AIPC Guidelines must be confirmed");
    if (!form.declaration.agreed) errors.push("Self-Declaration must be confirmed");
    
    if (form.work_mode === "offline" && !form.offline_job_location.trim()) {
      errors.push("Offline Job Location is required");
    }

    if (form.eligibility.disciplines_json.length === 0) {
      errors.push("At least one eligibility rule is required");
    } else {
      form.eligibility.disciplines_json.forEach((rule, i) => {
        if (!rule.discipline || !rule.course || !rule.min_cgpa || !rule.min_hires) {
          errors.push(`Eligibility row ${i + 1} is incomplete`);
        }
      });
    }

    if (form.stages.length === 0) {
      errors.push("At least one hiring stage is required");
    } else {
      form.stages.forEach((stage, i) => {
        if (!stage.stage_id || !stage.sequence || !stage.duration) {
          errors.push(`Hiring stage ${i + 1} is incomplete`);
        }
      });
    }

    return { 
      canSubmit: errors.length === 0, 
      allAipcChecked: checked,
      validationErrors: errors 
    };
  }, [form, currentAipcItems, typeFilter]);

  const normalizeFiles = (list: FileList | null, kind: string): File[] => {
    const selected = Array.from(list || []);
    const oversize = selected.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversize) {
      setError(`${kind}: ${oversize.name} exceeds 2MB limit.`);
      return [];
    }
    return selected;
  };

  const displayedCycles = useMemo(() => {
    if (typeFilter === "INF") {
      return cycles.filter(c => c.name.toLowerCase().includes('internship') || c.cycle_id === 2);
    }
    return cycles.filter(c => c.name.toLowerCase().includes('placement') || c.cycle_id === 1);
  }, [cycles, typeFilter]);

  useEffect(() => {
    if (displayedCycles.length > 0) {
      setForm((prev: any) => ({ ...prev, cycle_id: displayedCycles[0].cycle_id }));
    }
  }, [displayedCycles, typeFilter]);

  useEffect(() => {
    let active = true;
    if (!session) return;
    (async () => {
      const res = await api.get("/jobs", { headers: authHeaders(session) });
      if (active) setJobs((res.data?.data || []) as JobRow[]);
      const cyclesRes = await api.get("/cycles", { headers: authHeaders(session) });
      const cycleRows = (cyclesRes.data?.data || []) as CycleRow[];
      const stagesRes = await api.get("/hiring-stages", { headers: authHeaders(session) });
      const stageRows = (stagesRes.data?.data || []) as HiringStageRow[];
      if (active) {
        setCycles(cycleRows);
        setHiringStages(stageRows);
        if (stageRows.length > 0) {
          setForm((prev: any) => ({
            ...prev,
            stages: [{ stage_id: String(stageRows[0].stage_id), sequence: "1", duration: stageDurationOptions[0] || "" }],
          }));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    let active = true;
    const user = session?.user as any;
    const companyId = Number(user?.companyId || user?.company_id || 0);
    if (!companyId) return;
    setInfForm((prev: any) => (prev.company_id === companyId ? prev : { ...prev, company_id: companyId }));
    setJnfForm((prev: any) => (prev.company_id === companyId ? prev : { ...prev, company_id: companyId }));

    // Ensure jobs are filtered by the current type on session load
    if (session) {
      api.get("/jobs", { headers: authHeaders(session) }).then((res) => {
        if (active) {
          const allJobs = (res.data?.data || []) as JobRow[];
          setJobs(typeFilter ? allJobs.filter((job) => job.job_type === typeFilter) : allJobs);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [session, typeFilter]);

  useEffect(() => {
    setActiveStep(0);
    setError("");
    setSuccess("");
  }, [typeFilter]);

  useEffect(() => {
    if (!typeFilter) {
      router.replace("/jobs?type=JNF");
    }
  }, [typeFilter, router]);

  useEffect(() => {
    if (!typeFilter) return;
    setForm((prev: any) => ({ ...prev, job_type: typeFilter }));
  }, [typeFilter]);

  const createJob = async () => {
    if (!session) return;
    if (!canSubmit) {
      setError(`Please fix the following errors:\n${validationErrors.join(", ")}`);
      return;
    }
    setError("");
    setSuccess("");
    setIsSaving(true);
        try {
          const user = session?.user as any;
          const created = await api.post("/jobs", {
            ...form,
            company_id: Number(user?.companyId || form.company_id),
            num_employees: form.num_employees || undefined,
            sector: form.sector || undefined,
            nirf_objection: form.nirf_objection,
            declaration: {
              agreed: form.declaration.agreed,
              declaration_text: form.declaration.declaration_text,
              aipc_guidelines: form.declaration.aipc_guidelines,
            },
            offline_job_location: form.work_mode === "offline" ? form.offline_job_location : null,
            salary: typeFilter === "INF" ? {
              currency: (form as InfForm).salary.currency,
              stipend: Number((form as InfForm).salary.stipend),
              internship_duration: (form as InfForm).salary.internship_duration,
            } : {
              currency: (form as JnfForm).salary.currency,
              ctc_lpa: Number((form as JnfForm).salary.ctc_lpa),
              fixed_component: Number((form as JnfForm).salary.fixed_component || 0),
              joining_bonus: Number((form as JnfForm).salary.joining_bonus || 0),
              retention_bonus: Number((form as JnfForm).salary.retention_bonus || 0),
              variable_component: Number((form as JnfForm).salary.variable_component || 0),
              esops: Number((form as JnfForm).salary.esops || 0),
              stocks_options: Number((form as JnfForm).salary.stocks_options || 0),
            },
        eligibility: {
          ...form.eligibility,
          min_cgpa: Number(form.eligibility.min_cgpa || 0),
          disciplines_json: form.eligibility.disciplines_json.map((rule) => ({
            discipline: rule.discipline,
            course: rule.course,
            min_cgpa: Number(rule.min_cgpa),
            min_hires: Number(rule.min_hires),
            criteria: rule.criteria || "",
          })),
        },
        stages: form.stages.map((stage) => ({
          stage_id: Number(stage.stage_id),
          sequence: Number(stage.sequence),
          duration: stage.duration || undefined,
        })),
      }, { headers: authHeaders(session) });

      const createdJobId = created.data?.job_id as number | undefined;
      if (!createdJobId) {
        throw new Error("Job created but job ID not found in response.");
      }

      const createdJobDetails = await api.get(`/jobs/${createdJobId}`, { headers: authHeaders(session) });
      const salaryId = createdJobDetails.data?.salary?.salary_id as number | undefined;

      const uploadFiles = async (type: "company" | "job" | "salary", id: number, uploadFilesList: File[]) => {
        for (const file of uploadFilesList) {
          const formData = new FormData();
          formData.append("file", file);
          await api.post(`/documents/${type}/${id}`, formData, {
            headers: { ...authHeaders(session), "Content-Type": "multipart/form-data" },
          });
        }
      };

      if (jobDescriptionFiles.length > 0) {
        await uploadFiles("job", createdJobId, jobDescriptionFiles);
      }
      if (salaryDescriptionFiles.length > 0 && salaryId) {
        await uploadFiles("salary", salaryId, salaryDescriptionFiles);
      }
      if (additionalFiles.length > 0 && user?.companyId) {
        await uploadFiles("company", Number(user.companyId), additionalFiles);
      }

      const res = await api.get("/jobs", { headers: authHeaders(session) });
      const allJobs = (res.data?.data || []) as JobRow[];
      setJobs(typeFilter ? allJobs.filter((job) => job.job_type === typeFilter) : allJobs);
      setJobDescriptionFiles([]);
      setSalaryDescriptionFiles([]);
      setAdditionalFiles([]);
      setSuccess("Job created successfully. Selected documents were uploaded.");
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const apiMessage = axiosErr.response?.data?.message;
      const validationErrors = axiosErr.response?.data?.errors;
      const firstValidationMessage = validationErrors ? Object.values(validationErrors).flat()[0] : undefined;
      setError(firstValidationMessage || apiMessage || "Failed to create job.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <Typography variant="h4" sx={{ mb: 2 }}>
        {typeFilter === "INF" ? "INF Internships" : "JNF Jobs"}
      </Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 4, fontWeight: 800, color: 'primary.main', borderBottom: '3px solid', pb: 1.5, borderColor: 'primary.light', letterSpacing: '0.5px' }}>
              Company & Job Notification Details
            </Typography>
            <Grid container spacing={5}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  label="Job Name*" 
                  fullWidth 
                  value={form.profile_name} 
                  onChange={(e) => setForm({ ...form, profile_name: e.target.value })} 
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Briefcase size={20} color="#1976d2" />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyles}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  label="Recruitment Cycle"
                  value={form.cycle_id}
                  fullWidth
                  onChange={(e) => setForm({ ...form, cycle_id: Number(e.target.value) })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Calendar size={20} color="#1976d2" />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyles}
                >
                  {displayedCycles.map((cycle) => <MenuItem key={cycle.cycle_id} value={cycle.cycle_id}>{cycle.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  label="Location*" 
                  fullWidth 
                  value={form.location} 
                  onChange={(e) => setForm({ ...form, location: e.target.value })} 
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MapPin size={20} color="#1976d2" />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyles}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  label="Mode of working*"
                  fullWidth
                  value={form.work_mode}
                  onChange={(e) => setForm({ ...form, work_mode: e.target.value as "online" | "offline" })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Globe size={20} color="#1976d2" />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyles}
                >
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                </TextField>
              </Grid>
              {form.work_mode === "offline" && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Job location (offline)*"
                    fullWidth
                    value={form.offline_job_location}
                    onChange={(e) => setForm({ ...form, offline_job_location: e.target.value })}
                    helperText="Where the role is based when work is offline"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MapPin size={20} color="#1976d2" />
                        </InputAdornment>
                      ),
                    }}
                    sx={inputStyles}
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Joining Month"
                  fullWidth
                  value={form.joining_month}
                  onChange={(e) => setForm({ ...form, joining_month: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Calendar size={20} color="#1976d2" />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyles}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField 
                  label="Registration Link" 
                  fullWidth 
                  value={form.registration_link} 
                  onChange={(e) => setForm({ ...form, registration_link: e.target.value })} 
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LinkIcon size={20} color="#1976d2" />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyles}
                />
              </Grid>
              {typeFilter === "INF" && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField 
                      label="No. of Employees" 
                      fullWidth 
                      value={form.num_employees} 
                      onChange={(e) => setForm({ ...form, num_employees: e.target.value })} 
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <ListOrdered size={20} color="#1976d2" />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputStyles}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      select
                      label="Category / Sector"
                      fullWidth
                      value={form.sector}
                      onChange={(e) => setForm({ ...form, sector: e.target.value })}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Globe size={20} color="#1976d2" />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputStyles}
                    >
                      {["Software/IT", "Education/Ed Tech", "E-Commerce", "Consulting", "Finance/Banking", "Analytics", "FMCG", "Core", "Media", "Other"].map((sector) => (
                        <MenuItem key={sector} value={sector}>{sector}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </>
              )}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Turnover of company*"
                  fullWidth
                  value={form.annual_turnover}
                  onChange={(e) => setForm({ ...form, annual_turnover: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TrendingUp size={20} color="#1976d2" />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyles}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  label="NIRF Ranking Procedure Objection*"
                  fullWidth
                  value={form.nirf_objection}
                  onChange={(e) => setForm({ ...form, nirf_objection: e.target.value })}
                  helperText="Do you have any objection if we share your contact details with MoE as part of NIRF?"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ShieldCheck size={20} color="#1976d2" />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyles}
                >
                  <MenuItem value="No">No</MenuItem>
                  <MenuItem value="Yes">Yes</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Description*"
                  fullWidth
                  multiline
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                        <FileText size={20} color="#1976d2" />
                      </InputAdornment>
                    ),
                  }}
                  sx={inputStyles}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Job Description Documents (optional)</Typography>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setJobDescriptionFiles(normalizeFiles(e.target.files, "Job document"))}
                  />
                  {jobDescriptionFiles.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {jobDescriptionFiles.length} file(s) selected
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 1 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 4, fontWeight: 800, color: 'primary.main', borderBottom: '3px solid', pb: 1.5, borderColor: 'primary.light', letterSpacing: '0.5px' }}>
              Salary & Internship Details
            </Typography>
            <Grid container spacing={5}>
              <Grid size={{ xs: 12, md: 12 }}>
                <TextField
                  select
                  label="Currency*"
                  value={form.salary.currency}
                  onChange={(e) => setForm({ ...form, salary: { ...form.salary, currency: e.target.value } })}
                  sx={{ ...inputStyles, width: '200px' }}
                >
                  <MenuItem value="INR">INR (₹)</MenuItem>
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                  <MenuItem value="GBP">GBP (£)</MenuItem>
                </TextField>
              </Grid>
              {typeFilter === "INF" ? (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField 
                      label="Monthly Stipend*" 
                      type="number"
                      fullWidth 
                      value={(form as InfForm).salary.stipend} 
                      onChange={(e) => setForm({ ...form, salary: { ...(form as InfForm).salary, stipend: e.target.value } })} 
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <IndianRupee size={20} color="#1976d2" />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputStyles}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      select
                      label="Internship Duration*"
                      fullWidth
                      value={(form as InfForm).salary.internship_duration}
                      onChange={(e) => setForm({ ...form, salary: { ...(form as InfForm).salary, internship_duration: e.target.value } })}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Clock size={20} color="#1976d2" />
                          </InputAdornment>
                        ),
                      }}
                      helperText={
                        (form as InfForm).salary.internship_duration === "6 months" || (form as InfForm).salary.internship_duration === "6 months or more" 
                          ? "For 6-month or more internships, ensure JD aligns with thesis research topic as per academic rules." 
                          : undefined
                      }
                      sx={inputStyles}
                    >
                      <MenuItem value="2 months (Summer)">2 months (Summer)</MenuItem>
                      <MenuItem value="6 months">6 months</MenuItem>
                      <MenuItem value="6 months or more">6 months or more</MenuItem>
                    </TextField>
                  </Grid>
                </>
              ) : (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField 
                      label="CTC LPA*" 
                      type="number"
                      fullWidth 
                      value={(form as JnfForm).salary.ctc_lpa} 
                      onChange={(e) => setForm({ ...form, salary: { ...(form as JnfForm).salary, ctc_lpa: e.target.value } })} 
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <IndianRupee size={20} color="#1976d2" />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputStyles}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField 
                      label="Fixed Component" 
                      type="number"
                      fullWidth 
                      value={(form as JnfForm).salary.fixed_component} 
                      onChange={(e) => setForm({ ...form, salary: { ...(form as JnfForm).salary, fixed_component: e.target.value } })} 
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <IndianRupee size={20} color="#1976d2" />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputStyles}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField 
                      label="Joining Bonus" 
                      type="number"
                      fullWidth 
                      value={(form as JnfForm).salary.joining_bonus} 
                      onChange={(e) => setForm({ ...form, salary: { ...(form as JnfForm).salary, joining_bonus: e.target.value } })} 
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <IndianRupee size={20} color="#1976d2" />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputStyles}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField 
                      label="Variable Component" 
                      type="number"
                      fullWidth 
                      value={(form as JnfForm).salary.variable_component} 
                      onChange={(e) => setForm({ ...form, salary: { ...(form as JnfForm).salary, variable_component: e.target.value } })} 
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <IndianRupee size={20} color="#1976d2" />
                          </InputAdornment>
                        ),
                      }}
                      sx={inputStyles}
                    />
                  </Grid>
                </>
              )}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Salary Breakdown Documents (optional)</Typography>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setSalaryDescriptionFiles(normalizeFiles(e.target.files, "Salary document"))}
                  />
                  {salaryDescriptionFiles.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {salaryDescriptionFiles.length} file(s) selected
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 2 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 4, fontWeight: 800, color: 'primary.main', borderBottom: '3px solid', pb: 1.5, borderColor: 'primary.light', letterSpacing: '0.5px' }}>
              Eligibility Criteria
            </Typography>
            <Stack spacing={4}>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Minimum CGPA (Overall)"
                    type="number"
                    fullWidth
                    value={form.eligibility.min_cgpa}
                    onChange={(e) => setForm({ ...form, eligibility: { ...form.eligibility, min_cgpa: e.target.value } })}
                    sx={inputStyles}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    label="Gender Eligibility"
                    fullWidth
                    value={form.eligibility.gender}
                    onChange={(e) => setForm({ ...form, eligibility: { ...form.eligibility, gender: e.target.value } })}
                    sx={inputStyles}
                  >
                    <MenuItem value="All">All</MenuItem>
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Others">Others</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="SLP Requirement"
                    fullWidth
                    value={form.eligibility.slp_requirement}
                    onChange={(e) => setForm({ ...form, eligibility: { ...form.eligibility, slp_requirement: e.target.value } })}
                    sx={inputStyles}
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 2 }}>Discipline/Course-wise Eligibility & Min Hires</Typography>
              {form.eligibility.disciplines_json.map((rule, index) => (
                <Paper key={index} variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.01)' }}>
                  <Grid container spacing={3} alignItems="center">
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        select
                        label="Course*"
                        fullWidth
                        value={rule.course}
                        onChange={(e) => setForm((prev: BaseForm) => {
                          const rules = [...prev.eligibility.disciplines_json];
                          const nextCourse = e.target.value;
                          const allowed = courseToDisciplines[nextCourse] || [];
                          let discipline = rules[index].discipline;
                          if (!allowed.includes(discipline)) discipline = "";
                          rules[index] = { ...rules[index], course: nextCourse, discipline };
                          return { ...prev, eligibility: { ...prev.eligibility, disciplines_json: rules } };
                        })}
                        sx={inputStyles}
                      >
                        {courseOptions.map((course) => (
                          <MenuItem key={course} value={course}>{course}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        select
                        label="Discipline*"
                        fullWidth
                        value={rule.discipline}
                        onChange={(e) => setForm((prev: BaseForm) => {
                          const rules = [...prev.eligibility.disciplines_json];
                          rules[index] = { ...rules[index], discipline: e.target.value };
                          return { ...prev, eligibility: { ...prev.eligibility, disciplines_json: rules } };
                        })}
                        disabled={!rule.course}
                        sx={inputStyles}
                      >
                        {(rule.course ? courseToDisciplines[rule.course] : []).map((discipline) => (
                          <MenuItem key={discipline} value={discipline}>{discipline}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <TextField
                        label="Min CGPA*"
                        type="number"
                        fullWidth
                        value={rule.min_cgpa}
                        onChange={(e) => setForm((prev: BaseForm) => {
                          const rules = [...prev.eligibility.disciplines_json];
                          rules[index] = { ...rules[index], min_cgpa: e.target.value };
                          return { ...prev, eligibility: { ...prev.eligibility, disciplines_json: rules } };
                        })}
                        sx={inputStyles}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <TextField
                        label="Min Hires*"
                        type="number"
                        fullWidth
                        value={rule.min_hires}
                        onChange={(e) => setForm((prev: BaseForm) => {
                          const rules = [...prev.eligibility.disciplines_json];
                          rules[index] = { ...rules[index], min_hires: e.target.value };
                          return { ...prev, eligibility: { ...prev.eligibility, disciplines_json: rules } };
                        })}
                        sx={inputStyles}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 10 }}>
                      <TextField
                        label="Additional Criteria"
                        fullWidth
                        value={rule.criteria}
                        onChange={(e) => setForm((prev: BaseForm) => {
                          const rules = [...prev.eligibility.disciplines_json];
                          rules[index] = { ...rules[index], criteria: e.target.value };
                          return { ...prev, eligibility: { ...prev.eligibility, disciplines_json: rules } };
                        })}
                        sx={inputStyles}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        onClick={() => setForm((prev: BaseForm) => ({
                          ...prev,
                          eligibility: {
                            ...prev.eligibility,
                            disciplines_json: prev.eligibility.disciplines_json.filter((_: any, i: number) => i !== index),
                          },
                        }))}
                        disabled={form.eligibility.disciplines_json.length <= 1}
                        sx={{ height: '56px', borderRadius: 2 }}
                      >
                        Remove
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <Button
                variant="contained"
                startIcon={<ListOrdered size={20} />}
                onClick={() =>
                  setForm((prev: BaseForm) => ({
                    ...prev,
                    eligibility: {
                      ...prev.eligibility,
                      disciplines_json: [...prev.eligibility.disciplines_json, { discipline: "", course: "", min_cgpa: "", min_hires: "", criteria: "" }],
                    },
                  }))
                }
                sx={{ py: 1.5, borderRadius: 2, width: 'fit-content' }}
              >
                Add Eligibility Row
              </Button>
            </Stack>
          </Box>
        )}

        {activeStep === 3 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 4, fontWeight: 800, color: 'primary.main', borderBottom: '3px solid', pb: 1.5, borderColor: 'primary.light', letterSpacing: '0.5px' }}>
              Uniform Declaration Format
            </Typography>
            <Stack spacing={3}>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                Please confirm each item below to proceed with the notification.
              </Typography>
              <Stack spacing={1.5}>
                {currentAipcItems.map((item) => (
                  <Paper key={item.key} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: form.declaration.aipc_guidelines[item.key] ? 'rgba(46, 125, 50, 0.04)' : 'transparent', transition: 'all 0.2s' }}>
                    <FormControlLabel
                      control={(
                        <Checkbox
                          checked={!!form.declaration.aipc_guidelines[item.key]}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              declaration: {
                                ...form.declaration,
                                aipc_guidelines: { ...form.declaration.aipc_guidelines, [item.key]: e.target.checked },
                              },
                            })}
                        />
                      )}
                      label={<Typography variant="body2" sx={{ fontWeight: 500 }}>{item.label}</Typography>}
                      sx={{ alignItems: "flex-start", ml: 0, "& .MuiCheckbox-root": { pt: 0.25 } }}
                    />
                  </Paper>
                ))}
              </Stack>

              <Box sx={{ mt: 4, p: 3, bgcolor: "rgba(25, 118, 210, 0.06)", borderRadius: 3, border: "2px solid", borderColor: "primary.light" }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, display: "flex", alignItems: "center", gap: 1.5, color: 'primary.main' }}>
                  <ShieldCheck size={28} />
                  Self-Declaration (Mandatory)
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.8, color: "text.primary", fontWeight: 500 }}>
                  I/We confirm that the information pertaining to the posted {typeFilter === "INF" ? "internship" : "job"} profile is accurate and verified to the best of our knowledge. 
                  The company commits to adhere to the terms and conditions outlined in these {typeFilter === "INF" ? "internship" : "job"} profiles while extending offers. 
                  No additional clauses or changes will be introduced in the final offers extended to the candidates selected for the respective profiles. 
                  All relevant details have been clearly outlined in the {typeFilter === "INF" ? "Internship" : "Job"} Notification Form. 
                  In the event of any discrepancies in the final offers, the company will be subject to strict action as per the AIPC guidelines.
                  <br /><br />
                  I/We have read the placement Guidelines of <strong>IIT (ISM) Dhanbad</strong> mentioned above and the AIPC Guidelines.
                </Typography>
                <FormControlLabel
                  control={<Checkbox checked={form.declaration.agreed} onChange={(e) => setForm((prev: any) => ({ ...prev, declaration: { ...prev.declaration, agreed: e.target.checked } }))} sx={{ transform: 'scale(1.2)' }} />}
                  label={<Typography variant="subtitle1" sx={{ fontWeight: 700, ml: 1 }}>I confirm the above self-declaration and agree to abide by the rules.</Typography>}
                  sx={{ mt: 3, bgcolor: 'rgba(255,255,255,0.5)', p: 2, borderRadius: 2 }}
                />
              </Box>

              <TextField 
                label="Additional Declaration Notes (if any)" 
                fullWidth 
                multiline 
                minRows={3} 
                value={form.declaration.declaration_text} 
                onChange={(e) => setForm({ ...form, declaration: { ...form.declaration, declaration_text: e.target.value } })} 
                sx={inputStyles}
              />
              
              <Typography variant="h6" sx={{ mt: 4, fontWeight: 700, color: 'primary.main' }}>Hiring Stages & Process*</Typography>
              <Stack spacing={3}>
                {form.stages.map((stage, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.01)' }}>
                    <Grid container spacing={3} alignItems="center">
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          select
                          label="Process Stage*"
                          fullWidth
                          value={stage.stage_id}
                          onChange={(e) => setForm((prev: BaseForm) => {
                            const stages = [...prev.stages];
                            stages[index] = { ...stages[index], stage_id: e.target.value };
                            return { ...prev, stages };
                          })}
                          sx={inputStyles}
                        >
                          {hiringStages.map((option) => (
                            <MenuItem key={option.stage_id} value={String(option.stage_id)}>{option.name}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField
                          label="Sequence*"
                          type="number"
                          fullWidth
                          value={stage.sequence}
                          disabled
                          helperText="Order is set automatically"
                          sx={inputStyles}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField
                          select
                          label="Duration*"
                          fullWidth
                          value={stage.duration}
                          onChange={(e) => setForm((prev: BaseForm) => {
                            const stages = [...prev.stages];
                            stages[index] = { ...stages[index], duration: e.target.value };
                            return { ...prev, stages };
                          })}
                          sx={inputStyles}
                        >
                          {stageDurationOptions.map((duration) => (
                            <MenuItem key={duration} value={duration}>{duration}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          onClick={() => setForm((prev: BaseForm) => {
                            const newStages = prev.stages
                              .filter((_: any, i: number) => i !== index)
                              .map((s, idx) => ({ ...s, sequence: String(idx + 1) }));
                            return { ...prev, stages: newStages };
                          })}
                          disabled={form.stages.length <= 1}
                          sx={{ height: '56px', borderRadius: 2 }}
                        >
                          Remove
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
                <Button
                  variant="contained"
                  startIcon={<ListOrdered size={20} />}
                  onClick={() =>
                    setForm((prev: BaseForm) => ({
                      ...prev,
                      stages: [...prev.stages, { stage_id: String(hiringStages[0]?.stage_id || ""), sequence: String(prev.stages.length + 1), duration: stageDurationOptions[0] || "" }],
                    }))
                  }
                  sx={{ py: 1.5, borderRadius: 2, width: 'fit-content' }}
                >
                  Add Hiring Stage
                </Button>
              </Stack>
              <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Additional Supporting Documents (optional)</Typography>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setAdditionalFiles(normalizeFiles(e.target.files, "Additional document"))}
                />
                {additionalFiles.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {additionalFiles.length} file(s) selected
                  </Typography>
                )}
              </Box>
            </Stack>
          </Box>
        )}

        <Box sx={{ mt: 4, display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button 
              variant="outlined" 
              disabled={activeStep === 0} 
              onClick={() => setActiveStep((p) => p - 1)}
              sx={{ borderRadius: 2, px: 4 }}
            >
              Back
            </Button>
            <Button 
              variant="contained" 
              disabled={activeStep === steps.length - 1} 
              onClick={() => setActiveStep((p) => Math.min(steps.length - 1, p + 1))}
              sx={{ borderRadius: 2, px: 4 }}
            >
              Next
            </Button>
          </Box>
          
          <Button 
            variant="contained" 
            color={canSubmit ? "success" : "primary"}
            disabled={isSaving} 
            onClick={createJob}
            startIcon={isSaving ? undefined : <ShieldCheck size={20} />}
            sx={{ 
              borderRadius: 2, 
              px: 6, 
              py: 1.5,
              fontWeight: 700,
              boxShadow: (theme) => canSubmit ? theme.shadows[4] : theme.shadows[1],
              '&:hover': {
                bgcolor: (theme) => canSubmit ? 'success.dark' : 'primary.dark',
                transform: 'translateY(-1px)',
              }
            }}
          >
            {isSaving ? "Saving..." : "Save Job Notification"}
          </Button>
        </Box>

        {activeStep === steps.length - 1 && !canSubmit && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'error.lighter', borderRadius: 2, border: '1px solid', borderColor: 'error.light' }}>
            <Typography variant="subtitle2" color="error.main" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ListOrdered size={18} />
              Please complete the following to save:
            </Typography>
            <Grid container spacing={1}>
              {validationErrors.map((err, idx) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                  <Typography variant="caption" color="error.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}>
                    • {err}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {error ? (
          <Typography color="error" sx={{ mt: 2, p: 1.5, bgcolor: 'error.lighter', borderRadius: 1, fontWeight: 500, border: '1px solid', borderColor: 'error.light' }}>
            {error}
          </Typography>
        ) : null}
        {success ? (
          <Typography color="success.main" sx={{ mt: 2, p: 1.5, bgcolor: 'success.lighter', borderRadius: 1, fontWeight: 500, border: '1px solid', borderColor: 'success.light' }}>
            {success}
          </Typography>
        ) : null}
      </Paper>
    </AppShell>
  );
}
