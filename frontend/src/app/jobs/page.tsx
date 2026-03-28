"use client";

import AppShell from "@/components/layout/AppShell";
import { Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Paper, Stack, Step, StepLabel, Stepper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, InputAdornment, Grid2 as Grid, FormControl, InputLabel, Select, OutlinedInput, IconButton, StepConnector, stepConnectorClasses, styled } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { authHeaders } from "@/lib/authHeaders";
import { infAipcGuidelineItems, jnfAipcGuidelineItems, courseOptions, courseToDisciplines, stageDurationOptions } from "@/lib/constants";
import { Briefcase, MapPin, Globe, Calendar, Link as LinkIcon, FileText, IndianRupee, Award, ShieldCheck, ListOrdered, Clock, TrendingUp, Upload, Trash2, FileCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const buildAipcDefaults = (items: { key: string }[]) =>
  Object.fromEntries(items.map((g) => [g.key, false])) as Record<string, boolean>;

const steps = ["Company + Job", "Eligibility", "Salary", "Hiring Stages", "Declaration"];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
type JobRow = { job_id: number; profile_name: string; job_type: "INF" | "JNF"; cycle_id: number; status: "draft" | "pending" | "submitted"; last_completed_step: number; salary?: { salary_id: number } | null };
type CycleRow = { cycle_id: number; name: string };
type HiringStageRow = { stage_id: number; name: string };
type EligibilityRule = { 
  discipline: string; 
  course: string; 
  min_cgpa: string; 
  min_hires: string; 
  criteria: string;
  allow_backlogs: boolean;
  max_backlogs: string;
  gender: string;
};

interface BaseForm {
  job_id?: number;
  company_id: number;
  cycle_id: number;
  job_type: "INF" | "JNF";
  profile_name: string;
  description: string;
  location: string;
  work_mode: "online" | "offline";
  offline_job_location: string;
  training_period: string;
  bond: string;
  registration_link: string;
  joining_month: string;
  onboarding_procedure: string;
  job_categories: string[];
  nirf_objection: string;
  status: "draft" | "pending" | "submitted";
  last_completed_step: number;
  eligibility: {
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

const currencySymbols: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundColor: '#fbc02d', // Yellow for currently active
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundColor: '#2e7d32', // Green for completed
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: '#d32f2f', // Red for unfilled/pending
    borderRadius: 1,
  },
}));

const ColorlibStepIconRoot = styled('div')<{
  ownerState: { completed?: boolean; active?: boolean };
}>(({ theme, ownerState }) => ({
  backgroundColor: '#d32f2f', // Red by default
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
  ...(ownerState.active && {
    backgroundColor: '#fbc02d', // Yellow for active
    boxShadow: '0 4px 20px 0 rgba(251, 192, 45, .5)',
  }),
  ...(ownerState.completed && {
    backgroundColor: '#2e7d32', // Green for completed
  }),
}));

