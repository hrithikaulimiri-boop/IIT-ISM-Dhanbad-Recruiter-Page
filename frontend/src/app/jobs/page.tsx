"use client";

import AppShell from "@/components/layout/AppShell";
import { Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Paper, Stack, Step, StepLabel, Stepper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, InputAdornment, Grid2 as Grid, FormControl, InputLabel, Select, OutlinedInput, IconButton, StepConnector, stepConnectorClasses, styled, Accordion, AccordionSummary, AccordionDetails, Divider, Tooltip, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, FormGroup } from "@mui/material";
import { Suspense, useEffect, useMemo, useState, Fragment } from "react";
import { useSession } from "next-auth/react";
import { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { authHeaders } from "@/lib/authHeaders";
import { infAipcGuidelineItems, jnfAipcGuidelineItems, courseOptions, courseToDisciplines, stageDurationOptions } from "@/lib/constants";
import { Briefcase, MapPin, Globe, Calendar, Link as LinkIcon, FileText, IndianRupee, Award, ShieldCheck, ListOrdered, Clock, TrendingUp, Upload, Trash2, FileCheck, Sparkles, ChevronDown, Plus, Copy, X, XCircle, RefreshCw, BrainCircuit, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parseDocument, ExtractedData } from "@/lib/documentParser";

const buildAipcDefaults = (items: { key: string }[]) =>
  Object.fromEntries(items.map((g) => [g.key, false])) as Record<string, boolean>;

const steps = ["Company + Job", "Eligibility", "Salary", "Hiring Stages", "Declaration"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type JobRow = { 
  job_id: number; 
  profile_name: string; 
  job_type: "INF" | "JNF"; 
  cycle_id: number; 
  status: string; 
  last_completed_step: number; 
  salary?: { salary_id: number } | null;
  updated_at?: string;
};

type CycleRow = { cycle_id: number; name: string; is_active?: boolean };
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

interface StipendStructure {
  programme: string;
  base_stipend: string;
  hra: string;
  variable_pay: string;
  other: string;
  total: string;
  selected: boolean;
}

interface AdditionalSalary {
  joining_bonus: string;
  retention_bonus: string;
  variable_performance_bonus: string;
  esops_vest_period: string;
  relocation_allowance: string;
  medical_allowance: string;
  deductions: string;
  bond_amount_duration: string;
  first_year_ctc: string;
  stocks_options: string;
  ctc_breakup: string;
  gross_salary: string;
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
  ppo_provision: string;
  job_categories: string[];
  status: string;
  last_completed_step: number;
  parent_job_id?: number;
  has_psychometric_test: boolean;
  has_medical_test: boolean;
  other_screening_details: string;
  jd_pdf_url?: string; // New field for JD PDF upload
  company?: {
    name: string;
    website: string;
    postal_address: string;
    employee_count: string;
    annual_turnover: string;
    established_year: number;
    sector: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    social_media?: string;
    contacts?: Array<{
      name: string;
      designation: string;
      email: string;
      phone: string;
    }>;
  };
  eligibility: {
    global_min_cgpa: string;
    global_allow_backlogs: boolean;
    global_max_backlogs: string;
    high_school_percentage: string;
    gender_filter: string;
    other_requirements: string;
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
    stipend_json: StipendStructure[];
    other_perks: string;
    internship_duration: string;
    different_structure_per_programme: boolean;
  };
}

type TabData = {
  id: string;
  title: string;
  form: JnfForm | InfForm;
  activeStep: number;
  isDirty: boolean;
  initialFingerprint?: string; // Used to check for changes in rejected applications
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
  variable_performance_bonus: "",
  esops_vest_period: "",
  relocation_allowance: "",
  medical_allowance: "",
  deductions: "",
  bond_amount_duration: "",
  first_year_ctc: "",
  stocks_options: "",
  ctc_breakup: "",
  gross_salary: "",
});

const defaultHiringStagesData = [
  { name: "Pre-Placement Talk", type: "PPT" },
  { name: "Resume Shortlisting", type: "Shortlisting" },
  { name: "Online/Written Test", type: "Coding" },
  { name: "Group Discussion", type: "GD" },
  { name: "Any Other Round", type: "Other" },
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

const getInitialJnf = (aipc: Record<string, boolean>, cycleId: number = 1): JnfForm => ({
  job_id: undefined,
  company_id: 0,
  cycle_id: cycleId,
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
  ppo_provision: "",
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
    other_requirements: "",
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

const getInitialInf = (aipc: Record<string, boolean>, cycleId: number = 1): InfForm => ({
  job_id: undefined,
  company_id: 0,
  cycle_id: cycleId,
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
  ppo_provision: "",
  job_categories: ["Technical"],
  status: "draft",
  last_completed_step: 0,
  has_psychometric_test: false,
  has_medical_test: false,
  other_screening_details: "",
  salary: { 
    currency: "INR",
    stipend_json: courseOptions.map(programme => ({
      programme,
      base_stipend: "",
      hra: "",
      variable_pay: "",
      other: "",
      total: "",
      selected: false
    })),
    other_perks: "",
    internship_duration: "",
    different_structure_per_programme: false,
  },
  eligibility: {
    global_min_cgpa: "0.0",
    global_allow_backlogs: false,
    global_max_backlogs: "0",
    high_school_percentage: "0",
    gender_filter: "All",
    other_requirements: "",
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
  const resumeId = searchParams.get("resumeId");
  const viewModeParam = searchParams.get("viewMode") === "true";
  const editModeParam = searchParams.get("editMode") === "true";
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

  // Dialog States
  const [confirmDuplicateOpen, setConfirmDuplicateOpen] = useState(false);
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [syncTargets, setSyncTargets] = useState<{ id: number, name: string }[]>([]);
  const [selectedSyncIds, setSelectedSyncIds] = useState<number[]>([]);
  const [isAdminEditEnabled, setIsAdminEditEnabled] = useState(false);

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

  const isReadOnly = (fieldName?: string) => {
    // Company registration details are ALWAYS read-only in this view
    if (fieldName?.startsWith('company.')) return true;
    
    // Once approved, NO ONE can edit
    if (activeTab?.form.status && ['approved', 'selected'].includes(activeTab.form.status)) {
      return true;
    }

    // Rejected profiles can be edited for "Reapply"
    if (activeTab?.form.status === 'rejected') {
      return false;
    }

    // If explicit view mode is requested, everything is read-only
    if (viewModeParam && !isAdminEditEnabled) return true;

    // For admin, everything is read-only unless edit mode is toggled on
    if (isAdmin) return !isAdminEditEnabled;
    
    // For recruiters, submitted profiles are read-only
    if (activeTab?.form.status === 'submitted') {
      // Except if we explicitly entered in editMode (though backend will still enforce rules)
      if (editModeParam) return false;
      return true;
    }
    
    return false;
  };

  useEffect(() => {
    if (editModeParam) {
      setIsAdminEditEnabled(true);
    }
  }, [editModeParam]);

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
          ...((form as InfForm).salary || {}),
          stipend_json: (form as any).salary?.salaries_json || (form as InfForm).salary?.stipend_json
            ? (base as InfForm).salary.stipend_json.map(baseStipend => {
                const savedStipend = ((form as any).salary?.salaries_json || (form as InfForm).salary?.stipend_json || []).find((s: any) => s.programme === baseStipend.programme);
                return savedStipend ? { ...baseStipend, ...savedStipend } : baseStipend;
              })
            : (base as InfForm).salary.stipend_json
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
      isDirty: false,
      initialFingerprint: mergedForm.status === 'rejected' ? getFormFingerprint(mergedForm) : undefined
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
    
    const indexToRemove = tabs.findIndex(t => t.id === id);
    if (indexToRemove === -1) return;

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);

    if (activeTabId === id) {
      const nextTabId = newTabs.length > 0 
        ? newTabs[Math.min(indexToRemove, newTabs.length - 1)].id 
        : null;
      setActiveTabId(nextTabId);
    }
  };

  const duplicateCurrentTab = () => {
    if (!activeTab) return;
    setConfirmDuplicateOpen(true);
  };

  const performDuplicate = () => {
    if (!activeTab) return;
    const clonedForm = JSON.parse(JSON.stringify(activeTab.form));
    
    // Set parent_job_id to the original job's ID (or its own parent if it's already a child)
    clonedForm.parent_job_id = activeTab.form.parent_job_id || activeTab.form.job_id;
    clonedForm.job_id = undefined; // Cloned form should be new
    
    // Naming logic
    const baseName = clonedForm.profile_name || "Profile";
    const existingMatches = tabs.filter(t => t.form.profile_name.startsWith(baseName)).length;
    clonedForm.profile_name = `${baseName} Profile ${existingMatches + 1}`;
    clonedForm.status = "draft";
    clonedForm.last_completed_step = 0;

    createNewTab(clonedForm, clonedForm.profile_name);
    setSuccess("Duplicated successfully");
    setConfirmDuplicateOpen(false);
  };

  useEffect(() => {
    if (status === "authenticated" && tabs.length === 0 && view === "form") {
      if (isAdmin || viewModeParam || editModeParam) {
        router.push("/applications");
      } else {
        setView("list");
      }
    }
  }, [tabs.length, view, isAdmin, viewModeParam, editModeParam, router, status]);

  const fetchData = async () => {
    if (status !== "authenticated") return;
    
    try {
      setIsSaving(true);
      setError("");
      
      const [jobsRes, cyclesRes, stagesRes] = await Promise.all([
        api.get("/jobs"),
        api.get("/cycles"),
        api.get("/hiring-stages")
      ]);
      
      const allJobs = (jobsRes.data?.data || []) as JobRow[];
      setJobs(typeFilter ? allJobs.filter((job) => job.job_type === typeFilter) : allJobs);
      setCycles(cyclesRes.data?.data || []);
      setHiringStages(stagesRes.data?.data || []);
      
      if (resumeId) {
        // Check if already open
        const alreadyOpen = tabs.find(t => t.form.job_id === Number(resumeId));
        if (!alreadyOpen) {
          const resumeRes = await api.get(`/jobs/${resumeId}`);
          const fullJob = resumeRes.data;
          createNewTab(fullJob, fullJob.profile_name);
        } else {
          setActiveTabId(alreadyOpen.id);
          setView("form");
        }
      }
    } catch (err) {
      console.error("Data fetch failed:", err);
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 401) {
        setError("Your session has expired or is invalid. Please log out and log in again.");
      } else {
        setError("Failed to load recruitment data. Please try refreshing the page.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      if (isAdmin && !resumeId) {
        router.push("/applications");
        return;
      }
      fetchData();
    }
  }, [status, session, typeFilter, resumeId, isAdmin]);

  const saveJobProgress = async (tab: TabData, statusArg: string = "pending") => {
    if (!session) return;
    setIsSaving(true);
    try {
      const { form, activeStep } = tab;
      const user = session?.user as any;
      
      // Sanitize payload: convert empty strings to null for numeric fields
      const sanitizedForm = JSON.parse(JSON.stringify(form));
      
      if (sanitizedForm.salary) {
        if (sanitizedForm.salary.ctc_lpa === "") sanitizedForm.salary.ctc_lpa = null;
        if (sanitizedForm.salary.fixed_component === "") sanitizedForm.salary.fixed_component = null;
        if (sanitizedForm.salary.variable_component === "") sanitizedForm.salary.variable_component = null;
        if (sanitizedForm.salary.stipend === "") sanitizedForm.salary.stipend = null;
        if (sanitizedForm.salary.joining_bonus === "") sanitizedForm.salary.joining_bonus = null;
        
        if (sanitizedForm.salary.salaries_json) {
          sanitizedForm.salary.salaries_json = sanitizedForm.salary.salaries_json.map((s: any) => ({
            ...s,
            ctc_annual: s.ctc_annual === "" ? null : s.ctc_annual,
            base_fixed: s.base_fixed === "" ? null : s.base_fixed,
            monthly_take_home: s.monthly_take_home === "" ? null : s.monthly_take_home,
          }));
        }

        // INF specific mapping: stipend_json -> salaries_json
        if (sanitizedForm.job_type === "INF" && sanitizedForm.salary.stipend_json) {
          sanitizedForm.salary.salaries_json = sanitizedForm.salary.stipend_json.map((s: any) => ({
            ...s,
            base_stipend: s.base_stipend === "" ? null : s.base_stipend,
            hra: s.hra === "" ? null : s.hra,
            variable_pay: s.variable_pay === "" ? null : s.variable_pay,
            other: s.other === "" ? null : s.other,
            total: s.total === "" ? null : s.total,
          }));
          
          // Populate root stipend field for backend validation (take first selected or first available)
          const selectedStipend = sanitizedForm.salary.stipend_json.find((s: any) => s.selected);
          const firstStipend = sanitizedForm.salary.stipend_json[0];
          
          if (selectedStipend) {
            sanitizedForm.salary.stipend = Number(selectedStipend.base_stipend) || 0;
          } else if (firstStipend) {
            sanitizedForm.salary.stipend = Number(firstStipend.base_stipend) || 0;
          } else {
            sanitizedForm.salary.stipend = 0;
          }
          
          delete sanitizedForm.salary.stipend_json;
        }
      }
      
      if (sanitizedForm.eligibility) {
        if (sanitizedForm.eligibility.global_min_cgpa === "") sanitizedForm.eligibility.global_min_cgpa = null;
        if (sanitizedForm.eligibility.global_max_backlogs === "") sanitizedForm.eligibility.global_max_backlogs = null;
        if (sanitizedForm.eligibility.high_school_percentage === "") sanitizedForm.eligibility.high_school_percentage = null;
      }

      const payload: any = {
        ...sanitizedForm,
        status: statusArg,
        last_completed_step: activeStep,
        company_id: Number(user?.companyId || user?.company_id || form.company_id),
      };
      
      // Filter out invalid stages
      if (payload.stages) {
        payload.stages = payload.stages
          .filter((s: any) => s.stage_id && s.stage_id !== "0" && s.stage_id !== "")
          .map((stage: any) => ({
            ...stage,
            stage_id: Number(stage.stage_id),
            sequence: Number(stage.sequence),
          }));
      }

      // Ensure company_id is valid
      if (!payload.company_id || payload.company_id === 0) {
        payload.company_id = Number(user?.companyId || user?.company_id);
      }

      const res = await api.post("/jobs", payload);
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
        const validationErrors = (axiosErr.response.data as any).errors;
        if (validationErrors) {
          const errorMessages = Object.entries(validationErrors)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(", ")}`)
            .join(" | ");
          setError(`Validation Failed: ${errorMessages}`);
        } else {
          setError(`Validation Error: ${axiosErr.response.statusText}`);
        }
      } else {
        setError("An unexpected error occurred while saving.");
      }
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const submitAllTabs = () => {
    console.log("submitAllTabs called, setting confirmSubmitOpen to true");
    setConfirmSubmitOpen(true);
  };

  const getFormFingerprint = (form: JnfForm | InfForm) => {
    // Clone and remove fields that don't represent the "content" of the profile
    const content = JSON.parse(JSON.stringify(form));
    delete content.job_id;
    delete content.status;
    delete content.last_completed_step;
    delete content.company_id;
    delete content.cycle_id;
    delete content.parent_job_id;
    delete content.profile_name; // Name might be different but content identical
    return JSON.stringify(content);
  };

  const performSubmit = async () => {
    setError("");
    setConfirmSubmitOpen(false);

    try {
      // 1. Pre-submission check: Ensure all open tabs are complete
      for (const tab of tabs) {
        const { form } = tab;
        const missingFields: string[] = [];
        
        if (!form.profile_name) missingFields.push("Profile Name");
        if (!form.job_designation) missingFields.push("Job Designation");
        if (!form.description) missingFields.push("Job Description");
        if (form.work_mode === "offline" && !form.offline_job_location) missingFields.push("Offline Job Location");
        if (form.job_categories.length === 0) missingFields.push("Job Category");
        
        // Salary check
        if (form.job_type === "JNF") {
          const jnf = form as JnfForm;
          if (!jnf.salary.currency) missingFields.push("Currency");
        } else {
          const inf = form as InfForm;
          if (!inf.salary.stipend_json.some(s => s.selected)) missingFields.push("At least one Stipend value");
          if (!inf.salary.internship_duration) missingFields.push("Internship Duration");
        }

        // Eligibility check
        const selectedDisciplines = form.eligibility.disciplines_json.filter(d => d.selected);
        if (selectedDisciplines.length === 0) {
          missingFields.push("At least one eligible discipline");
        } else {
          // Ensure all selected disciplines have CGPA filled
          const emptyCgpaDisciplines = selectedDisciplines.filter(d => !d.min_cgpa || d.min_cgpa === "");
          if (emptyCgpaDisciplines.length > 0) {
            missingFields.push(`CGPA/CPI missing for: ${emptyCgpaDisciplines.map(d => d.discipline).join(", ")}`);
          }
        }

        // Declaration check
        if (!form.declaration.agreed) missingFields.push("AIPC Guidelines Agreement");
        
        const aipcItems = form.job_type === "JNF" ? jnfAipcGuidelineItems : infAipcGuidelineItems;
        const uncheckedAipc = aipcItems.filter(item => !form.declaration.aipc_guidelines[item.key]);
        if (uncheckedAipc.length > 0) {
          missingFields.push(`AIPC Guidelines (${uncheckedAipc.length} pending)`);
        }

        if (!form.declaration.authorised_signatory_name) missingFields.push("Signatory Name");
        if (!form.declaration.authorised_signatory_designation) missingFields.push("Signatory Designation");

        // Hiring Stages check
        const validStages = form.stages.filter((s: any) => s.stage_id && s.stage_id !== "0" && s.stage_id !== "");
        if (validStages.length === 0) {
          missingFields.push("At least one valid hiring stage");
        }

        if (missingFields.length > 0) {
          setError(`Error: "${tab.title}" is incomplete. Missing: ${missingFields.join(", ")}. Please complete all fields before submitting.`);
          return;
        }
      }

      setIsSaving(true);
      // 2. Check for duplicates and re-submission of rejected profiles
      const fingerprints = new Map<string, string>(); // fingerprint -> tab title
      
      for (const tab of tabs) {
        const fp = getFormFingerprint(tab.form);
        
        // Re-submission check for rejected profiles
        if (tab.form.status === 'rejected' && tab.initialFingerprint && fp === tab.initialFingerprint) {
          setError(`Error: No changes detected in "${tab.title}". You must make changes before reapplying for a rejected profile.`);
          setIsSaving(false);
          return;
        }

        if (fingerprints.has(fp)) {
          setError(`Error: "${tab.title}" has identical information to "${fingerprints.get(fp)}". No changes were made to this duplicate, so it cannot be accepted.`);
          setIsSaving(false);
          return;
        }
        fingerprints.set(fp, tab.title);
        
        // If this is a child, check against parent data from DB if parent isn't in tabs
        if (tab.form.parent_job_id) {
          const parentInTabs = tabs.find(t => t.form.job_id === tab.form.parent_job_id);
          if (!parentInTabs) {
            const parentRes = await api.get(`/jobs/${tab.form.parent_job_id}`, { headers: authHeaders(session) });
            const parentFp = getFormFingerprint(parentRes.data);
            if (fp === parentFp) {
              setError(`Error: "${tab.title}" has no changes compared to the original profile. This duplicate cannot be accepted.`);
              setIsSaving(false);
              return;
            }
          }
        }
      }

      // 2. Perform submission if all unique
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
      // Fetch potential sync targets from backend
      const res = await api.get(`/jobs/${tab.form.job_id}/sync-targets`);
      setSyncTargets(res.data.targets);
      setSelectedSyncIds(res.data.targets.map((t: any) => t.id)); // Default select all
      setConfirmSyncOpen(true);
    } catch (err) {
      setError("Failed to load sync targets.");
    } finally {
      setIsSaving(false);
    }
  };

  const performSync = async () => {
    if (!activeTab || !session || !activeTab.form.job_id) return;
    setIsSaving(true);
    try {
      // First save the current profile
      await saveJobProgress(activeTab, activeTab.form.status);
      
      // Then sync to selected duplicates
      const res = await api.post(`/jobs/${activeTab.form.job_id}/sync`, {
        target_job_ids: selectedSyncIds
      });
      
      setSuccess(res.data.message);
      setConfirmSyncOpen(false);
      
      // Refresh all open tabs that were targets of this sync
      if (selectedSyncIds.length > 0) {
        for (const id of selectedSyncIds) {
          const tabToUpdate = tabs.find(t => t.form.job_id === id);
          if (tabToUpdate) {
            const updatedRes = await api.get(`/jobs/${id}`);
            const merged = mergeFormWithDefaults(updatedRes.data);
            setTabs(prev => prev.map(t => t.form.job_id === id ? { ...t, form: merged, isDirty: false } : t));
          }
        }
      }
    } catch (err) {
      setError("Failed to sync changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateJobFromList = async (jobId: number) => {
    setIsSaving(true);
    try {
      const res = await api.post(`/jobs/${jobId}/duplicate`, {});
      const fullJob = res.data;
      createNewTab(fullJob, fullJob.profile_name);
    } catch (err) {
      setError("Failed to duplicate profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoFill = async (file: File) => {
    if (!session || !activeTab) return;
    
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File size exceeds 5MB limit. Please upload a smaller file.");
      return;
    }

    setIsSaving(true);
    setSuccess("");
    setError("");
    
    try {
      setSuccess("Parsing your document. Please wait...");
      const extractedRaw = await parseDocument(file, session);
      const extracted = extractedRaw as any;
      
      updateActiveTab(prev => {
        const newForm = { ...prev.form };
        
        // 1. Basic Job Details
        if (extracted.profile_name) newForm.profile_name = extracted.profile_name;
        if (extracted.job_designation) newForm.job_designation = extracted.job_designation;
        if (extracted.description) newForm.description = extracted.description;
        if (extracted.place_of_posting) newForm.place_of_posting = extracted.place_of_posting;
        if (extracted.location) newForm.location = extracted.location;
        if (extracted.work_mode) {
          newForm.work_mode = extracted.work_mode as any;
          if (extracted.work_mode === "offline" && extracted.location) {
            newForm.offline_job_location = extracted.location;
          }
        }
        if (extracted.expected_hires) newForm.expected_hires = extracted.expected_hires;
        if (extracted.min_hires) newForm.min_hires = extracted.min_hires;
        if (extracted.joining_month) newForm.joining_month = extracted.joining_month;
        if (extracted.required_skills && extracted.required_skills.length > 0) newForm.required_skills = extracted.required_skills;
        if (extracted.training_period) newForm.training_period = extracted.training_period;
        if (extracted.bond) newForm.bond = extracted.bond;
        if (extracted.registration_link) newForm.registration_link = extracted.registration_link;
        if (extracted.onboarding_procedure) newForm.onboarding_procedure = extracted.onboarding_procedure;
        if (extracted.additional_info) newForm.additional_info = extracted.additional_info;
        if (extracted.job_categories) newForm.job_categories = extracted.job_categories;
        if (extracted.ppo_provision) (newForm as JnfForm).ppo_provision = extracted.ppo_provision;
        
        // Screening Tests
        if (extracted.has_psychometric_test !== undefined) newForm.has_psychometric_test = extracted.has_psychometric_test;
        if (extracted.has_medical_test !== undefined) newForm.has_medical_test = extracted.has_medical_test;
        if (extracted.other_screening_details) newForm.other_screening_details = extracted.other_screening_details;

        // 2. Salary Details
        if (extracted.salary) {
          if (newForm.job_type === "JNF") {
            const jnfSalary = (newForm as JnfForm).salary;
            if (extracted.salary.currency) jnfSalary.currency = extracted.salary.currency;
            
            // Map Salaries JSON (Programme-wise)
            if (extracted.salary.salaries_json && extracted.salary.salaries_json.length > 0) {
              jnfSalary.different_structure_per_programme = true;
              jnfSalary.salaries_json = jnfSalary.salaries_json.map(baseSal => {
                const extSalItem = extracted.salary?.salaries_json?.find((s: any) => s.programme === baseSal.programme);
                return extSalItem ? { ...baseSal, ...extSalItem, selected: true } : baseSal;
              });
            } else if (extracted.salary.ctc_lpa) {
              // Global fallback if no programme-wise data but global CTC found
              jnfSalary.salaries_json = jnfSalary.salaries_json.map(s => {
                const isSelected = extracted.eligibility?.degrees?.includes(s.programme) || s.selected;
                return {
                  ...s,
                  selected: isSelected,
                  ctc_annual: isSelected ? (extracted.salary?.ctc_lpa?.toString() || s.ctc_annual) : s.ctc_annual,
                  base_fixed: isSelected ? (extracted.salary?.fixed_component?.toString() || s.base_fixed) : s.base_fixed,
                  monthly_take_home: isSelected ? (extracted.salary?.monthly_take_home?.toString() || s.monthly_take_home) : s.monthly_take_home
                };
              });
            }

            // Map Additional Components
            const additional = jnfSalary.additional_components;
            const extSal = extracted.salary;
            if (extSal.joining_bonus) additional.global.joining_bonus = extSal.joining_bonus.toString();
            if (extSal.retention_bonus) additional.global.retention_bonus = extSal.retention_bonus.toString();
            if (extSal.bond_deductions) additional.global.deductions = extSal.bond_deductions.toString();
            if (extSal.relocation_allowance) additional.global.relocation_allowance = extSal.relocation_allowance.toString();
            if (extSal.esops) additional.global.esops_vest_period = extSal.esops.toString();

          } else if (newForm.job_type === "INF") {
            const infSalary = (newForm as InfForm).salary;
            const extSal = extracted.salary;
            const extractedStipend = extSal.stipend || extSal.fixed_component;
            
            // Map parsed salary components
            const parsedHra = extSal.hra;
            const parsedVariable = extSal.variable_component;
            const parsedOther = extSal.relocation_allowance;

            if (extractedStipend) {
              // Map to stipend_json if multiple programmes exist
              if (infSalary.stipend_json && infSalary.stipend_json.length > 0) {
                // If no degrees were matched, apply to ALL selected programs or at least the first one
                const hasMatchedDegrees = extracted.eligibility?.degrees && extracted.eligibility.degrees.length > 0;
                
                infSalary.stipend_json = infSalary.stipend_json.map((s, idx) => {
                  const isSelected = hasMatchedDegrees 
                    ? extracted.eligibility?.degrees?.includes(s.programme) 
                    : (s.selected || idx === 0); // Fallback to first if none selected
                  
                  return {
                    ...s,
                    base_stipend: isSelected ? (extractedStipend.toString()) : s.base_stipend,
                    hra: isSelected && parsedHra ? parsedHra.toString() : s.hra,
                    variable_pay: isSelected && parsedVariable ? parsedVariable.toString() : s.variable_pay,
                    other: isSelected && parsedOther ? parsedOther.toString() : s.other,
                    total: isSelected ? (
                      (Number(extractedStipend) || 0) + 
                      (Number(parsedHra) || 0) + 
                      (Number(parsedVariable) || 0) + 
                      (Number(parsedOther) || 0)
                    ).toString() : s.total,
                    selected: isSelected || s.selected
                  };
                });
              }
            }
            if (extracted.salary.internship_duration) infSalary.internship_duration = extracted.salary.internship_duration;
            if (extracted.additional_info && extracted.additional_info.includes("Perks:")) {
              const perksMatch = extracted.additional_info.match(/Perks: (.*)/);
              if (perksMatch) infSalary.other_perks = perksMatch[1];
            }
          }
        }
        
        // 3. Eligibility Criteria
        if (extracted.eligibility) {
          const elig = newForm.eligibility;
          if (extracted.eligibility.global_min_cgpa) {
            elig.global_min_cgpa = extracted.eligibility.global_min_cgpa.toString();
          }
          if (extracted.eligibility.global_allow_backlogs !== undefined) {
            elig.global_allow_backlogs = extracted.eligibility.global_allow_backlogs;
          }
          if (extracted.eligibility.global_max_backlogs !== undefined) {
            elig.global_max_backlogs = extracted.eligibility.global_max_backlogs.toString();
          }
          if (extracted.eligibility.high_school_percentage) {
            elig.high_school_percentage = extracted.eligibility.high_school_percentage.toString();
          }
          if (extracted.eligibility.gender_filter) {
            elig.gender_filter = extracted.eligibility.gender_filter;
          }

          // Disciplines selection
          if (extracted.eligibility.disciplines && extracted.eligibility.disciplines.length > 0) {
            elig.disciplines_json = elig.disciplines_json.map(rule => {
              const degreeMatch = !extracted.eligibility?.degrees?.length || extracted.eligibility?.degrees?.includes(rule.course);
              const disciplineMatch = extracted.eligibility?.disciplines?.includes(rule.discipline);
              return {
                ...rule,
                selected: (degreeMatch && disciplineMatch) || rule.selected
              };
            });
          }
        }

        // 4. Hiring Stages
        if (extracted.stages && extracted.stages.length > 0) {
          newForm.stages = extracted.stages.map((s: any, idx: number) => {
            const existingStage = hiringStages.find(hs => hs.name.toLowerCase() === s.name.toLowerCase());
            
            // Map extracted test types to standard dropdown options
            let mappedTestType = "Other";
            const lowerName = s.name.toLowerCase();
            if (lowerName.includes("ppt") || lowerName.includes("talk")) mappedTestType = "PPT";
            else if (lowerName.includes("shortlisting") || lowerName.includes("resume")) mappedTestType = "Shortlisting";
            else if (lowerName.includes("coding")) mappedTestType = "Coding";
            else if (lowerName.includes("aptitude")) mappedTestType = "Aptitude";
            else if (lowerName.includes("technical test")) mappedTestType = "Technical";
            else if (lowerName.includes("gd") || lowerName.includes("group discussion")) mappedTestType = "GD";
            else if (lowerName.includes("interview")) mappedTestType = "Interview";
            else if (lowerName.includes("medical")) mappedTestType = "Medical";
            else if (lowerName.includes("written")) mappedTestType = "Written";
            else if (lowerName.includes("psychometric")) mappedTestType = "Psychometric";

            return {
              stage_id: existingStage ? existingStage.stage_id.toString() : (idx + 1).toString(),
              sequence: (idx + 1).toString(),
              duration: s.duration || "60 mins",
              selection_mode: s.selection_mode || "Offline",
              test_type: mappedTestType,
              interview_mode: s.interview_mode || "On-campus",
              infrastructure_requirements: ""
            };
          });
        }

        // 5. Declaration
        if (extracted.declaration) {
          newForm.declaration = {
            ...newForm.declaration,
            authorised_signatory_name: extracted.declaration.authorised_signatory_name || newForm.declaration.authorised_signatory_name,
            authorised_signatory_designation: extracted.declaration.authorised_signatory_designation || newForm.declaration.authorised_signatory_designation,
            authorised_signatory_date: extracted.declaration.authorised_signatory_date || newForm.declaration.authorised_signatory_date,
            typed_signature: extracted.declaration.typed_signature || newForm.declaration.typed_signature,
          };
        }
        
        return { ...prev, form: newForm, isDirty: true };
      });
      
      setSuccess("Smart Auto-fill complete! Please verify the details.");
    } catch (err: any) {
      setError(err.message || "Failed to parse document. Please try again.");
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
            {view === "list" && !isAdmin && (
              <Button
                variant="contained"
                startIcon={<Plus />}
                onClick={() => {
                  const defaultCycleId = cycles.find(c => c.is_active)?.cycle_id || cycles[0]?.cycle_id || 1;
                  createNewTab(typeFilter === "INF" 
                    ? getInitialInf(infAipc, defaultCycleId) 
                    : getInitialJnf(jnfAipc, defaultCycleId)
                  );
                }}
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
            {!isAdmin && (
              <Tab 
                value="add" 
                onClick={(e) => { e.preventDefault(); createNewTab(typeFilter === "INF" ? getInitialInf(infAipc) : getInitialJnf(jnfAipc)); }}
                label={<Box sx={{ display: 'flex', alignItems: 'center', color: '#00796b' }}><Plus size={22} /></Box>} 
                sx={{ minWidth: 70 }}
              />
            )}
          </Tabs>
        </Paper>
      )}

      <Box>
        {view === "list" && !isAdmin ? (
          <Box key="list">
            <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)', overflow: 'hidden' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(0,121,107,0.05)' }}>
                    <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3, pl: 4 }}>PROFILE NAME</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>TYPE</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>STATUS</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>LAST STEP</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3 }}>DATE & TIME</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#004d40', py: 3, pr: 4 }} align="right">ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 12 }}>
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
                        <TableCell sx={{ fontWeight: 700, color: '#004d40', pl: 4 }}>{job.profile_name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={job.job_type} 
                            size="small" 
                            sx={{ 
                              fontWeight: 800, 
                              bgcolor: job.job_type === 'INF' ? '#e0f2f1' : '#e0f7fa',
                              color: job.job_type === 'INF' ? '#00695c' : '#006064'
                            }} 
                          />
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const isPositive = (job.status as string) === 'approved' || (job.status as string) === 'selected';
                            const isRejected = (job.status as string) === 'rejected';
                            const isSubmitted = (job.status as string) === 'submitted';
                            const isPending = (job.status as string) === 'draft' || (job.status as string) === 'pending';
                            return (
                              <Chip 
                                label={isPending ? "PENDING" : (job.status as string).toUpperCase()} 
                                size="small" 
                                sx={{ 
                                  fontWeight: 900, 
                                  fontSize: '0.65rem', 
                                  letterSpacing: 1,
                                  px: 1,
                                  bgcolor: isPositive ? '#e8f5e9' : (isRejected ? '#ffebee' : (isSubmitted ? '#e0f2f1' : '#fff3e0')),
                                  color: isPositive ? '#2e7d32' : (isRejected ? '#c62828' : (isSubmitted ? '#00796b' : '#ef6c00')),
                                  border: '1px solid',
                                  borderColor: isPositive ? '#c8e6c9' : (isRejected ? '#ffcdd2' : (isSubmitted ? '#b2dfdb' : '#ffe0b2')),
                                  ...( (isPositive || isRejected) && {
                                    boxShadow: isRejected ? '0 2px 8px rgba(198, 40, 40, 0.15)' : '0 2px 8px rgba(46, 125, 50, 0.15)'
                                  })
                                }}
                              />
                            );
                          })()}
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
                        <TableCell align="right" sx={{ pr: 4 }}>
                          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                            <Tooltip title={job.status === 'approved' ? "Approved profiles cannot be duplicated" : "Duplicate"}>
                              <span>
                                <IconButton 
                                  size="small" 
                                  onClick={() => duplicateJobFromList(job.job_id)}
                                  disabled={job.status === 'approved'}
                                  sx={{ color: '#00796b', bgcolor: 'rgba(0,121,107,0.05)', '&:hover': { bgcolor: 'rgba(0,121,107,0.1)' } }}
                                >
                                  <Copy size={18} />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Button 
                              variant="contained" 
                              size="small" 
                              onClick={() => resumeJob(job)}
                              disabled={job.status === 'approved'}
                              sx={{ 
                                borderRadius: 2, 
                                fontWeight: 800, 
                                fontSize: '0.75rem',
                                background: job.status === 'submitted' ? 'linear-gradient(135deg, #00796b 0%, #004d40 100%)' : 
                                            job.status === 'rejected' ? 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)' :
                                            'linear-gradient(135deg, #fb8c00 0%, #ef6c00 100%)',
                                px: 2
                              }}
                            >
                              {job.status === 'submitted' ? "View Details" : 
                               job.status === 'rejected' ? "Reapply" : 
                               job.status === 'approved' ? "Locked" : "Resume Edit"}
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
              <Paper sx={{ p: { xs: 3, md: 6 }, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.3)' }}>
                <Stack direction="row" spacing={2} sx={{ mb: 4, alignItems: 'center', p: 2, bgcolor: 'rgba(0,121,107,0.05)', borderRadius: 3, border: '1px dashed #00796b' }}>
                  <BrainCircuit size={32} color="#00796b" />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#004d40' }}>AI-Powered Smart Fill</Typography>
                    <Typography variant="caption" color="text.secondary">Tired of typing? Upload your document and we'll help you fill the form automatically! (Max size: 5MB)</Typography>
                  </Box>
                  <Button
                    component="label"
                    variant="contained"
                    startIcon={<Upload size={18} />}
                    disabled={isSaving}
                    sx={{ borderRadius: 3, bgcolor: '#00796b', '&:hover': { bgcolor: '#004d40' }, textTransform: 'none', fontWeight: 700 }}
                  >
                    {isSaving ? "Processing..." : "Auto-fill from Document"}
                    <input
                      type="file"
                      hidden
                      accept="application/pdf,image/*,.txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAutoFill(file);
                      }}
                    />
                  </Button>
                </Stack>

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
                          variant="outlined" 
                          color="info" 
                          startIcon={isAdminEditEnabled ? <FileCheck size={18} /> : <Edit3 size={18} />}
                          onClick={() => {
                            if (isAdminEditEnabled) {
                              // If finishing edit, save changes
                              saveJobProgress(activeTab, activeTab.form.status);
                              setIsAdminEditEnabled(false);
                            } else {
                              setIsAdminEditEnabled(true);
                            }
                          }}
                          disabled={isSaving}
                          sx={{ borderRadius: 3, px: 3, fontWeight: 700 }}
                        >
                          {isAdminEditEnabled ? "Save Edits" : "One-time Edit"}
                        </Button>
                        <Button 
                          variant="contained" 
                          color="success" 
                          startIcon={<FileCheck size={18} />}
                          onClick={() => saveJobProgress(activeTab, "submitted").then((savedJob) => api.put(`/applications/${savedJob.job_id}`, { status: 'selected', is_job: true })).then(() => { setSuccess("Profile approved."); fetchData(); setView("list"); })}
                          disabled={isSaving || isAdminEditEnabled}
                          sx={{ borderRadius: 3, px: 3, background: 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)' }}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="contained" 
                          color="error" 
                          startIcon={<XCircle size={18} />}
                          onClick={() => saveJobProgress(activeTab, "submitted").then((savedJob) => api.put(`/applications/${savedJob.job_id}`, { status: 'rejected', is_job: true })).then(() => { setSuccess("Profile rejected."); fetchData(); setView("list"); })}
                          disabled={isSaving || isAdminEditEnabled}
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
                            onClick={() => setConfirmSubmitOpen(true)} 
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
                      {/* Company Details Section - Shown when viewing/editing an existing profile */}
                      {activeTab.form.company && (activeTab.form.job_id || isAdmin) && (
                        <Grid size={12}>
                          <Paper sx={{ p: 4, mb: 4, bgcolor: 'rgba(0,121,107,0.03)', border: '1px solid rgba(0,121,107,0.1)', borderRadius: 4 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#004d40', mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Briefcase size={22} /> COMPANY REGISTRATION DETAILS
                            </Typography>
                            <Grid container spacing={3}>
                              <Grid size={4}>
                                <TextField label="Company Name" fullWidth value={activeTab.form.company.name ?? ""} disabled sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#004d40', fontWeight: 600 } }} />
                              </Grid>
                              <Grid size={4}>
                                <TextField label="Website" fullWidth value={activeTab.form.company.website ?? ""} disabled sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#004d40' } }} />
                              </Grid>
                              <Grid size={4}>
                                <TextField label="Sector" fullWidth value={activeTab.form.company.sector ?? ""} disabled sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#004d40' } }} />
                              </Grid>
                              <Grid size={12}>
                                <TextField label="Postal Address" fullWidth multiline rows={2} value={activeTab.form.company.postal_address ?? ""} disabled sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#004d40' } }} />
                              </Grid>
                              <Grid size={3}>
                                <TextField label="City" fullWidth value={activeTab.form.company.city ?? ""} disabled sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#004d40' } }} />
                              </Grid>
                              <Grid size={3}>
                                <TextField label="State" fullWidth value={activeTab.form.company.state ?? ""} disabled sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#004d40' } }} />
                              </Grid>
                              <Grid size={3}>
                                <TextField label="Established Year" fullWidth value={activeTab.form.company.established_year ?? ""} disabled sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#004d40' } }} />
                              </Grid>
                              <Grid size={3}>
                                <TextField label="Employees" fullWidth value={activeTab.form.company.employee_count ?? ""} disabled sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#004d40' } }} />
                              </Grid>
                              <Grid size={6}>
                                <TextField label="Annual Turnover" fullWidth value={activeTab.form.company.annual_turnover ?? ""} disabled sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#004d40' } }} />
                              </Grid>
                              <Grid size={6}>
                                <TextField label="Social Media" fullWidth value={activeTab.form.company.social_media || "N/A"} disabled sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#004d40' } }} />
                              </Grid>
                            </Grid>
                            
                            {activeTab.form.company.contacts && activeTab.form.company.contacts.length > 0 && (
                              <Box sx={{ mt: 4 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#00695c', mb: 2 }}>Contact Persons</Typography>
                                <Stack spacing={2}>
                                  {activeTab.form.company.contacts.map((contact, i) => (
                                    <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.5)' }}>
                                      <Grid container spacing={2}>
                                        <Grid size={3}><Typography variant="caption" color="text.secondary">Name</Typography><Typography variant="body2" sx={{ fontWeight: 600, color: '#004d40' }}>{contact.name}</Typography></Grid>
                                        <Grid size={3}><Typography variant="caption" color="text.secondary">Designation</Typography><Typography variant="body2" sx={{ fontWeight: 600, color: '#004d40' }}>{contact.designation}</Typography></Grid>
                                        <Grid size={3}><Typography variant="caption" color="text.secondary">Email</Typography><Typography variant="body2" sx={{ fontWeight: 600, color: '#004d40' }}>{contact.email}</Typography></Grid>
                                        <Grid size={3}><Typography variant="caption" color="text.secondary">Phone</Typography><Typography variant="body2" sx={{ fontWeight: 600, color: '#004d40' }}>{contact.phone}</Typography></Grid>
                                      </Grid>
                                    </Paper>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                          </Paper>
                          <Divider sx={{ my: 4 }} />
                          <Typography variant="h6" sx={{ fontWeight: 800, color: '#004d40', mb: 3 }}>JOB PROFILE DETAILS</Typography>
                        </Grid>
                      )}

                      <Grid size={6}>
                        <TextField
                          label={activeTab.form.job_type === "INF" ? "Internship Title *" : "Profile Name / Job Title *"}
                          placeholder={activeTab.form.job_type === "INF" ? "e.g. Software Engineering Intern" : "e.g. Senior Software Engineer"}
                          fullWidth
                          required
                          value={activeTab.form.profile_name ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, title: e.target.value, form: { ...prev.form, profile_name: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Job Designation (formal title)"
                          placeholder="e.g. Software Developer Engineer - I"
                          fullWidth
                          value={activeTab.form.job_designation ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, job_designation: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Place of Posting *"
                          placeholder="e.g. Bengaluru, Karnataka"
                          fullWidth
                          required
                          value={activeTab.form.place_of_posting ?? ""}
                          disabled={isReadOnly()}
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
                            disabled={isReadOnly()}
                            onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, work_mode: e.target.value as any } }))}
                          >
                            <MenuItem value="online">Remote / Work from Home</MenuItem>
                            <MenuItem value="offline">On-site / Office</MenuItem>
                            <MenuItem value="hybrid">Hybrid</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={3}>
                        <TextField
                          label="Expected Number of Hires *"
                          fullWidth
                          required
                          type="number"
                          value={activeTab.form.expected_hires ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, expected_hires: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={3}>
                        <TextField
                          label="Minimum Number of Hires"
                          fullWidth
                          type="number"
                          value={activeTab.form.min_hires ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, min_hires: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Tentative Joining Month *"
                          placeholder="e.g. July 2026"
                          fullWidth
                          required
                          value={activeTab.form.joining_month ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, joining_month: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          label={activeTab.form.job_type === "INF" ? "Internship Description (Rich Text Editor) *" : "Job Description (Rich Text Editor) *"}
                          fullWidth
                          multiline
                          rows={6}
                          required
                          placeholder={activeTab.form.job_type === "INF" ? "Enter detailed internship roles, learning objectives, and summary..." : "Enter detailed roles, responsibilities, and job summary..."}
                          value={activeTab.form.description ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, description: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <Button
                          component="label"
                          variant="outlined"
                          startIcon={<Upload size={18} />}
                          disabled={isReadOnly()}
                          sx={{ borderRadius: 4, py: 1.5, px: 3, borderColor: 'rgba(0,0,0,0.2)', color: 'text.secondary', textTransform: 'none', fontWeight: 600, width: '100%', justifyContent: 'flex-start' }}
                        >
                          {activeTab.form.jd_pdf_url ? `${activeTab.form.job_type === "INF" ? "Internship Description" : "Job Description"} Uploaded: ${activeTab.form.jd_pdf_url}` : `Upload ${activeTab.form.job_type === "INF" ? "Internship Description" : "Job Description"} as PDF (Optional)`}
                          <input
                            type="file"
                            hidden
                            accept="application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                updateActiveTab(prev => ({ ...prev, form: { ...prev.form, jd_pdf_url: file.name } }));
                              }
                            }}
                          />
                        </Button>
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          label="Required Skills (tag input - comma separated)"
                          fullWidth
                          placeholder="e.g. Python, React, Data Structures, Problem Solving"
                          value={activeTab.form.required_skills?.join(", ") ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, required_skills: e.target.value.split(",").map(s => s.trim()) } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          label="Additional Job Information (Maximum 1000 characters)"
                          fullWidth
                          multiline
                          rows={3}
                          inputProps={{ maxLength: 1000 }}
                          value={activeTab.form.additional_info_1000 ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, additional_info_1000: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Pre-Placement Offer (PPO) Provision on Performance"
                          placeholder="e.g. Performance-based conversion available"
                          fullWidth
                          value={activeTab.form.ppo_provision ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, ppo_provision: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Bond Details (if any)"
                          placeholder="e.g. 2-year service agreement"
                          fullWidth
                          value={activeTab.form.bond ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, bond: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Registration Link (if any)"
                          placeholder="https://company-portal.com/careers/job123"
                          fullWidth
                          value={activeTab.form.registration_link ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, registration_link: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      <Grid size={6}>
                        <TextField
                          label="Onboarding Procedure to Company"
                          placeholder="e.g. Virtual orientation followed by 1-week in-office training"
                          fullWidth
                          multiline
                          rows={2}
                          value={activeTab.form.onboarding_procedure ?? ""}
                          disabled={isReadOnly()}
                          onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, onboarding_procedure: e.target.value } }))}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                        />
                      </Grid>
                      {activeTab.form.job_type === "INF" && (
                        <Grid size={6}>
                          <TextField
                            label="Expected Duration of Internship"
                            placeholder="e.g. 2 months"
                            fullWidth
                            value={(activeTab.form as InfForm).salary.internship_duration ?? ""}
                            disabled={isReadOnly()}
                            onChange={(e) => {
                              const internship_duration = e.target.value;
                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, internship_duration } } } as any));
                            }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                          />
                        </Grid>
                      )}
                    </Grid>
                  )}

                  {activeTab.activeStep === 1 && (
                    <Box>
                      <Paper sx={{ p: 3, mb: 4, bgcolor: 'rgba(0, 121, 107, 0.05)', borderRadius: 2, border: '1px solid rgba(0, 121, 107, 0.1)' }}>
                        <Grid container spacing={3} alignItems="center">
                          <Grid size={12}><Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#004d40', mb: 1 }}>GLOBAL BRANCH ELIGIBILITY CRITERIA</Typography></Grid>
                          <Grid size={3}>
                            <TextField
                              label="Global Minimum CGPA / CPI"
                              fullWidth
                              type="number"
                              value={activeTab.form.eligibility.global_min_cgpa ?? ""}
                              disabled={isReadOnly()}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, global_min_cgpa: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={3}>
                            <FormControlLabel
                              control={
                                <Checkbox 
                                  checked={!!activeTab.form.eligibility.global_allow_backlogs}
                                  disabled={isReadOnly()}
                                  onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, global_allow_backlogs: e.target.checked } } }))}
                                />
                              }
                              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Allow Active Backlogs</Typography>}
                            />
                          </Grid>
                          <Grid size={3}>
                            <TextField
                              label="Global Maximum Backlogs"
                              fullWidth
                              type="number"
                              disabled={isReadOnly() || !activeTab.form.eligibility.global_allow_backlogs}
                              value={activeTab.form.eligibility.global_max_backlogs ?? ""}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, global_max_backlogs: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={3}>
                            <TextField
                              label="High School (Class 12) Percentage"
                              fullWidth
                              type="number"
                              value={activeTab.form.eligibility.high_school_percentage ?? ""}
                              disabled={isReadOnly()}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, high_school_percentage: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={3}>
                            <FormControl fullWidth>
                              <InputLabel>Gender Filter</InputLabel>
                              <Select
                                value={activeTab.form.eligibility.gender_filter ?? "All"}
                                label="Gender Filter"
                                disabled={isReadOnly()}
                                onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, gender_filter: e.target.value } } }))}
                              >
                                <MenuItem value="All">All Students</MenuItem>
                                <MenuItem value="Male">Male Students Only</MenuItem>
                                <MenuItem value="Female">Female Students Only</MenuItem>
                                <MenuItem value="Others">Others</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={6}>
                            <TextField
                              label="Any Specific Requirements (e.g. SLP related or others)"
                              fullWidth
                              placeholder="Enter any additional eligibility requirements..."
                              value={activeTab.form.eligibility.other_requirements ?? ""}
                              disabled={isReadOnly()}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, eligibility: { ...prev.form.eligibility, other_requirements: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={3}>
                            <Button 
                              variant="contained" 
                              fullWidth
                              disabled={isReadOnly()}
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
                                  disabled={isReadOnly()}
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
                                      disabled={isReadOnly()}
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
                                      disabled={isReadOnly()}
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
                                            disabled={isReadOnly()}
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
                                            disabled={isReadOnly() || !rule.selected}
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
                                            disabled={isReadOnly() || !rule.selected}
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
                                              disabled={isReadOnly() || !rule.selected}
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
                            disabled={isReadOnly()}
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
                          <Paper sx={{ p: 3, mb: 4, bgcolor: 'rgba(0, 121, 107, 0.05)', borderRadius: 2, border: '1px solid rgba(0, 121, 107, 0.1)' }}>
                            <Grid container spacing={3} alignItems="center">
                              <Grid size={12}><Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#004d40', mb: 1 }}>GLOBAL SALARY VALUES (APPLY TO SELECTED PROGRAMMES)</Typography></Grid>
                              <Grid size={2.5}><TextField label="CTC (Annual)" fullWidth size="small" id="global-ctc" disabled={isReadOnly()} /></Grid>
                              <Grid size={2.5}><TextField label="Base / Fixed" fullWidth size="small" id="global-base" disabled={isReadOnly()} /></Grid>
                              <Grid size={2.5}><TextField label="In Hand" fullWidth size="small" id="global-takehome" disabled={isReadOnly()} /></Grid>
                              <Grid size={2}>
                                <Button 
                                  variant="contained" 
                                  fullWidth
                                  disabled={isReadOnly()}
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
                                  disabled={isReadOnly()}
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
                                      disabled={isReadOnly()}
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
                                  <TableCell sx={{ fontWeight: 700 }}>Programme (IIT Guwahati)</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>CTC (Annual)</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Base / Fixed</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>In Hand</TableCell>
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
                                                disabled={isReadOnly()}
                                                onChange={(e) => {
                                                  const newSalaries = [...(activeTab.form as JnfForm).salary.salaries_json];
                                                  newSalaries[originalIdx] = { ...sal, selected: e.target.checked };
                                                  updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, salaries_json: newSalaries } } } as any));
                                                }}
                                              />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{sal.programme}</TableCell>
                                            <TableCell><TextField size="small" type="number" disabled={isReadOnly() || !sal.selected} value={sal.ctc_annual ?? ""} onChange={(e) => {
                                              const newSalaries = [...(activeTab.form as JnfForm).salary.salaries_json];
                                              newSalaries[originalIdx] = { ...sal, ctc_annual: e.target.value };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, salaries_json: newSalaries } } } as any));
                                            }} /></TableCell>
                                            <TableCell><TextField size="small" type="number" disabled={isReadOnly() || !sal.selected} value={sal.base_fixed ?? ""} onChange={(e) => {
                                              const newSalaries = [...(activeTab.form as JnfForm).salary.salaries_json];
                                              newSalaries[originalIdx] = { ...sal, base_fixed: e.target.value };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, salaries_json: newSalaries } } } as any));
                                            }} /></TableCell>
                                            <TableCell><TextField size="small" type="number" disabled={isReadOnly() || !sal.selected} value={sal.monthly_take_home ?? ""} onChange={(e) => {
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
                                  {[
                                    { key: "joining_bonus", label: "Joining Bonus" },
                                    { key: "retention_bonus", label: "Retention Bonus" },
                                    { key: "variable_performance_bonus", label: "Variable / Performance Bonus" },
                                    { key: "esops_vest_period", label: "ESOPs + Vest Period" },
                                    { key: "relocation_allowance", label: "Relocation Allowance" },
                                    { key: "medical_allowance", label: "Medical Allowance" },
                                    { key: "deductions", label: "Deductions" },
                                    { key: "bond_amount_duration", label: "Bond Amount + Duration" },
                                    { key: "first_year_ctc", label: "First Year CTC" },
                                    { key: "stocks_options", label: "Stocks / Options" },
                                    { key: "ctc_breakup", label: "CTC Breakup (free text)" },
                                    { key: "gross_salary", label: "Gross Salary" }
                                  ].map(field => (
                                    <Grid key={field.key} size={4}>
                                      <TextField
                                        label={field.label.toUpperCase()}
                                        fullWidth
                                        size="small"
                                        multiline={field.key === "ctc_breakup"}
                                        rows={field.key === "ctc_breakup" ? 2 : 1}
                                        disabled={isReadOnly()}
                                        value={(activeTab.form as JnfForm).salary.additional_components?.[key]?.[field.key as keyof AdditionalSalary] ?? ""}
                                        onChange={(e) => {
                                          const newComponents = { ...((activeTab.form as JnfForm).salary.additional_components || {}) };
                                          if (!newComponents[key]) newComponents[key] = initialAdditionalSalary();
                                          newComponents[key] = { ...newComponents[key], [field.key]: e.target.value };
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
                        <Box>
                          <Paper sx={{ p: 3, mb: 4, bgcolor: 'rgba(0, 121, 107, 0.05)', borderRadius: 2, border: '1px solid rgba(0, 121, 107, 0.1)' }}>
                            <Grid container spacing={3} alignItems="center">
                              <Grid size={12}><Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#004d40', mb: 1 }}>GLOBAL STIPEND VALUES (APPLY TO SELECTED PROGRAMMES)</Typography></Grid>
                              <Grid size={2}><TextField label="Base Stipend (Monthly)" fullWidth size="small" id="global-stipend" disabled={isReadOnly()} /></Grid>
                              <Grid size={2}><TextField label="HRA / Housing Allowance" fullWidth size="small" id="global-hra" disabled={isReadOnly()} /></Grid>
                              <Grid size={2}><TextField label="Variable / Performance Pay" fullWidth size="small" id="global-variable" disabled={isReadOnly()} /></Grid>
                              <Grid size={2}><TextField label="Other" fullWidth size="small" id="global-other" disabled={isReadOnly()} /></Grid>
                              <Grid size={2}>
                                <Button 
                                  variant="contained" 
                                  fullWidth
                                  disabled={isReadOnly()}
                                  onClick={() => {
                                    const stipend = (document.getElementById('global-stipend') as HTMLInputElement).value;
                                    const hra = (document.getElementById('global-hra') as HTMLInputElement).value;
                                    const variable = (document.getElementById('global-variable') as HTMLInputElement).value;
                                    const other = (document.getElementById('global-other') as HTMLInputElement).value;
                                    
                                    const newStipends = (activeTab.form as InfForm).salary.stipend_json.map(s => 
                                      s.selected ? {
                                        ...s,
                                        base_stipend: stipend || s.base_stipend,
                                        hra: hra || s.hra,
                                        variable_pay: variable || s.variable_pay,
                                        other: other || s.other,
                                        total: (Number(stipend || s.base_stipend) + Number(hra || s.hra) + Number(variable || s.variable_pay) + Number(other || s.other)).toString()
                                      } : s
                                    );
                                    updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, stipend_json: newStipends } } } as any));
                                  }}
                                  sx={{ bgcolor: '#00796b', height: '40px', fontWeight: 700 }}
                                >
                                  Apply
                                </Button>
                              </Grid>
                              <Grid size={2}>
                                <Button 
                                  variant="outlined" 
                                  fullWidth
                                  disabled={isReadOnly()}
                                  onClick={() => {
                                    const visibleProgrammes = activeTab.form.eligibility.disciplines_json
                                      .filter(r => r.selected)
                                      .map(r => r.course);
                                    const uniqueVisible = Array.from(new Set(visibleProgrammes));
                                    
                                    const newStipends = (activeTab.form as InfForm).salary.stipend_json.map(s => 
                                      uniqueVisible.includes(s.programme) ? { ...s, selected: true } : s
                                    );
                                    updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, stipend_json: newStipends } } } as any));
                                  }}
                                  sx={{ height: '40px', fontWeight: 700, borderColor: '#00796b', color: '#00796b' }}
                                >
                                  Select All
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
                                        (activeTab.form as InfForm).salary.stipend_json
                                          .filter(s => activeTab.form.eligibility.disciplines_json.some(r => r.course === s.programme && r.selected))
                                          .every(s => s.selected)
                                      }
                                      disabled={isReadOnly()}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        const visibleProgrammes = activeTab.form.eligibility.disciplines_json
                                          .filter(r => r.selected)
                                          .map(r => r.course);
                                        const uniqueVisible = Array.from(new Set(visibleProgrammes));
                                        
                                        const newStipends = (activeTab.form as InfForm).salary.stipend_json.map(s => 
                                          uniqueVisible.includes(s.programme) ? { ...s, selected: checked } : s
                                        );
                                        updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, stipend_json: newStipends } } } as any));
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Programme (IIT Guwahati)</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Base Stipend (Monthly)</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>HRA / Housing Allowance</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Variable / Performance Pay</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Other</TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {["UG", "PG", "PhD", "Other"].map(cat => {
                                  const relevantStipends = (activeTab.form as InfForm).salary.stipend_json.filter(s => {
                                    const categoryMatch = getCourseCategory(s.programme) === cat;
                                    const isCourseSelected = activeTab.form.eligibility.disciplines_json.some(r => r.course === s.programme && r.selected);
                                    return categoryMatch && isCourseSelected;
                                  });
                                  if (relevantStipends.length === 0) return null;
                                  return (
                                    <Fragment key={cat}>
                                      <TableRow sx={{ bgcolor: 'rgba(0,121,107,0.03)' }}>
                                        <TableCell colSpan={7} sx={{ fontWeight: 900, color: '#00796b', py: 1.5, letterSpacing: 1 }}>{cat} PROGRAMMES</TableCell>
                                      </TableRow>
                                      {relevantStipends.map((sal) => {
                                        const originalIdx = (activeTab.form as InfForm).salary.stipend_json.findIndex(s => s.programme === sal.programme);
                                        return (
                                          <TableRow key={sal.programme} sx={{ opacity: sal.selected ? 1 : 0.6 }}>
                                            <TableCell>
                                              <Checkbox 
                                                checked={!!sal.selected}
                                                disabled={isReadOnly()}
                                                onChange={(e) => {
                                                  const newStipends = [...(activeTab.form as InfForm).salary.stipend_json];
                                                  newStipends[originalIdx] = { ...sal, selected: e.target.checked };
                                                  updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, stipend_json: newStipends } } } as any));
                                                }}
                                              />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{sal.programme}</TableCell>
                                            <TableCell><TextField size="small" type="number" disabled={isReadOnly() || !sal.selected} value={sal.base_stipend ?? ""} onChange={(e) => {
                                              const newStipends = [...(activeTab.form as InfForm).salary.stipend_json];
                                              newStipends[originalIdx] = { ...sal, base_stipend: e.target.value, total: (Number(e.target.value) + Number(sal.hra) + Number(sal.variable_pay) + Number(sal.other)).toString() };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, stipend_json: newStipends } } } as any));
                                            }} /></TableCell>
                                            <TableCell><TextField size="small" type="number" disabled={isReadOnly() || !sal.selected} value={sal.hra ?? ""} onChange={(e) => {
                                              const newStipends = [...(activeTab.form as InfForm).salary.stipend_json];
                                              newStipends[originalIdx] = { ...sal, hra: e.target.value, total: (Number(sal.base_stipend) + Number(e.target.value) + Number(sal.variable_pay) + Number(sal.other)).toString() };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, stipend_json: newStipends } } } as any));
                                            }} /></TableCell>
                                            <TableCell><TextField size="small" type="number" disabled={isReadOnly() || !sal.selected} value={sal.variable_pay ?? ""} onChange={(e) => {
                                              const newStipends = [...(activeTab.form as InfForm).salary.stipend_json];
                                              newStipends[originalIdx] = { ...sal, variable_pay: e.target.value, total: (Number(sal.base_stipend) + Number(sal.hra) + Number(e.target.value) + Number(sal.other)).toString() };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, stipend_json: newStipends } } } as any));
                                            }} /></TableCell>
                                            <TableCell><TextField size="small" type="number" disabled={isReadOnly() || !sal.selected} value={sal.other ?? ""} onChange={(e) => {
                                              const newStipends = [...(activeTab.form as InfForm).salary.stipend_json];
                                              newStipends[originalIdx] = { ...sal, other: e.target.value, total: (Number(sal.base_stipend) + Number(sal.hra) + Number(sal.variable_pay) + Number(e.target.value)).toString() };
                                              updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, stipend_json: newStipends } } } as any));
                                            }} /></TableCell>
                                            <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{sal.total || "0"}</Typography></TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </Fragment>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </Paper>

                          <Grid container spacing={4}>
                            <Grid size={12}>
                              <TextField
                                label="Other Compensation / Perks"
                                fullWidth
                                multiline
                                rows={3}
                                disabled={isReadOnly()}
                                value={(activeTab.form as InfForm).salary.other_perks ?? ""}
                                onChange={(e) => {
                                  const other_perks = e.target.value;
                                  updateActiveTab(prev => ({ ...prev, form: { ...prev.form, salary: { ...prev.form.salary, other_perks } } } as any));
                                }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4, bgcolor: 'rgba(255,255,255,0.5)' } }}
                              />
                            </Grid>
                          </Grid>
                        </Box>
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
                          disabled={isReadOnly()}
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
                          <Paper key={idx} elevation={0} sx={{ p: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
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
                                    disabled={isReadOnly()}
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
                                    disabled={isReadOnly()}
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
                                    <MenuItem value="Written">Written Test</MenuItem>
                                    <MenuItem value="GD">Group Discussion</MenuItem>
                                    <MenuItem value="Interview">Personal/Technical Interview</MenuItem>
                                    <MenuItem value="Other">Any Other Round</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid size={4}>
                                <TextField
                                  label="Duration (mins)"
                                  fullWidth
                                  type="number"
                                  disabled={isReadOnly()}
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
                                  disabled={isReadOnly()}
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

                      <Paper sx={{ p: 3, mt: 4, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                        <Grid container spacing={3}>
                          <Grid size={4}>
                            <FormControlLabel
                              control={<Checkbox checked={!!activeTab.form.has_psychometric_test} disabled={isReadOnly()} onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, has_psychometric_test: e.target.checked } }))} />}
                              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Psychometric Test</Typography>}
                            />
                          </Grid>
                          <Grid size={4}>
                            <FormControlLabel
                              control={<Checkbox checked={!!activeTab.form.has_medical_test} disabled={isReadOnly()} onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, has_medical_test: e.target.checked } }))} />}
                              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Medical Test</Typography>}
                            />
                          </Grid>
                          <Grid size={12}>
                            <TextField
                              label="Other Screening Details"
                              fullWidth
                              multiline
                              rows={2}
                              disabled={isReadOnly()}
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
                      
                      <Stack spacing={3} sx={{ bgcolor: 'rgba(0,0,0,0.02)', p: 4, borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)', mb: 4 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#00796b', mb: 1 }}>AIPC GUIDELINES ACKNOWLEDGEMENT</Typography>
                        <Box sx={{ mb: 2 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            component="a"
                            href="https://people.iitism.ac.in/~download/cdc/AIPC_Guidelines_2023.pdf"
                            target="_blank"
                            startIcon={<FileText size={16} />}
                            sx={{ borderRadius: 2, fontWeight: 700, borderColor: '#00796b', color: '#00796b' }}
                          >
                            VIEW AIPC GUIDELINES
                          </Button>
                        </Box>
                        {(activeTab.form.job_type === "JNF" ? jnfAipcGuidelineItems : infAipcGuidelineItems).map((item) => (
                          <Box key={item.key} sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            <Checkbox 
                              checked={!!activeTab.form.declaration?.aipc_guidelines?.[item.key]} 
                              color="primary"
                              disabled={isReadOnly()}
                              onChange={(e) => {
                                const newGuidelines = { ...(activeTab.form.declaration?.aipc_guidelines || {}), [item.key]: e.target.checked };
                                updateActiveTab(prev => ({
                                  ...prev,
                                  form: {
                                    ...prev.form,
                                    declaration: { ...(prev.form.declaration || {}), aipc_guidelines: newGuidelines }
                                  }
                                }));
                              }}
                              sx={{ mt: -1 }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', lineHeight: 1.6 }}>
                              {item.label}
                            </Typography>
                          </Box>
                        ))}
                        <Divider sx={{ my: 2 }} />
                        <FormControlLabel
                          control={
                            <Checkbox 
                              checked={!!activeTab.form.declaration?.rti_nirf_consent} 
                              disabled={isReadOnly()}
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
                              disabled={isReadOnly()}
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

                      <Paper sx={{ p: 4, borderRadius: 2, bgcolor: 'rgba(0, 121, 107, 0.05)' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#004d40', mb: 3 }}>SELF-DECLARATION</Typography>
                        <Grid container spacing={3}>
                          <Grid size={6}>
                            <TextField
                              label="Authorised Signatory Name *"
                              required
                              fullWidth
                              disabled={isReadOnly()}
                              value={activeTab.form.declaration?.authorised_signatory_name ?? ""}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, declaration: { ...(prev.form.declaration || {}), authorised_signatory_name: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={6}>
                            <TextField
                              label="Designation *"
                              required
                              fullWidth
                              disabled={isReadOnly()}
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
                              disabled={isReadOnly()}
                              value={activeTab.form.declaration?.authorised_signatory_date ?? ""}
                              onChange={(e) => updateActiveTab(prev => ({ ...prev, form: { ...prev.form, declaration: { ...(prev.form.declaration || {}), authorised_signatory_date: e.target.value } } }))}
                            />
                          </Grid>
                          <Grid size={6}>
                            <TextField
                              label="Typed Signature (Name) *"
                              required
                              fullWidth
                              disabled={isReadOnly()}
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
                    {!isReadOnly() && (
                      <Button 
                        variant="outlined" 
                        onClick={() => saveJobProgress(activeTab, "pending")}
                        sx={{ borderRadius: 3, px: 4, borderColor: '#00796b', color: '#00796b', fontWeight: 700 }}
                      >
                        Save Progress
                      </Button>
                    )}
                    {activeTab.activeStep === steps.length - 1 ? (
                      !isReadOnly() && (
                        <Button 
                          variant="contained" 
                          onClick={() => setConfirmSubmitOpen(true)}
                          disabled={isSaving}
                          sx={{ borderRadius: 3, px: 5, background: 'linear-gradient(135deg, #00796b 0%, #004d40 100%)', fontWeight: 800 }}
                        >
                          {isSaving ? "Processing..." : "Submit Profile"}
                        </Button>
                      )
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

      {/* Confirmation Dialogs */}
      
      {/* Duplicate Confirmation */}
      <Dialog open={confirmDuplicateOpen} onClose={() => setConfirmDuplicateOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800, color: '#004d40' }}>Duplicate Profile?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to duplicate this profile? A new draft will be created with all current information.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setConfirmDuplicateOpen(false)} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={performDuplicate} variant="contained" sx={{ bgcolor: '#00796b', fontWeight: 700, borderRadius: 2 }}>Confirm Duplicate</Button>
        </DialogActions>
      </Dialog>

      {/* Sync Confirmation & Selection */}
      <Dialog open={confirmSyncOpen} onClose={() => setConfirmSyncOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#004d40' }}>Sync Changes to Other Profiles?</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Select the profiles you want to update with changes from this profile:</Typography>
          {syncTargets.length > 0 ? (
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={selectedSyncIds.length === syncTargets.length}
                    indeterminate={selectedSyncIds.length > 0 && selectedSyncIds.length < syncTargets.length}
                    onChange={(e) => setSelectedSyncIds(e.target.checked ? syncTargets.map(t => t.id) : [])}
                  />
                }
                label={<Typography sx={{ fontWeight: 700 }}>Select All</Typography>}
              />
              <Divider sx={{ my: 1 }} />
              {syncTargets.map((target) => (
                <FormControlLabel
                  key={target.id}
                  control={
                    <Checkbox 
                      checked={selectedSyncIds.includes(target.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedSyncIds([...selectedSyncIds, target.id]);
                        else setSelectedSyncIds(selectedSyncIds.filter(id => id !== target.id));
                      }}
                    />
                  }
                  label={target.name}
                />
              ))}
            </FormGroup>
          ) : (
            <Typography color="text.secondary">No other related profiles found to sync with.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setConfirmSyncOpen(false)} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button 
            onClick={performSync} 
            variant="contained" 
            disabled={selectedSyncIds.length === 0}
            sx={{ bgcolor: '#00796b', fontWeight: 700, borderRadius: 2 }}
          >
            Sync Selected
          </Button>
        </DialogActions>
      </Dialog>

      {/* Submit Confirmation */}
      <Dialog open={confirmSubmitOpen} onClose={() => setConfirmSubmitOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#004d40' }}>
          {tabs.length > 1 ? `Submit All ${tabs.length} Profiles?` : "Submit Profile?"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {tabs.length > 1 
              ? "Are you sure you want to submit all open profiles? Once submitted, they will be sent for approval and cannot be edited until reviewed."
              : "Are you sure you want to submit this profile for approval? Once submitted, you cannot edit it until it has been reviewed."}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setConfirmSubmitOpen(false)} sx={{ color: 'text.secondary', fontWeight: 600 }}>Cancel</Button>
          <Button 
            onClick={() => {
              console.log("Confirm Submission clicked, calling performSubmit");
              performSubmit();
            }} 
            variant="contained" 
            sx={{ bgcolor: '#00796b', fontWeight: 700, borderRadius: 2 }}
          >
            Confirm Submission
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}
