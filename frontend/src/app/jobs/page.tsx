"use client";

import AppShell from "@/components/layout/AppShell";
import { Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Paper, Stack, Step, StepLabel, Stepper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, InputAdornment, Grid2 as Grid, FormControl, InputLabel, Select, OutlinedInput, IconButton, StepConnector, stepConnectorClasses, styled, Accordion, AccordionSummary, AccordionDetails, Divider, Tooltip, Tabs, Tab } from "@mui/material";
import { Suspense, useEffect, useMemo, useState, Fragment } from "react";
import { useSession } from "next-auth/react";
import { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { authHeaders } from "@/lib/authHeaders";
import { infAipcGuidelineItems, jnfAipcGuidelineItems, courseOptions, courseToDisciplines, stageDurationOptions } from "@/lib/constants";
import { Briefcase, MapPin, Globe, Calendar, Link as LinkIcon, FileText, IndianRupee, Award, ShieldCheck, ListOrdered, Clock, TrendingUp, Upload, Trash2, FileCheck, Sparkles, ChevronDown, Plus, Copy, X, XCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const buildAipcDefaults = (items: { key: string }[]) =>
  Object.fromEntries(items.map((g) => [g.key, false])) as Record<string, boolean>;

const steps = ["Company + Job", "Eligibility", "Salary", "Hiring Stages", "Declaration"];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

type JobRow = { 
  job_id: number; 
  profile_name: string; 
  job_type: "INF" | "JNF"; 
  cycle_id: number; 
  status: "draft" | "pending" | "submitted"; 
  last_completed_step: number; 
  salary?: { salary_id: number } | null;
  updated_at?: string;
};

type CycleRow = { cycle_id: number; name: string };
type HiringStageRow = { stage_id: number; name: string };
type EligibilityRule = { 
  discipline: string; 
  course: string; 
  min_cgpa: string; 
  max_backlogs: string;
  allow_backlogs: boolean;
  selected: boolean;
};

interface SalaryStructure {
  programme: string;
  ctc_annual: string;
  base_fixed: string;
  monthly_take_home: string;
  selected: boolean;
}

interface AdditionalSalary {
  joining_bonus: string;
  retention_bonus: string;
  bond_deductions: string;
  esops_vest_period: string;
  relocation_allowance: string;
}

interface BaseForm {
  job_id?: number;
  company_id: number;
  cycle_id: number;
  job_type: "INF" | "JNF";
  profile_name: string;
  job_designation: string;
  place_of_posting: string;
  description: string;
  location: string;
  work_mode: "online" | "offline" | "hybrid";
  offline_job_location: string;
  expected_hires: string;
  min_hires: string;
  required_skills: string[];
  training_period: string;
  bond: string;
  registration_link: string;
  joining_month: string;
  onboarding_procedure: string;
  additional_info: string;
  additional_info_1000: string;
  job_categories: string[];
  status: "draft" | "pending" | "submitted";
  last_completed_step: number;
  parent_job_id?: number;
  has_psychometric_test: boolean;
  has_medical_test: boolean;
  other_screening_details: string;
  eligibility: {
    global_min_cgpa: string;
    global_allow_backlogs: boolean;
    global_max_backlogs: string;
    high_school_percentage: string;
    gender_filter: string;
    disciplines_json: EligibilityRule[];
  };
  declaration: { 
    agreed: boolean; 
    declaration_text: string; 
    aipc_guidelines: Record<string, boolean>;
    authorised_signatory_name: string;
    authorised_signatory_designation: string;
    authorised_signatory_date: string;
    typed_signature: string;
    rti_nirf_consent: boolean;
  };
  stages: Array<{ 
    stage_id: string; 
    sequence: string; 
    duration: string;
    selection_mode: string;
    test_type: string;
    interview_mode: string;
    infrastructure_requirements: string;
  }>;
}

interface JnfForm extends BaseForm {
  job_type: "JNF";
  salary: {
    currency: string;
    different_structure_per_programme: boolean;
    salaries_json: SalaryStructure[];
    additional_components: Record<string, AdditionalSalary>; // Keyed by programme or "global"
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

type TabData = {
  id: string;
  title: string;
  form: JnfForm | InfForm;
  activeStep: number;
  isDirty: boolean;
};

export default function JobsPage() {
  return (
    <Suspense fallback={<Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><Typography>Loading...</Typography></Box>}>
      <JobsPageContent />
    </Suspense>
  );
}

const buildInitialEligibility = (): EligibilityRule[] => {
  const rules: EligibilityRule[] = [];
  Object.entries(courseToDisciplines).forEach(([course, disciplines]) => {
    disciplines.forEach(discipline => {
      rules.push({
        course,
        discipline,
        min_cgpa: "0.0",
        max_backlogs: "0",
        allow_backlogs: false,
        selected: false
      });
    });
  });
  return rules;
};

const initialAdditionalSalary = (): AdditionalSalary => ({
  joining_bonus: "",
  retention_bonus: "",
  bond_deductions: "",
  esops_vest_period: "",
  relocation_allowance: ""
});

const defaultHiringStagesData = [
  { name: "Pre-Placement Talk", type: "PPT" },
  { name: "Resume Shortlisting", type: "Shortlisting" },
  { name: "Online/Written Test", type: "Coding" },
  { name: "Group Discussion", type: "GD" },
  { name: "Any Other Round", type: "Psychometric" },
  { name: "Personal/Technical Interview", type: "Technical" },
];

const buildInitialStages = () => defaultHiringStagesData.map((stage, idx) => ({
  stage_id: (idx + 1).toString(),
  sequence: (idx + 1).toString(),
  duration: "",
  selection_mode: "Offline",
  test_type: stage.type,
  interview_mode: "On-campus",
  infrastructure_requirements: ""
}));

const getInitialJnf = (aipc: Record<string, boolean>): JnfForm => ({
  job_id: undefined,
  company_id: 0,
  cycle_id: 1,
  job_type: "JNF",
  profile_name: "",
  job_designation: "",
  place_of_posting: "",
  description: "",
  location: "",
  work_mode: "offline",
  offline_job_location: "",
  expected_hires: "",
  min_hires: "",
  required_skills: [] as string[],
  training_period: "",
  bond: "",
  registration_link: "",
  joining_month: "",
  onboarding_procedure: "",
  additional_info: "",
  additional_info_1000: "",
  job_categories: ["Technical"],
  status: "draft",
  last_completed_step: 0,
  has_psychometric_test: false,
  has_medical_test: false,
  other_screening_details: "",
  salary: { 
    currency: "INR",
    different_structure_per_programme: false,
    salaries_json: courseOptions.map(programme => ({
      programme,
      ctc_annual: "",
      base_fixed: "",
      monthly_take_home: "",
      selected: false
    })),
    additional_components: {
      global: initialAdditionalSalary()
    }
  },
  eligibility: {
    global_min_cgpa: "0.0",
    global_allow_backlogs: false,
    global_max_backlogs: "0",
    high_school_percentage: "0",
    gender_filter: "All",
    disciplines_json: buildInitialEligibility(),
  },
  declaration: { 
    agreed: false, 
    declaration_text: "", 
    aipc_guidelines: aipc,
    authorised_signatory_name: "",
    authorised_signatory_designation: "",
    authorised_signatory_date: new Date().toISOString().split('T')[0],
    typed_signature: "",
    rti_nirf_consent: false
  },
  stages: buildInitialStages(),
});

const getInitialInf = (aipc: Record<string, boolean>): InfForm => ({
  job_id: undefined,
  company_id: 0,
  cycle_id: 1,
  job_type: "INF",
  profile_name: "",
  job_designation: "",
  place_of_posting: "",
  description: "",
  location: "",
  work_mode: "offline",
  offline_job_location: "",
  expected_hires: "",
  min_hires: "",
  required_skills: [] as string[],
  training_period: "",
  bond: "",
  registration_link: "",
  joining_month: "",
  onboarding_procedure: "",
  additional_info: "",
  additional_info_1000: "",
  job_categories: ["Technical"],
  status: "draft",
  last_completed_step: 0,
  has_psychometric_test: false,
  has_medical_test: false,
  other_screening_details: "",
  salary: { 
    currency: "INR",
    stipend: "",
    internship_duration: "",
  },
  eligibility: {
    global_min_cgpa: "0.0",
    global_allow_backlogs: false,
    global_max_backlogs: "0",
    high_school_percentage: "0",
    gender_filter: "All",
    disciplines_json: buildInitialEligibility(),
  },
  declaration: { 
    agreed: false, 
    declaration_text: "", 
    aipc_guidelines: aipc,
    authorised_signatory_name: "",
    authorised_signatory_designation: "",
    authorised_signatory_date: new Date().toISOString().split('T')[0],
    typed_signature: "",
    rti_nirf_consent: false
  },
  stages: buildInitialStages(),
});

const getCourseCategory = (course: string): "UG" | "PG" | "PhD" | "Other" => {
  if (course.includes("B.Tech") || course.includes("Integrated M.Tech")) return "UG";
  if (course.includes("M.Tech") || course.includes("M.Sc") || course.includes("MBA") || course.includes("M.A.")) return "PG";
  if (course.includes("PhD")) return "PhD";
  return "Other";
};

function JobsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get("type") as "JNF" | "INF" | null;
  const resumeId = searchParams.get("resume");
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";

  const [view, setView] = useState<"list" | "form">("list");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [hiringStages, setHiringStages] = useState<HiringStageRow[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Multiple Tabs Support
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

  const [jnfAipc] = useState(buildAipcDefaults(jnfAipcGuidelineItems));
  const [infAipc] = useState(buildAipcDefaults(infAipcGuidelineItems));

  const mergeFormWithDefaults = (form: JnfForm | InfForm) => {
    const isJnf = form.job_type === "JNF";
    const base = isJnf ? getInitialJnf(jnfAipc) : getInitialInf(infAipc);
    
    // Merge disciplines_json to ensure all branches are visible even if not saved in DB
    const mergedDisciplines = [...base.eligibility.disciplines_json];
    if (form.eligibility?.disciplines_json) {
      form.eligibility.disciplines_json.forEach(savedRule => {
        const idx = mergedDisciplines.findIndex(r => r.course === savedRule.course && r.discipline === savedRule.discipline);
        if (idx > -1) {
          mergedDisciplines[idx] = { ...mergedDisciplines[idx], ...savedRule };
        }
      });
    }

    const mergedSalary = isJnf 
      ? {
          ...(base as JnfForm).salary,
          ...((form as JnfForm).salary || {}),
          additional_components: {
            ...(base as JnfForm).salary.additional_components,
            ...((form as JnfForm).salary?.additional_components || {})
          },
          salaries_json: (form as JnfForm).salary?.salaries_json
            ? (base as JnfForm).salary.salaries_json.map(baseSal => {
                const savedSal = (form as JnfForm).salary.salaries_json.find(s => s.programme === baseSal.programme);
                return savedSal ? { ...baseSal, ...savedSal } : baseSal;
              })
            : (base as JnfForm).salary.salaries_json
        }
      : {
          ...(base as InfForm).salary,
          ...((form as InfForm).salary || {})
        };

    return {
      ...base,
      ...form,
      salary: mergedSalary,
      eligibility: { 
        ...base.eligibility, 
        ...(form.eligibility || {}),
        disciplines_json: mergedDisciplines
      },
      declaration: { 
        ...base.declaration, 
        ...(form.declaration || {}),
        aipc_guidelines: {
          ...base.declaration.aipc_guidelines,
          ...(form.declaration?.aipc_guidelines || {})
        }
      },
      stages: form.stages && form.stages.length > 0 ? form.stages : base.stages,
    } as JnfForm | InfForm;
  };

  const createNewTab = (form: JnfForm | InfForm, title: string = "New Profile") => {
    const mergedForm = mergeFormWithDefaults(form);
    const id = Math.random().toString(36).substr(2, 9);
    const newTab: TabData = {
      id,
      title: mergedForm.profile_name || title,
      form: mergedForm,
      activeStep: mergedForm.last_completed_step || 0,
      isDirty: false
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
    setView("form");
  };

  const updateActiveTab = (updates: Partial<TabData> | ((prev: TabData) => TabData)) => {
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        if (typeof updates === 'function') return updates(t);
        return { ...t, ...updates };
      }
      return t;
    }));
  };

  const closeTab = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
        if (newTabs.length === 0) setView("list");
      }
      return newTabs;
    });
  };

  const duplicateCurrentTab = () => {
    if (!activeTab) return;
    const clonedForm = JSON.parse(JSON.stringify(activeTab.form));
    clonedForm.job_id = undefined; // Cloned form should be new
    
    // Naming logic
    const baseName = clonedForm.profile_name || "Profile";
    const existingMatches = tabs.filter(t => t.form.profile_name.startsWith(baseName)).length;
    clonedForm.profile_name = `${baseName} Profile ${existingMatches + 1}`;
    clonedForm.status = "draft";
    clonedForm.last_completed_step = 0;

    createNewTab(clonedForm, clonedForm.profile_name);
  };

  const fetchData = async () => {
    if (status !== "authenticated" || !session) {
      console.log("Fetch skipped: status is", status, "session is", !!session);
      return;
    }
    try {
      const testRes = await api.get("/test");
      console.log("API test response:", testRes.data);
      
      const headers = authHeaders(session);
      if (!headers.Authorization) {
        console.error("No authorization token found in session");
        return;
      }

      try {
        const authCheck = await api.get("/auth-check", { headers });
        console.log("Auth check response:", authCheck.data);
      } catch (authErr) {
        console.error("Auth check failed:", authErr);
      }

      console.log("Fetching jobs with headers:", headers);
      const res = await api.get("/jobs", { headers });
      const allJobs = (res.data?.data || []) as JobRow[];
      setJobs(typeFilter ? allJobs.filter((job) => job.job_type === typeFilter) : allJobs);
      
      const [cyclesRes, stagesRes] = await Promise.all([
        api.get("/cycles", { headers }),
        api.get("/hiring-stages", { headers })
      ]);
      
      setCycles(cyclesRes.data?.data || []);
      setHiringStages(stagesRes.data?.data || []);
      
      if (resumeId) {
        const resumeRes = await api.get(`/jobs/${resumeId}`, { headers });
        const fullJob = resumeRes.data;
        createNewTab(fullJob, fullJob.profile_name);
      }
    } catch (err) {
      console.error("Data fetch failed:", err);
      const axiosErr = err as AxiosError;
      console.log("Axios error response:", axiosErr.response?.data);
      if (axiosErr.response?.status === 401) {
        setError("Session expired or unauthorized. Please log in again.");
      }
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, session, typeFilter, resumeId]);

  const saveJobProgress = async (tab: TabData, status: "draft" | "pending" | "submitted" = "pending") => {
    if (!session) return;
    setIsSaving(true);
    try {
      const { form, activeStep } = tab;
      const user = session?.user as any;
      const payload = {
        ...form,
        status,
        last_completed_step: activeStep,
        company_id: Number(user?.companyId || user?.company_id || form.company_id),
      };

      const res = await api.post("/jobs", payload, { headers: authHeaders(session) });
      const savedJob = res.data;
      
      setTabs(prev => prev.map(t => t.id === tab.id ? { 
        ...t, 
        form: { ...t.form, job_id: savedJob.job_id },
        isDirty: false,
        title: savedJob.profile_name
      } : t));

      return savedJob;
    } catch (err) {
      console.error("Failed to save progress:", err);
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 422) {
        const errors = (axiosErr.response.data as any).errors;
        const firstError = Object.values(errors)[0] as string[];
        setError(`Validation Error: ${firstError[0]}`);
      } else {
        setError("An unexpected error occurred while saving.");
      }
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const submitAllTabs = async () => {
    setIsSaving(true);
    setError("");
    try {
      for (const tab of tabs) {
        await saveJobProgress(tab, "submitted");
      }
      setSuccess("All profiles submitted successfully!");
      setTimeout(() => {
        setTabs([]);
        setActiveTabId(null);
        setView("list");
        fetchData();
      }, 2000);
    } catch (err) {
      setError("Failed to submit some profiles. Please check individual tabs.");
    } finally {
      setIsSaving(false);
    }
  };

  const resumeJob = async (job: JobRow) => {
    if (!session) return;
    setIsSaving(true);
    try {
      const res = await api.get(`/jobs/${job.job_id}`, { headers: authHeaders(session) });
      const fullJob = res.data;
      
      // Open the original profile
      createNewTab(fullJob, fullJob.profile_name);
      
      // If it has duplicates, open them as well
      if (fullJob.duplicates && fullJob.duplicates.length > 0) {
        for (const duplicate of fullJob.duplicates) {
          // Fetch full duplicate data
          const dupRes = await api.get(`/jobs/${duplicate.job_id}`, { headers: authHeaders(session) });
          createNewTab(dupRes.data, dupRes.data.profile_name);
        }
      }
    } catch (err) {
      setError("Failed to load profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const syncChangesToDuplicates = async (tab: TabData) => {
    if (!session || !tab.form.job_id) return;
    setIsSaving(true);
    try {
      // First save the current profile
      await saveJobProgress(tab, tab.form.status);
      
      // Then sync to duplicates
      const res = await api.post(`/jobs/${tab.form.job_id}/sync`, {}, { headers: authHeaders(session) });
      setSuccess(res.data.message);
      
      // Refresh all open tabs that are duplicates of this one
      const duplicateIds = tabs.filter(t => t.form.parent_job_id === tab.form.job_id).map(t => t.form.job_id);
      if (duplicateIds.length > 0) {
        for (const id of duplicateIds) {
          if (!id) continue;
          const updatedRes = await api.get(`/jobs/${id}`, { headers: authHeaders(session) });
          const merged = mergeFormWithDefaults(updatedRes.data);
          setTabs(prev => prev.map(t => t.form.job_id === id ? { ...t, form: merged, isDirty: false } : t));
        }
      }
    } catch (err) {
      setError("Failed to sync changes to duplicates.");
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateJobFromList = async (jobId: number) => {
    setIsSaving(true);
    try {
      const res = await api.post(`/jobs/${jobId}/duplicate`, {}, { headers: authHeaders(session) });
      const fullJob = res.data;
      createNewTab(fullJob, fullJob.profile_name);
    } catch (err) {
      setError("Failed to duplicate profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Main Render
  return (
    <AppShell>
      <Box sx={{ mb: 6 }}>
        <Box>
          <Typography variant="h6" sx={{ letterSpacing: 4, color: "text.secondary", fontWeight: 300, mb: 1, textTransform: 'uppercase' }}>
            Recruitment Portal
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#004d40', mb: 1, letterSpacing: -1 }}>
                {typeFilter === "INF" ? "INF Internships" : "JNF Jobs"}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 400, color: '#00796b', opacity: 0.8 }}>
                {view === "list" ? "MANAGE AND DUPLICATE NOTIFICATIONS" : "MULTIPLE PROFILE WORKSPACE"}
              </Typography>
            </Box>
            {view === "list" && (
              <Button
                variant="contained"
                startIcon={<Plus />}
                onClick={() => createNewTab(typeFilter === "INF" ? getInitialInf(infAipc) : getInitialJnf(jnfAipc))}
                sx={{ 
                  borderRadius: 4, 
                  px: 4, 
                  py: 2, 
                  fontWeight: 800, 
                  fontSize: '1rem',
                  boxShadow: '0 10px 25px rgba(0,121,107,0.3)',
                  background: 'linear-gradient(135deg, #00796b 0%, #004d40 100%)'
                }}
              >
                Create New Notification
              </Button>
            )}
          </Stack>
        </Box>
      </Box>

      {tabs.length > 0 && (
        <Paper 
          sx={{ 
            mb: 4, 
            borderRadius: 5, 
            overflow: 'hidden', 
            bgcolor: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}
        >
          <Tabs 
            value={activeTabId} 
            onChange={(_, id) => setActiveTabId(id)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              borderBottom: 1, 
              borderColor: 'rgba(0,0,0,0.05)',
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#00796b'
                }
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
                bgcolor: '#00796b'
              }
            }}
          >
            {tabs.map(tab => (
              <Tab 
                key={tab.id} 
                value={tab.id}
                label={
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ display: 'flex', color: activeTabId === tab.id ? '#00796b' : 'inherit' }}>
                      <FileText size={18} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{tab.title || "Untitled"}</Typography>
                    <Box 
                      component="span"
                      onClick={(e) => closeTab(tab.id, e)}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        p: 0.5, 
                        borderRadius: 2, 
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.08)', color: 'error.main' },
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <X size={14} />
                    </Box>
                  </Stack>
                }
              />
            ))}
            <Tab 
              value="add" 
              onClick={(e) => { e.preventDefault(); createNewTab(typeFilter === "INF" ? getInitialInf(infAipc) : getInitialJnf(jnfAipc)); }}
              label={<Box sx={{ display: 'flex', alignItems: 'center', color: '#00796b' }}><Plus size={22} /></Box>} 
              sx={{ minWidth: 70 }}
            />
          </Tabs>
        </Paper>
      )}

      <Box>
        {view === "list" ? (
          <Box key="list">
            <Paper sx={{ p: 0, borderRadius: 6, overflow: "hidden", bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(0,121,107,0.05)' }}>
                    <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>PROFILE NAME</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>STATUS</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>LAST STEP</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>DATE & TIME</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }} align="right">ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 12 }}>
                        <Box sx={{ opacity: 0.2, mb: 3, color: '#00796b' }}><Briefcase size={80} /></Box>
                        <Typography variant="h5" sx={{ color: '#004d40', fontWeight: 700, mb: 1 }}>No profiles found</Typography>
                        <Typography color="text.secondary">Create your first recruitment notification to get started.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    jobs.map((job, idx) => (
                      <TableRow 
                        key={job.job_id} 
                        hover 
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                      >
                        <TableCell sx={{ fontWeight: 700, color: '#004d40' }}>{job.profile_name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={job.status.toUpperCase()} 
                            size="small" 
                            sx={{ 
                              fontWeight: 900, 
                              fontSize: '0.65rem', 
                              letterSpacing: 1,
                              bgcolor: job.status === 'submitted' ? '#e0f2f1' : '#fff3e0',
                              color: job.status === 'submitted' ? '#00796b' : '#ef6c00',
                              border: '1px solid',
                              borderColor: job.status === 'submitted' ? '#b2dfdb' : '#ffe0b2'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            {steps[job.last_completed_step]}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {job.updated_at ? new Date(job.updated_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                            <Tooltip title="Duplicate">
                              <IconButton 
                                size="small" 
                                onClick={() => duplicateJobFromList(job.job_id)}
                                sx={{ color: '#00796b', bgcolor: 'rgba(0,121,107,0.05)', '&:hover': { bgcolor: 'rgba(0,121,107,0.1)' } }}
                              >
                                <Copy size={18} />
                              </IconButton>
                            </Tooltip>
                            <Button 
                              variant="contained" 
                              size="small" 
                              onClick={() => resumeJob(job)}
                              sx={{ 
                                borderRadius: 2.5, 
                                fontWeight: 800, 
                                fontSize: '0.75rem',
                                background: job.status === 'submitted' ? 'linear-gradient(135deg, #00796b 0%, #004d40 100%)' : 'linear-gradient(135deg, #fb8c00 0%, #ef6c00 100%)',
                                px: 2
                              }}
                            >
                              {job.status === 'submitted' ? "View Details" : "Resume Edit"}
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        ) : (
          activeTab && (
            <Box key="form">
              <Paper sx={{ p: { xs: 3, md: 6 }, borderRadius: 8, bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 6 }}>
                  <Stepper 
                    activeStep={activeTab.activeStep} 
                    sx={{ 
                      flexGrow: 1,
                      '& .MuiStepIcon-root': {
                        width: 32,
                        height: 32,
                        '&.Mui-active': { color: '#00796b' },
                        '&.Mui-completed': { color: '#009688' }
                      },
                      '& .MuiStepLabel-label': {
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        mt: 1,
                        '&.Mui-active': { color: '#004d40' }
                      }
                    }}
                  >
                    {steps.map((label) => (
                      <Step key={label}><StepLabel>{label}</StepLabel></Step>
                    ))}
                  </Stepper>
                  
                  <Stack direction="row" spacing={2} sx={{ ml: 6 }}>
                    {isAdmin ? (
                      <>
                        <Button 
                          variant="contained" 
                          color="success" 
                          startIcon={<FileCheck size={18} />}
                          onClick={() => saveJobProgress(activeTab, "submitted").then(() => api.put(`/applications/${activeTab.form.job_id}`, { status: 'selected' }, { headers: authHeaders(session) })).then(() => { setSuccess("Profile approved."); fetchData(); setView("list"); })}
                          disabled={isSaving}
                          sx={{ borderRadius: 3, px: 3, background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)' }}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="contained" 
                          color="error" 
                          startIcon={<XCircle size={18} />}
                          onClick={() => api.put(`/applications/${activeTab.form.job_id}`, { status: 'rejected' }, { headers: authHeaders(session) }).then(() => { setSuccess("Profile rejected."); fetchData(); setView("list"); })}
                          disabled={isSaving}
                          sx={{ borderRadius: 3, px: 3, background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)' }}
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <>
                        {activeTab.form.job_id && (
                          <Tooltip title="Apply current changes to all duplicated profiles">
                            <Button 
                              variant="outlined" 
                              color="info"
                              startIcon={<RefreshCw size={18} />} 
                              onClick={() => syncChangesToDuplicates(activeTab)}
                              disabled={isSaving}
                              sx={{ borderRadius: 3, px: 3, fontWeight: 700 }}
                            >
                              Sync Duplicates
                            </Button>
                          </Tooltip>
                        )}
                        <Button 
                          variant="outlined" 
                          startIcon={<Copy size={18} />} 
                          onClick={duplicateCurrentTab}
                          sx={{ borderRadius: 3, px: 3, borderColor: '#00796b', color: '#00796b', fontWeight: 700 }}
                        >
                          Duplicate
                        </Button>
                        {tabs.length > 1 && (
                          <Button 
                            variant="contained" 
                            color="secondary" 
                            startIcon={<Sparkles size={18} />}
                            onClick={submitAllTabs} 
                            disabled={isSaving}
                            sx={{ borderRadius: 3, px: 3, background: 'linear-gradient(135deg, #00897b 0%, #00695c 100%)' }}
                          >
                            Submit All ({tabs.length})
                          </Button>
                        )}
                      </>
                    )}
                  </Stack>
                </Stack>
                
                <Box sx={{ minHeight: 450, mb: 6 }}>
                  {activeTab.activeStep === 0 && (
                    <Grid container spacing={4}>
                      <Grid size={6}>
                        <TextField
                          label="Profile Name / Job Title *"
                          placeholder="e.g. Senior Software Engineer"
                          fullWidth
                          required
                          value={activeTab.form.profile_name ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, title: e.target.value, form: { ...prev.form, profile_name: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Job Designation (formal title)"
                          fullWidth
                          value={activeTab.form.job_designation ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, job_designation: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Place of Posting *"
                          fullWidth
                          required
                          value={activeTab.form.place_of_posting ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, place_of_posting: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}>
                          <InputLabel>Work Location Mode *</InputLabel>
                          <Select
                            value={activeTab.form.work_mode ?? "offline"}
                            label="Work Location Mode *"
                            required
                            onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, work_mode: e.target.value as any } }))}
                          >
                            <MenuItem value="online">Remote</MenuItem>
                            <MenuItem value="offline">On-site</MenuItem>
                            <MenuItem value="hybrid">Hybrid</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={3}>
                        <TextField
                          label="Expected Hires *"
                          fullWidth
                          required
                          type="number"
                          value={activeTab.form.expected_hires ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, expected_hires: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={3}>
                        <TextField
                          label="Minimum Hires"
                          fullWidth
                          type="number"
                          value={activeTab.form.min_hires ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, min_hires: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Tentative Joining Month *"
                          fullWidth
                          required
                          value={activeTab.form.joining_month ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, joining_month: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          label="Job Description *"
                          fullWidth
                          multiline
                          rows={4}
                          required
                          placeholder="Rich text content here..."
                          value={activeTab.form.description ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, description: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          label="Required Skills (comma separated)"
                          fullWidth
                          placeholder="Python, React, AWS..."
                          value={activeTab.form.required_skills?.join(", ") ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, required_skills: e.target.value.split(",").map(s => s.trim()) } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          label="Additional Job Info (max 1000 chars)"
                          fullWidth
                          multiline
                          rows={3}
                          inputProps={{ maxLength: 1000 }}
                          value={activeTab.form.additional_info_1000 ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, additional_info_1000: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Bond Details (if any)"
                          fullWidth
                          value={activeTab.form.bond ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, bond: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Registration Link (if any)"
                          fullWidth
                          value={activeTab.form.registration_link ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, registration_link: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          label="Onboarding Procedure"
                          fullWidth
                          multiline
                          rows={2}
                          value={activeTab.form.onboarding_procedure ?? ""}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, onboarding_procedure: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                    </Grid>
                  )}

                  {activeTab.activeStep === 1 && (
                    <Box>
                      <Paper sx={{ p: 3, mb: 4, bgcolor: 'rgba(0, 121, 107, 0.05)', borderRadius: 4, border: '1px solid rgba(0, 121, 107, 0.1)' }}>
                        <Grid container spacing={3} alignItems="center">
                          <Grid size={12}><Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#004d40', mb: 1 }}>GLOBAL BRANCH ELIGIBILITY CRITERIA</Typography></Grid>
                          <Grid size={2}>
                            <TextField
                              label="Global Min. CGPA"
                              fullWidth
                              type="number"
                              value={activeTab.form.eligibility.global_min_cgpa ?? ""}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, global_min_cgpa: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={2}>
                            <FormControlLabel
                              control={
                                <Checkbox 
                                  checked={!!activeTab.form.eligibility.global_allow_backlogs}
                                  onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, global_allow_backlogs: e.target.checked } } }))}
                                />
                              }
                              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Allow Backlogs</Typography>}
                            />
                          </Grid>
                          <Grid size={2}>
                            <TextField
                              label="Global Max. Backlogs"
                              fullWidth
                              type="number"
                              disabled={!activeTab.form.eligibility.global_allow_backlogs}
                              value={activeTab.form.eligibility.global_max_backlogs ?? ""}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, global_max_backlogs: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={1.5}>
                            <Button 
                              variant="contained" 
                              fullWidth
                              onClick={() => {
                                const { global_min_cgpa, global_allow_backlogs, global_max_backlogs } = activeTab.form.eligibility;
                                const newRules = activeTab.form.eligibility.disciplines_json.map(r => 
                                  r.selected ? { 
                                    ...r, 
                                    min_cgpa: global_min_cgpa,
                                    allow_backlogs: global_allow_backlogs,
                                    max_backlogs: global_allow_backlogs ? global_max_backlogs : "0"
                                  } : r
                                );
                                updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, disciplines_json: newRules } } }));
                              }}
                              sx={{ bgcolor: '#00796b', height: '56px', fontWeight: 700 }}
                            >
                              Apply to All Selected
                            </Button>
                          </Grid>
                          <Grid size={1.5}>
                            <Button 
                              variant="outlined" 
                              fullWidth
                              onClick={() => {
                                const allSelected = activeTab.form.eligibility.disciplines_json.every(r => r.selected);
                                const newRules = activeTab.form.eligibility.disciplines_json.map(r => ({
                                  ...r,
                                  selected: !allSelected
                                }));
                                updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, disciplines_json: newRules } } }));
                              }}
                              sx={{ height: '56px', fontWeight: 700, borderColor: '#00796b', color: '#00796b' }}
                            >
                              {activeTab.form.eligibility.disciplines_json.every(r => r.selected) ? "Deselect All" : "Select All"}
                            </Button>
                          </Grid>
                          <Grid size={1.5}>
                            <TextField
                              label="High School %"
                              fullWidth
                              type="number"
                              value={activeTab.form.eligibility.high_school_percentage ?? ""}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, high_school_percentage: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={1.5}>
                            <FormControl fullWidth>
                              <InputLabel>Gender</InputLabel>
                              <Select
                                value={activeTab.form.eligibility.gender_filter ?? "All"}
                                label="Gender"
                                onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, gender_filter: e.target.value } } }))}
                              >
                                <MenuItem value="All">All</MenuItem>
                                <MenuItem value="Male">Male</MenuItem>
                                <MenuItem value="Female">Female</MenuItem>
                                <MenuItem value="Others">Others</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                      </Paper>

                      <Stack spacing={4}>
                        {courseOptions.map(course => (
                          <Box key={course}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                              <Typography variant="h6" sx={{ fontWeight: 800, color: '#004d40' }}>{course}</Typography>
                              <Stack direction="row" spacing={3} alignItems="center">
                                <Button 
                                  variant="outlined" 
                                  size="small"
                                  onClick={() => {
                                    const disciplinesInCourse = activeTab.form.eligibility.disciplines_json.filter(r => r.course === course);
                                    const firstSelected = disciplinesInCourse.find(r => r.selected);
                                    if (!firstSelected) return;

                                    const newRules = activeTab.form.eligibility.disciplines_json.map(r => 
                                      (r.course === course && r.selected) ? { 
                                        ...r, 
                                        min_cgpa: firstSelected.min_cgpa,
                                        allow_backlogs: firstSelected.allow_backlogs,
                                        max_backlogs: firstSelected.max_backlogs
                                      } : r
                                    );
                                    updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, disciplines_json: newRules } } }));
                                  }}
                                  sx={{ fontWeight: 700, borderColor: '#00796b', color: '#00796b', py: 0.5, borderRadius: 2 }}
                                >
                                  Apply to Selected
                                </Button>
                                <FormControlLabel
                                  control={
                                    <Checkbox 
                                      checked={activeTab.form.eligibility.disciplines_json.filter(r => r.course === course).every(r => r.allow_backlogs)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        const newRules = activeTab.form.eligibility.disciplines_json.map(r => 
                                          r.course === course ? { ...r, allow_backlogs: checked } : r
                                        );
                                        updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, disciplines_json: newRules } } }));
                                      }}
                                    />
                                  }
                                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Allow Backlogs</Typography>}
                                />
                                <FormControlLabel
                                  control={
                                    <Checkbox 
                                      checked={activeTab.form.eligibility.disciplines_json.filter(r => r.course === course).every(r => r.selected)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        const newRules = activeTab.form.eligibility.disciplines_json.map(r => 
                                          r.course === course ? { ...r, selected: checked } : r
                                        );
                                        updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, disciplines_json: newRules } } }));
                                      }}
                                    />
                                  }
                                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Select All</Typography>}
                                />
                              </Stack>
                            </Stack>
                            <Paper variant="outlined" sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
                              <Table size="small">
                                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                  <TableRow>
                                    <TableCell sx={{ width: 50 }}>Select</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 150 }}>Min. CGPA/CPI</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 100 }}>Allow Backlogs</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 150 }}>Max. Backlogs</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {activeTab.form.eligibility.disciplines_json.filter(r => r.course === course).map((rule, idx) => {
                                    const actualIdx = activeTab.form.eligibility.disciplines_json.findIndex(r => r === rule);
                                    return (
                                      <TableRow key={rule.discipline}>
                                        <TableCell>
                                          <Checkbox 
                                            checked={!!rule.selected}
                                            onChange={(e) => {
                                              const newRules = [...activeTab.form.eligibility.disciplines_json];
                                              newRules[actualIdx] = { ...rule, selected: e.target.checked };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, disciplines_json: newRules } } }));
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{rule.discipline}</TableCell>
                                        <TableCell>
                                          <TextField 
                                            size="small" 
                                            type="number"
                                            value={rule.min_cgpa ?? ""}
                                            onChange={(e) => {
                                              const newRules = [...activeTab.form.eligibility.disciplines_json];
                                              newRules[actualIdx] = { ...rule, min_cgpa: e.target.value };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, disciplines_json: newRules } } }));
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Checkbox 
                                            checked={!!rule.allow_backlogs}
                                            onChange={(e) => {
                                              const newRules = [...activeTab.form.eligibility.disciplines_json];
                                              newRules[actualIdx] = { ...rule, allow_backlogs: e.target.checked };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, disciplines_json: newRules } } }));
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {rule.allow_backlogs && (
                                            <TextField 
                                              size="small" 
                                              type="number"
                                              value={rule.max_backlogs ?? ""}
                                              onChange={(e) => {
                                                const newRules = [...activeTab.form.eligibility.disciplines_json];
                                                newRules[actualIdx] = { ...rule, max_backlogs: e.target.value };
                                                updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, disciplines_json: newRules } } }));
                                              }}
                                            />
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </Paper>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {activeTab.activeStep === 2 && (
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#004d40' }}>Salary Details ({activeTab.form.job_type})</Typography>
                        <FormControl sx={{ minWidth: 120 }}>
                          <InputLabel>Currency</InputLabel>
                          <Select
                            value={activeTab.form.salary.currency ?? "INR"}
                            label="Currency"
                            onChange={(e) => {
                              const currency = e.target.value;
                              updateActiveTab(prev => ({ 
                                ...prev, 
                                form: { 
                                  ...prev.form, 
                                  salary: { ...prev.form.salary, currency } 
                                } as any 
                              }));
                            }}
                          >
                            <MenuItem value="INR">INR</MenuItem>
                            <MenuItem value="USD">USD</MenuItem>
                            <MenuItem value="EUR">EUR</MenuItem>
                            <MenuItem value="GBP">GBP</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>

                      {activeTab.form.job_type === "JNF" ? (
                        <Box>
                          <Paper sx={{ p: 3, mb: 4, bgcolor: 'rgba(0, 121, 107, 0.05)', borderRadius: 4, border: '1px solid rgba(0, 121, 107, 0.1)' }}>
                            <Grid container spacing={3} alignItems="center">
                              <Grid size={12}><Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#004d40', mb: 1 }}>GLOBAL SALARY VALUES (APPLY TO SELECTED PROGRAMMES)</Typography></Grid>
                              <Grid size={2.5}><TextField label="CTC (Annual)" fullWidth size="small" id="global-ctc" /></Grid>
                              <Grid size={2.5}><TextField label="Base/Fixed" fullWidth size="small" id="global-base" /></Grid>
                              <Grid size={2.5}><TextField label="Take-home" fullWidth size="small" id="global-takehome" /></Grid>
                              <Grid size={2}>
                                <Button 
                                  variant="contained" 
                                  fullWidth
                                  onClick={() => {
                                    const ctc = (document.getElementById('global-ctc') as HTMLInputElement).value;
                                    const base = (document.getElementById('global-base') as HTMLInputElement).value;
                                    const takehome = (document.getElementById('global-takehome') as HTMLInputElement).value;
                                    
                                    const newSalaries = (activeTab.form as JnfForm).salary.salaries_json.map(sal => 
                                      sal.selected ? {
                                        ...sal,
                                        ctc_annual: ctc || sal.ctc_annual,
                                        base_fixed: base || sal.base_fixed,
                                        monthly_take_home: takehome || sal.monthly_take_home
                                      } : sal
                                    );
                                    updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, salaries_json: newSalaries } } } as any));
                                  }}
                                  sx={{ bgcolor: '#00796b', height: '40px', fontWeight: 700 }}
                                >
                                  Apply
                                </Button>
                              </Grid>
                              <Grid size={2.5}>
                                <Button 
                                  variant="outlined" 
                                  fullWidth
                                  onClick={() => {
                                    const visibleProgrammes = activeTab.form.eligibility.disciplines_json
                                      .filter(r => r.selected)
                                      .map(r => r.course);
                                    const uniqueVisible = Array.from(new Set(visibleProgrammes));
                                    
                                    const newSalaries = (activeTab.form as JnfForm).salary.salaries_json.map(s => 
                                      uniqueVisible.includes(s.programme) ? { ...s, selected: true } : s
                                    );
                                    updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, salaries_json: newSalaries } } } as any));
                                  }}
                                  sx={{ height: '40px', fontWeight: 700, borderColor: '#00796b', color: '#00796b' }}
                                >
                                  Select All Visible
                                </Button>
                              </Grid>
                            </Grid>
                          </Paper>

                          <Paper variant="outlined" sx={{ p: 0, borderRadius: 3, overflow: 'hidden', mb: 4 }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                <TableRow>
                                  <TableCell sx={{ width: 50 }}>
                                    <Checkbox 
                                      checked={
                                        (activeTab.form as JnfForm).salary.salaries_json
                                          .filter(s => activeTab.form.eligibility.disciplines_json.some(r => r.course === s.programme && r.selected))
                                          .every(s => s.selected)
                                      }
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        const visibleProgrammes = activeTab.form.eligibility.disciplines_json
                                          .filter(r => r.selected)
                                          .map(r => r.course);
                                        const uniqueVisible = Array.from(new Set(visibleProgrammes));
                                        
                                        const newSalaries = (activeTab.form as JnfForm).salary.salaries_json.map(s => 
                                          uniqueVisible.includes(s.programme) ? { ...s, selected: checked } : s
                                        );
                                        updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, salaries_json: newSalaries } } } as any));
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Programme</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>CTC (Annual)</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Base/Fixed</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Monthly Take-home</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {["UG", "PG", "PhD", "Other"].map(cat => {
                                  const relevantSalaries = (activeTab.form as JnfForm).salary.salaries_json.filter(s => {
                                    const categoryMatch = getCourseCategory(s.programme) === cat;
                                    const isCourseSelected = activeTab.form.eligibility.disciplines_json.some(r => r.course === s.programme && r.selected);
                                    return categoryMatch && isCourseSelected;
                                  });
                                  if (relevantSalaries.length === 0) return null;
                                  return (
                                    <Fragment key={cat}>
                                      <TableRow sx={{ bgcolor: 'rgba(0,121,107,0.03)' }}>
                                        <TableCell colSpan={5} sx={{ fontWeight: 900, color: '#00796b', py: 1.5, letterSpacing: 1 }}>{cat} PROGRAMMES</TableCell>
                                      </TableRow>
                                      {relevantSalaries.map((sal) => {
                                        const originalIdx = (activeTab.form as JnfForm).salary.salaries_json.findIndex(s => s.programme === sal.programme);
                                        return (
                                          <TableRow key={sal.programme} sx={{ opacity: sal.selected ? 1 : 0.6 }}>
                                            <TableCell>
                                              <Checkbox 
                                                checked={!!sal.selected}
                                                onChange={(e) => {
                                                  const newSalaries = [...(activeTab.form as JnfForm).salary.salaries_json];
                                                  newSalaries[originalIdx] = { ...sal, selected: e.target.checked };
                                                  updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, salaries_json: newSalaries } } } as any));
                                                }}
                                              />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{sal.programme}</TableCell>
                                            <TableCell><TextField size="small" type="number" disabled={!sal.selected} value={sal.ctc_annual ?? ""} onChange={(e) => {
                                              const newSalaries = [...(activeTab.form as JnfForm).salary.salaries_json];
                                              newSalaries[originalIdx] = { ...sal, ctc_annual: e.target.value };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, salaries_json: newSalaries } } } as any));
                                            }} /></TableCell>
                                            <TableCell><TextField size="small" type="number" disabled={!sal.selected} value={sal.base_fixed ?? ""} onChange={(e) => {
                                              const newSalaries = [...(activeTab.form as JnfForm).salary.salaries_json];
                                              newSalaries[originalIdx] = { ...sal, base_fixed: e.target.value };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, salaries_json: newSalaries } } } as any));
                                            }} /></TableCell>
                                            <TableCell><TextField size="small" type="number" disabled={!sal.selected} value={sal.monthly_take_home ?? ""} onChange={(e) => {
                                              const newSalaries = [...(activeTab.form as JnfForm).salary.salaries_json];
                                              newSalaries[originalIdx] = { ...sal, monthly_take_home: e.target.value };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, salaries_json: newSalaries } } } as any));
                                            }} /></TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </Fragment>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </Paper>

                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#004d40', mb: 2 }}>ADDITIONAL SALARY COMPONENTS</Typography>
                          <FormControlLabel
                            control={
                              <Checkbox 
                                checked={!!(activeTab.form as JnfForm).salary.different_structure_per_programme}
                                onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, different_structure_per_programme: e.target.checked } } } as any))}
                              />
                            }
                            label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Different structure per programme</Typography>}
                            sx={{ mb: 2 }}
                          />

                          <Stack spacing={3}>
                            {((activeTab.form as JnfForm).salary.different_structure_per_programme ? courseOptions : ["global"]).map(key => (
                              <Paper key={key} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#00796b', mb: 2, textTransform: 'uppercase' }}>
                                  {key === "global" ? "Common Additional Components" : `${key} Components`}
                                </Typography>
                                <Grid container spacing={3}>
                                  {["joining_bonus", "retention_bonus", "bond_deductions", "esops_vest_period", "relocation_allowance"].map(field => (
                                    <Grid key={field} size={4}>
                                      <TextField
                                        label={field.replace(/_/g, ' ').toUpperCase()}
                                        fullWidth
                                        size="small"
                                        value={(activeTab.form as JnfForm).salary.additional_components?.[key]?.[field as keyof AdditionalSalary] ?? ""}
                                        onChange={(e) => {
                                          const newComponents = { ...((activeTab.form as JnfForm).salary.additional_components || {}) };
                                          if (!newComponents[key]) newComponents[key] = initialAdditionalSalary();
                                          newComponents[key] = { ...newComponents[key], [field]: e.target.value };
                                          updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, additional_components: newComponents } } } as any));
                                        }}
                                      />
                                    </Grid>
                                  ))}
                                </Grid>
                              </Paper>
                            ))}
                          </Stack>
                        </Box>
                      ) : (
                        <Grid container spacing={4}>
                          <Grid size={6}>
                            <TextField
                              label="Monthly Stipend"
                              fullWidth
                              value={(activeTab.form as InfForm).salary.stipend ?? ""}
                              onChange={(e) => {
                                const stipend = e.target.value;
                                updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, stipend } } } as any));
                              }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                            />
                          </Grid>
                          <Grid size={6}>
                            <TextField
                              label="Internship Duration"
                              fullWidth
                              value={(activeTab.form as InfForm).salary.internship_duration ?? ""}
                              onChange={(e) => {
                                const internship_duration = e.target.value;
                                updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, internship_duration } } } as any));
                              }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                            />
                          </Grid>
                        </Grid>
                      )}
                    </Box>
                  )}

                  {activeTab.activeStep === 3 && (
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#004d40' }}>Selection Process</Typography>
                        <Button 
                          variant="outlined"
                          startIcon={<Plus />} 
                          onClick={() => {
                            const newStage = {
                              stage_id: (activeTab.form.stages.length + 1).toString(),
                              sequence: (activeTab.form.stages.length + 1).toString(),
                              duration: "",
                              selection_mode: "Offline",
                              test_type: "Aptitude",
                              interview_mode: "On-campus",
                              infrastructure_requirements: ""
                            };
                            updateActiveTab(prev => ({
                              ...prev,
                              form: {
                                ...prev.form,
                                stages: [...prev.form.stages, newStage]
                              }
                            }));
                          }}
                          sx={{ borderRadius: 3, borderColor: '#00796b', color: '#00796b', fontWeight: 700 }}
                        >
                          Add Stage
                        </Button>
                      </Stack>

                      <Stack spacing={3}>
                        {activeTab.form.stages.map((stage, idx) => (
                          <Paper key={idx} elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#00796b' }}>Stage {idx + 1}: {stage.test_type}</Typography>
                              <IconButton color="error" onClick={() => {
                                const newStages = activeTab.form.stages.filter((_, i) => i !== idx);
                                updateActiveTab(prev => ({ ...prev, form: { ...prev.form, stages: newStages } }));
                              }}>
                                <Trash2 size={20} />
                              </IconButton>
                            </Stack>
                            <Grid container spacing={3}>
                              <Grid size={4}>
                                <FormControl fullWidth>
                                  <InputLabel>Selection Mode</InputLabel>
                                  <Select
                                    value={stage.selection_mode ?? "Offline"}
                                    label="Selection Mode"
                                    onChange={(e) => {
                                      const newStages = [...activeTab.form.stages];
                                      newStages[idx] = { ...stage, selection_mode: e.target.value };
                                      updateActiveTab(prev => ({ ...prev, form: { ...prev.form, stages: newStages } }));
                                    }}
                                  >
                                    <MenuItem value="Online">Online</MenuItem>
                                    <MenuItem value="Offline">Offline</MenuItem>
                                    <MenuItem value="Hybrid">Hybrid</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid size={4}>
                                <FormControl fullWidth>
                                  <InputLabel>Test Type</InputLabel>
                                  <Select
                                    value={stage.test_type ?? "Aptitude"}
                                    label="Test Type"
                                    onChange={(e) => {
                                      const newStages = [...activeTab.form.stages];
                                      newStages[idx] = { ...stage, test_type: e.target.value };
                                      updateActiveTab(prev => ({ ...prev, form: { ...prev.form, stages: newStages } }));
                                    }}
                                  >
                                    <MenuItem value="PPT">Pre-Placement Talk</MenuItem>
                                    <MenuItem value="Shortlisting">Resume Shortlisting</MenuItem>
                                    <MenuItem value="Aptitude">Aptitude Test</MenuItem>
                                    <MenuItem value="Technical">Technical Test</MenuItem>
                                    <MenuItem value="Coding">Coding Test</MenuItem>
                                    <MenuItem value="Psychometric">Psychometric Test</MenuItem>
                                    <MenuItem value="Written">Written Test</MenuItem>
                                    <MenuItem value="GD">Group Discussion</MenuItem>
                                    <MenuItem value="Interview">Personal/Technical Interview</MenuItem>
                                    <MenuItem value="Medical">Medical Test</MenuItem>
                                    <MenuItem value="Other">Any Other Round</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid size={4}>
                                <TextField
                                  label="Duration (mins)"
                                  fullWidth
                                  type="number"
                                  value={stage.duration ?? ""}
                                  onChange={(e) => {
                                    const newStages = [...activeTab.form.stages];
                                    newStages[idx] = { ...stage, duration: e.target.value };
                                    updateActiveTab(prev => ({ ...prev, form: { ...prev.form, stages: newStages } }));
                                  }}
                                />
                              </Grid>
                              <Grid size={12}>
                                <TextField
                                  label="Infrastructure / Special Requirements"
                                  fullWidth
                                  multiline
                                  rows={2}
                                  value={stage.infrastructure_requirements ?? ""}
                                  onChange={(e) => {
                                    const newStages = [...activeTab.form.stages];
                                    newStages[idx] = { ...stage, infrastructure_requirements: e.target.value };
                                    updateActiveTab(prev => ({ ...prev, form: { ...prev.form, stages: newStages } }));
                                  }}
                                />
                              </Grid>
                            </Grid>
                          </Paper>
                        ))}
                      </Stack>

                      <Paper sx={{ p: 3, mt: 4, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 4 }}>
                        <Grid container spacing={3}>
                          <Grid size={4}>
                            <FormControlLabel
                              control={<Checkbox checked={!!activeTab.form.has_psychometric_test} onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, has_psychometric_test: e.target.checked } }))} />}
                              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Psychometric Test</Typography>}
                            />
                          </Grid>
                          <Grid size={4}>
                            <FormControlLabel
                              control={<Checkbox checked={!!activeTab.form.has_medical_test} onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, has_medical_test: e.target.checked } }))} />}
                              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Medical Test</Typography>}
                            />
                          </Grid>
                          <Grid size={12}>
                            <TextField
                              label="Other Screening Details"
                              fullWidth
                              multiline
                              rows={2}
                              value={activeTab.form.other_screening_details ?? ""}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, other_screening_details: e.target.value } }))}
                            />
                          </Grid>
                        </Grid>
                      </Paper>
                    </Box>
                  )}

                  {activeTab.activeStep === 4 && (
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#004d40', mb: 4 }}>Declaration & Submit</Typography>
                      
                      <Stack spacing={2} sx={{ bgcolor: 'rgba(0,0,0,0.02)', p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.05)', mb: 4 }}>
                        {Object.entries(activeTab.form.declaration?.aipc_guidelines || {}).map(([key, val]) => (
                          <FormControlLabel
                            key={key}
                            control={
                              <Checkbox 
                                checked={!!val} 
                                color="primary"
                                onChange={(e) => {
                                  const newGuidelines = { ...(activeTab.form.declaration?.aipc_guidelines || {}), [key]: e.target.checked };
                                  updateActiveTab(prev => ({
                                    ...prev,
                                    form: {
                                      ...prev.form,
                                      declaration: { ...(prev.form.declaration || {}), aipc_guidelines: newGuidelines }
                                    }
                                  }));
                                }}
                              />
                            }
                            label={<Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>{key.replace(/_/g, ' ').toUpperCase()}</Typography>}
                          />
                        ))}
                        <Divider sx={{ my: 2 }} />
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={!!activeTab.form.declaration?.rti_nirf_consent} 
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, declaration: { ...(prev.form.declaration || {}), rti_nirf_consent: e.target.checked } } }))}
                            />
                          }
                          label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Consent to share data with RTI/ranking agencies</Typography>}
                        />
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={!!activeTab.form.declaration?.agreed} 
                              color="primary"
                              onChange={(e) => updateActiveTab(prev => ({
                                ...prev,
                                form: {
                                  ...prev.form,
                                  declaration: { ...(prev.form.declaration || {}), agreed: e.target.checked }
                                }
                              }))}
                            />
                          }
                          label={<Typography variant="body1" sx={{ fontWeight: 700, color: '#004d40' }}>I agree to the above guidelines and confirm the information provided is accurate.</Typography>}
                        />
                      </Stack>

                      <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'rgba(0, 121, 107, 0.05)' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#004d40', mb: 3 }}>SELF-DECLARATION</Typography>
                        <Grid container spacing={3}>
                          <Grid size={6}>
                            <TextField
                              label="Authorised Signatory Name *"
                              required
                              fullWidth
                              value={activeTab.form.declaration?.authorised_signatory_name ?? ""}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, declaration: { ...(prev.form.declaration || {}), authorised_signatory_name: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={6}>
                            <TextField
                              label="Designation *"
                              required
                              fullWidth
                              value={activeTab.form.declaration?.authorised_signatory_designation ?? ""}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, declaration: { ...(prev.form.declaration || {}), authorised_signatory_designation: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={6}>
                            <TextField
                              label="Date *"
                              required
                              fullWidth
                              type="date"
                              value={activeTab.form.declaration?.authorised_signatory_date ?? ""}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, declaration: { ...(prev.form.declaration || {}), authorised_signatory_date: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={6}>
                            <TextField
                              label="Typed Signature (Name) *"
                              required
                              fullWidth
                              placeholder="Type your full name as signature"
                              value={activeTab.form.declaration?.typed_signature ?? ""}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, declaration: { ...(prev.form.declaration || {}), typed_signature: e.target.value } } }))}
                            />
                          </Grid>
                        </Grid>
                      </Paper>
                    </Box>
                  )}
                </Box>

                <Divider sx={{ mb: 4, opacity: 0.1 }} />

                <Stack direction="row" justifyContent="space-between">
                  <Button 
                    variant="text"
                    disabled={activeTab.activeStep === 0} 
                    onClick={() => updateActiveTab({ activeStep: activeTab.activeStep - 1 })}
                    sx={{ color: '#00796b', fontWeight: 700 }}
                  >
                    Previous Step
                  </Button>
                  <Stack direction="row" spacing={2}>
                    <Button 
                      variant="outlined" 
                      onClick={() => saveJobProgress(activeTab, "pending")}
                      sx={{ borderRadius: 3, px: 4, borderColor: '#00796b', color: '#00796b', fontWeight: 700 }}
                    >
                      Save Progress
                    </Button>
                    {activeTab.activeStep === steps.length - 1 ? (
                      <Button 
                        variant="contained" 
                        onClick={() => saveJobProgress(activeTab, "submitted")}
                        sx={{ borderRadius: 3, px: 5, background: 'linear-gradient(135deg, #00796b 0%, #004d40 100%)', fontWeight: 800 }}
                      >
                        Submit Profile
                      </Button>
                    ) : (
                      <Button 
                        variant="contained" 
                        onClick={() => updateActiveTab({ activeStep: activeTab.activeStep + 1 })}
                        sx={{ borderRadius: 3, px: 5, background: 'linear-gradient(135deg, #00796b 0%, #004d40 100%)', fontWeight: 800 }}
                      >
                        Next Step
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            </Box>
          )
        )}
      </Box>

      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      {success && <Typography color="success.main" sx={{ mt: 2 }}>{success}</Typography>}
    </AppShell>
  );
}