function ColorlibStepIcon(props: any) {
  const { active, completed, className, icon } = props;

  const icons: { [index: string]: React.ReactElement } = {
    1: <Briefcase size={20} />,
    2: <ListOrdered size={20} />,
    3: <IndianRupee size={20} />,
    4: <Clock size={20} />,
    5: <ShieldCheck size={20} />,
  };

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(icon)]}
    </ColorlibStepIconRoot>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const typeFilter = (searchParams.get("type") || "JNF") as "INF" | "JNF";
  const [view, setView] = useState<"list" | "form">("list");
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
    job_id: undefined,
    company_id: 0,
    cycle_id: 1,
    job_type: "JNF",
    profile_name: "",
    description: "",
    location: "",
    work_mode: "offline",
    offline_job_location: "",
    training_period: "",
    bond: "",
    registration_link: "",
    joining_month: "",
    onboarding_procedure: "",
    job_categories: [] as string[],
    nirf_objection: "No",
    status: "draft",
    last_completed_step: 0,
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
      disciplines_json: [] as EligibilityRule[],
    },
    declaration: { agreed: false, declaration_text: "", aipc_guidelines: buildAipcDefaults(jnfAipcGuidelineItems) },
    stages: [{ stage_id: "", sequence: "1", duration: "" }],
  };

  const initialInf: InfForm = {
    job_id: undefined,
    company_id: 0,
    cycle_id: 2,
    job_type: "INF",
    profile_name: "",
    description: "",
    location: "",
    work_mode: "offline",
    offline_job_location: "",
    training_period: "",
    bond: "",
    registration_link: "",
    joining_month: "",
    onboarding_procedure: "",
    job_categories: [] as string[],
    nirf_objection: "No",
    status: "draft",
    last_completed_step: 0,
    salary: { 
      currency: "INR",
      stipend: "", 
      internship_duration: "",
    },
    eligibility: {
      disciplines_json: [] as EligibilityRule[],
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
    if (!form.job_categories || form.job_categories.length === 0) errors.push("At least one Job Category is required");
    
    if (typeFilter === "INF") {
      if (!(form as InfForm).salary.stipend) errors.push("Monthly Stipend is required");
      if (!(form as InfForm).salary.internship_duration) errors.push("Internship Duration is required");
    } else {
      if (!(form as JnfForm).salary.ctc_lpa) errors.push("CTC LPA is required");
    }

    if (!checked) errors.push("All AIPC Guidelines must be confirmed");
    if (!form.declaration.agreed) errors.push("Self-Declaration must be confirmed");
    
    if (form.work_mode === "offline" && (!form.offline_job_location || !form.offline_job_location.trim())) {
      errors.push("Offline Job Location is required");
    }

    if (!form.eligibility.disciplines_json || form.eligibility.disciplines_json.length === 0) {
      errors.push("At least one eligibility rule is required");
    } else {
      form.eligibility.disciplines_json.forEach((rule, i) => {
        if (!rule.discipline || !rule.course || !rule.min_cgpa || !rule.min_hires) {
          errors.push(`Eligibility row ${i + 1} is incomplete`);
        }
      });
    }

    if (!form.stages || form.stages.length === 0) {
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

  const stepStatus = useMemo(() => {
    const status = [false, false, false, false, false];
    
    // Step 0: Company + Job
    if (form.profile_name && form.description && form.location && form.job_categories && form.job_categories.length > 0) {
      if (form.work_mode === "online" || (form.work_mode === "offline" && form.offline_job_location && form.offline_job_location.trim())) {
        status[0] = true;
      }
    }

    // Step 1: Eligibility
    if (form.eligibility.disciplines_json && form.eligibility.disciplines_json.length > 0) {
      status[1] = form.eligibility.disciplines_json.every(r => r.course && r.discipline && r.min_cgpa && r.min_hires && (!r.allow_backlogs || r.max_backlogs));
    }

    // Step 2: Salary
    if (typeFilter === "INF") {
      const f = form as InfForm;
      if (f.salary && f.salary.stipend && f.salary.internship_duration) status[2] = true;
    } else {
      const f = form as JnfForm;
      if (f.salary && f.salary.ctc_lpa) status[2] = true;
    }

    // Step 3: Hiring Stages
    if (form.stages && form.stages.length > 0) {
      status[3] = form.stages.every(s => s.stage_id && s.sequence && s.duration);
    }

    // Step 4: Declaration
    if (form.declaration.agreed && currentAipcItems.every(g => form.declaration.aipc_guidelines[g.key])) {
      status[4] = true;
    }

    return status;
  }, [form, typeFilter, currentAipcItems]);

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
    const token = (session as any)?.accessToken || (session?.user as any)?.accessToken;
    if (!token) return;
    (async () => {
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const res = await api.get("/jobs", { headers });
        if (active) {
          const allJobs = (res.data?.data || []) as JobRow[];
          setJobs(typeFilter ? allJobs.filter((job) => job.job_type === typeFilter) : allJobs);
        }
        const cyclesRes = await api.get("/cycles", { headers });
        const cycleRows = (cyclesRes.data?.data || []) as CycleRow[];
        const stagesRes = await api.get("/hiring-stages", { headers });
        const stageRows = (stagesRes.data?.data || []) as HiringStageRow[];
        if (active) {
          setCycles(cycleRows);
          setHiringStages(stageRows);
          
          // Auto-select first cycle if none selected or invalid
          if (cycleRows.length > 0) {
            setJnfForm(prev => prev.cycle_id === 0 || !cycleRows.some(c => c.cycle_id === prev.cycle_id) ? { ...prev, cycle_id: cycleRows[0].cycle_id } : prev);
            setInfForm(prev => prev.cycle_id === 0 || !cycleRows.some(c => c.cycle_id === prev.cycle_id) ? { ...prev, cycle_id: cycleRows[0].cycle_id } : prev);
          }
        }
      } catch (err) {
        console.error("Initial data fetch failed:", err);
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status === 401) {
          router.push("/login");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [session, typeFilter]);

  useEffect(() => {
    const user = session?.user as any;
    const companyId = Number(user?.companyId || user?.company_id || 0);
    if (!companyId) return;
    setInfForm((prev: any) => (prev.company_id === companyId ? prev : { ...prev, company_id: companyId }));
    setJnfForm((prev: any) => (prev.company_id === companyId ? prev : { ...prev, company_id: companyId }));
  }, [session]);

  useEffect(() => {
    setActiveStep(0);
    setError("");
    setSuccess("");
    setView("list");
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

  const saveJobProgress = async (status: "draft" | "pending" | "submitted" = "pending") => {
    if (!session) return;
    setIsSaving(true);
    setError("");
    try {
      const user = session?.user as any;
      const payload = {
        ...form,
        job_id: form.job_id,
        status,
        last_completed_step: activeStep,
        company_id: Number(user?.companyId || form.company_id),
        job_categories: form.job_categories,
        nirf_objection: form.nirf_objection,
        declaration: {
          agreed: form.declaration.agreed,
          declaration_text: form.declaration.declaration_text,
          aipc_guidelines: form.declaration.aipc_guidelines,
        },
        offline_job_location: form.work_mode === "offline" ? form.offline_job_location : null,
        salary: typeFilter === "INF" ? {
          currency: (form as InfForm).salary.currency,
          stipend: Number((form as InfForm).salary.stipend || 0),
          internship_duration: (form as InfForm).salary.internship_duration,
        } : {
          currency: (form as JnfForm).salary.currency,
          ctc_lpa: Number((form as JnfForm).salary.ctc_lpa || 0),
          fixed_component: Number((form as JnfForm).salary.fixed_component || 0),
          joining_bonus: Number((form as JnfForm).salary.joining_bonus || 0),
          retention_bonus: Number((form as JnfForm).salary.retention_bonus || 0),
          variable_component: Number((form as JnfForm).salary.variable_component || 0),
          esops: Number((form as JnfForm).salary.esops || 0),
          stocks_options: Number((form as JnfForm).salary.stocks_options || 0),
        },
        eligibility: {
          ...form.eligibility,
          disciplines_json: form.eligibility.disciplines_json.map((rule) => ({
            ...rule,
            min_cgpa: Number(rule.min_cgpa || 0),
            min_hires: Number(rule.min_hires || 0),
            max_backlogs: Number(rule.max_backlogs || 0),
          })),
        },
        stages: form.stages
          .filter(stage => stage.stage_id) // Only send stages with a selected ID
          .map((stage) => ({
            stage_id: Number(stage.stage_id),
            sequence: Number(stage.sequence),
            duration: stage.duration || undefined,
          })),
      };

      const res = await api.post("/jobs", payload, { headers: authHeaders(session) });
      const savedJob = res.data;
      
      setForm((prev: any) => ({ ...prev, job_id: savedJob.job_id }));
      
      // Update jobs list
      const listRes = await api.get("/jobs", { headers: authHeaders(session) });
      const allJobs = (listRes.data?.data || []) as JobRow[];
      setJobs(typeFilter ? allJobs.filter((job) => job.job_type === typeFilter) : allJobs);

      return savedJob;
    } catch (err) {
      console.error("Failed to save progress:", err);
      setError("Failed to save progress. Please try again.");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const createJob = async () => {
    if (!session) return;
    if (!canSubmit) {
      setError(`Please fix the following errors:\n${validationErrors.join(", ")}`);
      return;
    }
    setError("");
    setSuccess("");
    
    try {
      const savedJob = await saveJobProgress("submitted");
      const createdJobId = savedJob.job_id;

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
      const user = session?.user as any;
      if (additionalFiles.length > 0 && (user?.companyId || user?.company_id)) {
        await uploadFiles("company", Number(user.companyId || user.company_id), additionalFiles);
      }

      setSuccess("Job notification submitted successfully!");
      setTimeout(() => setView("list"), 2000);
    } catch (err) {
      // Error handled in saveJobProgress
    }
  };

  const resumeJob = async (job: JobRow) => {
    if (!session) return;
    setIsSaving(true);
    try {
      const res = await api.get(`/jobs/${job.job_id}`, { headers: authHeaders(session) });
      const fullJob = res.data;
      
      const formToSet = {
        ...fullJob,
        job_id: fullJob.job_id,
        job_type: fullJob.job_type,
        status: fullJob.status,
        last_completed_step: fullJob.last_completed_step,
        job_categories: fullJob.job_categories || [],
        profile_name: fullJob.profile_name || "",
        description: fullJob.description || "",
        location: fullJob.location || "",
        offline_job_location: fullJob.offline_job_location || "",
        training_period: fullJob.training_period || "",
        bond: fullJob.bond || "",
        registration_link: fullJob.registration_link || "",
        joining_month: fullJob.joining_month || "",
        onboarding_procedure: fullJob.onboarding_procedure || "",
        salary: fullJob.salary ? {
          ...fullJob.salary,
          ctc_lpa: String(fullJob.salary.ctc_lpa || ""),
          stipend: String(fullJob.salary.stipend || ""),
          fixed_component: String(fullJob.salary.fixed_component || ""),
          joining_bonus: String(fullJob.salary.joining_bonus || ""),
          retention_bonus: String(fullJob.salary.retention_bonus || ""),
          variable_component: String(fullJob.salary.variable_component || ""),
          esops: String(fullJob.salary.esops || ""),
          stocks_options: String(fullJob.salary.stocks_options || ""),
        } : (fullJob.job_type === "JNF" ? initialJnf.salary : initialInf.salary),
        eligibility: {
          disciplines_json: (fullJob.eligibility?.disciplines_json || []).map((r: any) => ({
            ...r,
            min_cgpa: String(r.min_cgpa || ""),
            min_hires: String(r.min_hires || ""),
            max_backlogs: String(r.max_backlogs || ""),
          }))
        },
        declaration: {
          agreed: fullJob.declaration?.agreed || false,
          declaration_text: fullJob.declaration?.declaration_text || "",
          aipc_guidelines: fullJob.declaration?.aipc_guidelines_json || (fullJob.job_type === "JNF" ? buildAipcDefaults(jnfAipcGuidelineItems) : buildAipcDefaults(infAipcGuidelineItems)),
        },
        stages: (fullJob.stages || []).map((s: any) => ({
          stage_id: String(s.stage_id),
          sequence: String(s.sequence),
          duration: s.duration || "",
        }))
      };

      if (fullJob.job_type === "JNF") {
        setJnfForm(formToSet as JnfForm);
      } else {
        setInfForm(formToSet as InfForm);
      }
      
      setActiveStep(fullJob.last_completed_step || 0);
      setView("form");
    } catch (err) {
      console.error("Failed to resume job:", err);
      setError("Failed to load job details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
          {typeFilter === "INF" ? "INF Internships" : "JNF Jobs"}
        </Typography>
        {view === 'list' && (
          <Button 
            variant="contained" 
            startIcon={<Sparkles size={20} />}
            onClick={() => {
              setForm(typeFilter === "INF" ? initialInf : initialJnf);
              setActiveStep(0);
              setView("form");
            }}
            sx={{ borderRadius: 2, px: 3, py: 1, fontWeight: 700 }}
          >
            Create New Notification
          </Button>
        )}
      </Box>

      {view === 'list' ? (
        <Paper sx={{ p: 0, borderRadius: 4, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableCell sx={{ fontWeight: 700 }}>Profile Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Step</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">No job notifications found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job.job_id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{job.profile_name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={job.status.toUpperCase()} 
                        size="small" 
                        color={job.status === 'submitted' ? 'success' : (job.status === 'pending' ? 'warning' : 'default')}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {steps[job.last_completed_step]}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {job.status !== 'submitted' ? (
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="warning"
                          onClick={() => resumeJob(job)}
                          sx={{ borderRadius: 1.5, fontWeight: 700 }}
                        >
                          Resume
                        </Button>
                      ) : (
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={() => {
                            // View details logic
                          }}
                          sx={{ borderRadius: 1.5, fontWeight: 700 }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, mb: 2, borderRadius: 4, position: 'relative' }}>
          <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <Button 
              size="small" 
              variant="outlined" 
              color="inherit"
              onClick={async () => {
                await saveJobProgress("pending");
                setView("list");
              }}
              sx={{ borderRadius: 2 }}
            >
              Save & Back to List
            </Button>
          </Box>
          <Stepper activeStep={activeStep} alternativeLabel connector={<ColorlibConnector />}>
          {steps.map((label, index) => (
            <Step key={label} completed={stepStatus[index]}>
              <StepLabel 
                StepIconComponent={ColorlibStepIcon}
                sx={{
                  '& .MuiStepLabel-label': {
                    mt: 1,
                    fontWeight: activeStep === index ? 800 : 500,
                    color: activeStep === index ? '#fbc02d' : (stepStatus[index] ? '#2e7d32' : '#d32f2f'),
                    '&.Mui-active': { color: '#fbc02d' },
                    '&.Mui-completed': { color: '#2e7d32' },
                  }
                }}
              >
                {label}
                {activeStep === index && (
                  <Box
                    component={motion.div}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    sx={{ 
                      position: 'absolute', 
                      top: -25, 
                      left: '50%', 
                      transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap',
                      bgcolor: '#fbc02d',
                      color: '#000',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      zIndex: 2,
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: -6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid #fbc02d',
                      }
                    }}
                  >
                    You are currently here
                  </Box>
                )}
              </StepLabel>
            </Step>
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
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth sx={inputStyles}>
                  <InputLabel id="job-categories-label">Category of Job*</InputLabel>
                  <Select
                    labelId="job-categories-label"
                    multiple
                    value={form.job_categories || []}
                    onChange={(e: any) => setForm({ ...form, job_categories: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                    input={<OutlinedInput label="Category of Job*" />}
                    renderValue={(selected: any) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected || []).map((value: string) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {["Software/IT", "Education/Ed Tech", "E-Commerce", "Consulting", "Finance/Banking", "Analytics", "FMCG", "Core", "Media", "Other"].map((cat) => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                <Box sx={{ 
                  p: 3, 
                  border: '2px dashed', 
                  borderColor: 'primary.light', 
                  borderRadius: 4,
                  bgcolor: 'rgba(25, 118, 210, 0.02)',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.05)', borderColor: 'primary.main' }
                }}>
                  <Box
                    component="input"
                    type="file"
                    multiple
                    id="job-doc-upload"
                    sx={{ display: 'none' }}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJobDescriptionFiles(normalizeFiles(e.target.files, "Job document"))}
                  />
                  <label htmlFor="job-doc-upload">
                    <Stack spacing={1} alignItems="center" sx={{ cursor: 'pointer' }}>
                      <Box sx={{ p: 1.5, bgcolor: 'primary.light', color: 'white', borderRadius: '50%', display: 'flex' }}>
                        <Upload size={24} />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        Job Description Documents
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click to upload or drag and drop (Max 2MB per file)
                      </Typography>
                    </Stack>
                  </label>

                  {jobDescriptionFiles.length > 0 && (
                    <Box sx={{ mt: 3, textAlign: 'left' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', ml: 1 }}>
                        Selected Files ({jobDescriptionFiles.length})
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        {jobDescriptionFiles.map((file, idx) => (
                          <Paper key={idx} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 2, bgcolor: 'white' }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <FileCheck size={18} color="#2e7d32" />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{file.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{(file.size / 1024).toFixed(1)} KB</Typography>
                              </Box>
                            </Stack>
                            <IconButton size="small" color="error" onClick={() => setJobDescriptionFiles(prev => prev.filter((_, i) => i !== idx))}>
                              <Trash2 size={16} />
                            </IconButton>
                          </Paper>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 1 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 4, fontWeight: 800, color: 'primary.main', borderBottom: '3px solid', pb: 1.5, borderColor: 'primary.light', letterSpacing: '0.5px' }}>
              Eligibility Criteria
            </Typography>
            <Stack spacing={4}>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, color: 'primary.dark' }}>Course & Discipline Eligibility</Typography>
              
              {courseOptions.map((course) => {
                const disciplines = courseToDisciplines[course] || [];
                const currentCourseRules = form.eligibility.disciplines_json.filter(r => r.course === course);
                const isAllSelected = disciplines.length > 0 && disciplines.every(d => currentCourseRules.some(r => r.discipline === d));
                
                // Helper to get value for "Apply to All"
                const getApplyToAllValue = (field: keyof EligibilityRule) => {
                  if (currentCourseRules.length === 0) return "";
                  const firstVal = currentCourseRules[0][field];
                  return currentCourseRules.every(r => r[field] === firstVal) ? firstVal : "";
                };

                return (
                  <Paper key={course} variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(25, 118, 210, 0.02)', border: '1px solid', borderColor: 'primary.light' }}>
                    <Stack spacing={3}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>{course}</Typography>
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={isAllSelected}
                              indeterminate={currentCourseRules.length > 0 && !isAllSelected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setForm((prev: BaseForm) => {
                                  let newRules = [...prev.eligibility.disciplines_json];
                                  if (checked) {
                                    // Add missing disciplines
                                    disciplines.forEach(d => {
                                      if (!newRules.some(r => r.course === course && r.discipline === d)) {
                                        newRules.push({ course, discipline: d, min_cgpa: "", min_hires: "", criteria: "", allow_backlogs: false, max_backlogs: "", gender: "All" });
                                      }
                                    });
                                  } else {
                                    // Remove all disciplines for this course
                                    newRules = newRules.filter(r => r.course !== course);
                                  }
                                  return { ...prev, eligibility: { ...prev.eligibility, disciplines_json: newRules } };
                                });
                              }}
                            />
                          }
                          label={<Typography sx={{ fontWeight: 700 }}>Select All Disciplines</Typography>}
                        />
                      </Stack>

                      {currentCourseRules.length > 0 && (
                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'white', border: '1px dashed', borderColor: 'primary.light' }}>
                          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Sparkles size={16} /> Apply to All Selected Disciplines in {course}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 2 }}>
                              <TextField
                                label="Min CGPA"
                                type="number"
                                fullWidth
                                size="small"
                                value={getApplyToAllValue('min_cgpa')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((prev: BaseForm) => ({
                                    ...prev,
                                    eligibility: {
                                      ...prev.eligibility,
                                      disciplines_json: prev.eligibility.disciplines_json.map(r => r.course === course ? { ...r, min_cgpa: val } : r)
                                    }
                                  }));
                                }}
                                sx={inputStyles}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                              <TextField
                                label="Min Hires"
                                type="number"
                                fullWidth
                                size="small"
                                value={getApplyToAllValue('min_hires')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((prev: BaseForm) => ({
                                    ...prev,
                                    eligibility: {
                                      ...prev.eligibility,
                                      disciplines_json: prev.eligibility.disciplines_json.map(r => r.course === course ? { ...r, min_hires: val } : r)
                                    }
                                  }));
                                }}
                                sx={inputStyles}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                              <TextField
                                select
                                label="Gender"
                                fullWidth
                                size="small"
                                value={getApplyToAllValue('gender')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((prev: BaseForm) => ({
                                    ...prev,
                                    eligibility: {
                                      ...prev.eligibility,
                                      disciplines_json: prev.eligibility.disciplines_json.map(r => r.course === course ? { ...r, gender: val } : r)
                                    }
                                  }));
                                }}
                                sx={inputStyles}
                              >
                                <MenuItem value="All">All</MenuItem>
                                <MenuItem value="Male">Male</MenuItem>
                                <MenuItem value="Female">Female</MenuItem>
                                <MenuItem value="Others">Others</MenuItem>
                              </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                              <FormControlLabel
                                control={
                                  <Checkbox 
                                    checked={currentCourseRules.every(r => r.allow_backlogs)}
                                    indeterminate={currentCourseRules.some(r => r.allow_backlogs) && !currentCourseRules.every(r => r.allow_backlogs)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setForm((prev: BaseForm) => ({
                                        ...prev,
                                        eligibility: {
                                          ...prev.eligibility,
                                          disciplines_json: prev.eligibility.disciplines_json.map(r => r.course === course ? { ...r, allow_backlogs: checked } : r)
                                        }
                                      }));
                                    }}
                                  />
                                }
                                label="Allow Backlogs"
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                              <TextField
                                label="Max Backlogs"
                                type="number"
                                fullWidth
                                size="small"
                                disabled={!currentCourseRules.some(r => r.allow_backlogs)}
                                value={getApplyToAllValue('max_backlogs')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((prev: BaseForm) => ({
                                    ...prev,
                                    eligibility: {
                                      ...prev.eligibility,
                                      disciplines_json: prev.eligibility.disciplines_json.map(r => r.course === course ? { ...r, max_backlogs: val } : r)
                                    }
                                  }));
                                }}
                                sx={inputStyles}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 2 }}>
                              <TextField
                                label="Criteria"
                                fullWidth
                                size="small"
                                value={getApplyToAllValue('criteria')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((prev: BaseForm) => ({
                                    ...prev,
                                    eligibility: {
                                      ...prev.eligibility,
                                      disciplines_json: prev.eligibility.disciplines_json.map(r => r.course === course ? { ...r, criteria: val } : r)
                                    }
                                  }));
                                }}
                                sx={inputStyles}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      )}

                      <Stack spacing={2}>
                        {disciplines.map((discipline) => {
                          const rule = currentCourseRules.find(r => r.discipline === discipline);
                          const isSelected = !!rule;

                          return (
                            <Box key={discipline} sx={{ 
                              p: 2, 
                              borderRadius: 2, 
                              bgcolor: isSelected ? 'white' : 'rgba(0,0,0,0.02)', 
                              border: '1px solid',
                              borderColor: isSelected ? 'rgba(0,0,0,0.1)' : 'transparent',
                              opacity: isSelected ? 1 : 0.7,
                              transition: 'all 0.2s'
                            }}>
                              <Grid container spacing={2} alignItems="center">
                                <Grid size={{ xs: 12, md: 3 }}>
                                  <FormControlLabel
                                    control={
                                      <Checkbox 
                                        size="small"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setForm((prev: BaseForm) => {
                                            let newRules = [...prev.eligibility.disciplines_json];
                                            if (checked) {
                                              newRules.push({ course, discipline, min_cgpa: "", min_hires: "", criteria: "", allow_backlogs: false, max_backlogs: "", gender: "All" });
                                            } else {
                                              newRules = newRules.filter(r => !(r.course === course && r.discipline === discipline));
                                            }
                                            return { ...prev, eligibility: { ...prev.eligibility, disciplines_json: newRules } };
                                          });
                                        }}
                                      />
                                    }
                                    label={<Typography variant="body2" sx={{ fontWeight: 700 }}>{discipline}</Typography>}
                                  />
                                </Grid>
                                
                                {isSelected ? (
                                  <>
                                    <Grid size={{ xs: 12, md: 1.5 }}>
                                      <TextField
                                        label="Min CGPA*"
                                        type="number"
                                        fullWidth
                                        size="small"
                                        value={rule.min_cgpa}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setForm((prev: BaseForm) => ({
                                            ...prev,
                                            eligibility: {
                                              ...prev.eligibility,
                                              disciplines_json: prev.eligibility.disciplines_json.map(r => (r.course === course && r.discipline === discipline) ? { ...r, min_cgpa: val } : r)
                                            }
                                          }));
                                        }}
                                        sx={inputStyles}
                                      />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 1.5 }}>
                                      <TextField
                                        label="Min Hires*"
                                        type="number"
                                        fullWidth
                                        size="small"
                                        value={rule.min_hires}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setForm((prev: BaseForm) => ({
                                            ...prev,
                                            eligibility: {
                                              ...prev.eligibility,
                                              disciplines_json: prev.eligibility.disciplines_json.map(r => (r.course === course && r.discipline === discipline) ? { ...r, min_hires: val } : r)
                                            }
                                          }));
                                        }}
                                        sx={inputStyles}
                                      />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 1.5 }}>
                                      <TextField
                                        select
                                        label="Gender"
                                        fullWidth
                                        size="small"
                                        value={rule.gender}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setForm((prev: BaseForm) => ({
                                            ...prev,
                                            eligibility: {
                                              ...prev.eligibility,
                                              disciplines_json: prev.eligibility.disciplines_json.map(r => (r.course === course && r.discipline === discipline) ? { ...r, gender: val } : r)
                                            }
                                          }));
                                        }}
                                        sx={inputStyles}
                                      >
                                        <MenuItem value="All">All</MenuItem>
                                        <MenuItem value="Male">Male</MenuItem>
                                        <MenuItem value="Female">Female</MenuItem>
                                        <MenuItem value="Others">Others</MenuItem>
                                      </TextField>
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 1.5 }}>
                                      <FormControlLabel
                                        control={
                                          <Checkbox 
                                            size="small"
                                            checked={rule.allow_backlogs}
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              setForm((prev: BaseForm) => ({
                                                ...prev,
                                                eligibility: {
                                                  ...prev.eligibility,
                                                  disciplines_json: prev.eligibility.disciplines_json.map(r => (r.course === course && r.discipline === discipline) ? { ...r, allow_backlogs: checked } : r)
                                                }
                                              }));
                                            }}
                                          />
                                        }
                                        label={<Typography variant="caption">Backlogs</Typography>}
                                      />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 1 }}>
                                      <TextField
                                        label="Max*"
                                        type="number"
                                        fullWidth
                                        size="small"
                                        disabled={!rule.allow_backlogs}
                                        value={rule.max_backlogs}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setForm((prev: BaseForm) => ({
                                            ...prev,
                                            eligibility: {
                                              ...prev.eligibility,
                                              disciplines_json: prev.eligibility.disciplines_json.map(r => (r.course === course && r.discipline === discipline) ? { ...r, max_backlogs: val } : r)
                                            }
                                          }));
                                        }}
                                        sx={inputStyles}
                                      />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 2 }}>
                                      <TextField
                                        label="Criteria"
                                        fullWidth
                                        size="small"
                                        value={rule.criteria}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setForm((prev: BaseForm) => ({
                                            ...prev,
                                            eligibility: {
                                              ...prev.eligibility,
                                              disciplines_json: prev.eligibility.disciplines_json.map(r => (r.course === course && r.discipline === discipline) ? { ...r, criteria: val } : r)
                                            }
                                          }));
                                        }}
                                        sx={inputStyles}
                                      />
                                    </Grid>
                                  </>
                                ) : (
                                  <Grid size={{ xs: 12, md: 9 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      Select this discipline to configure its criteria
                                    </Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          );
                        })}
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        {activeStep === 2 && (
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
                            <Typography sx={{ fontWeight: 700, mr: 0.5 }}>{currencySymbols[form.salary.currency] || "₹"}</Typography>
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
                            <Typography sx={{ fontWeight: 700, mr: 0.5 }}>{currencySymbols[form.salary.currency] || "₹"}</Typography>
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
                            <Typography sx={{ fontWeight: 700, mr: 0.5 }}>{currencySymbols[form.salary.currency] || "₹"}</Typography>
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
                            <Typography sx={{ fontWeight: 700, mr: 0.5 }}>{currencySymbols[form.salary.currency] || "₹"}</Typography>
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
                            <Typography sx={{ fontWeight: 700, mr: 0.5 }}>{currencySymbols[form.salary.currency] || "₹"}</Typography>
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
                  <Box
                    component="input"
                    type="file"
                    multiple
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSalaryDescriptionFiles(normalizeFiles(e.target.files, "Salary document"))}
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

        {activeStep === 3 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" sx={{ mb: 4, fontWeight: 800, color: 'primary.main', borderBottom: '3px solid', pb: 1.5, borderColor: 'primary.light', letterSpacing: '0.5px' }}>
              Hiring Stages & Process
            </Typography>
            <Stack spacing={3}>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                Define the sequence and duration of each selection stage.
              </Typography>
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
                        onChange={(e) => setForm((prev: BaseForm) => {
                          const stages = [...prev.stages];
                          stages[index] = { ...stages[index], sequence: e.target.value };
                          return { ...prev, stages };
                        })}
                        helperText="Order in which the stage occurs"
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
          </Box>
        )}

        {activeStep === 4 && (
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
              
              <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Additional Supporting Documents (optional)</Typography>
                <Box
                  component="input"
                  type="file"
                  multiple
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdditionalFiles(normalizeFiles(e.target.files, "Additional document"))}
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
              onClick={async () => {
                await saveJobProgress("pending");
                setActiveStep((p) => p - 1);
              }}
              sx={{ borderRadius: 2, px: 4 }}
            >
              Back
            </Button>
            <Button 
              variant="contained" 
              disabled={activeStep === steps.length - 1} 
              onClick={async () => {
                await saveJobProgress("pending");
                setActiveStep((p) => Math.min(steps.length - 1, p + 1));
              }}
              sx={{ borderRadius: 2, px: 4 }}
            >
              Save and Next
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
            {isSaving ? "Saving..." : "Submit Notification"}
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
      )}
    </AppShell>
  );
}
