export const defaultHiringStages = [
  "Pre-Placement Talk",
  "Resume Shortlisting",
  "Online/Written Test",
  "Group Discussion",
  "Any Other Round",
  "Personal/Technical Interview",
];

export const jnfDisciplines = [
  "Computer Science & Engineering",
  "Electrical Engineering",
  "Electronics & Communication Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Mining Engineering",
  "Petroleum Engineering",
  "Mathematics & Computing",
  "Data Analytics",
  "MBA",
  "M.Sc.",
  "PhD",
];

export const courseOptions = [
  "B.Tech",
  "M.Tech",
  "MBA",
  "M.Sc",
  "PhD",
  "Dual Degree",
];

const engineeringDisciplines = [
  "Computer Science & Engineering",
  "Electrical Engineering",
  "Electronics & Communication Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Mining Engineering",
  "Petroleum Engineering",
  "Mathematics & Computing",
  "Data Analytics",
] as const;

/** Disciplines allowed per course (aligned with backend config/course_disciplines.php). */
export const courseToDisciplines: Record<string, string[]> = {
  "B.Tech": [...engineeringDisciplines],
  "M.Tech": [...engineeringDisciplines],
  "Dual Degree": [...engineeringDisciplines],
  MBA: ["MBA"],
  "M.Sc": [
    "M.Sc.",
    "Mathematics & Computing",
    "Data Analytics",
    "Computer Science & Engineering",
    "Chemical Engineering",
  ],
  PhD: Array.from(new Set<string>(["PhD", ...engineeringDisciplines])),
};

/** AIPC declaration items for INF (Internship Notification Form). */
export const infAipcGuidelineItems: { key: string; label: string }[] = [
  {
    key: "aipc_guidelines_agreement",
    label: "AIPC guidelines for the placement/ internship is provided in the link: https://cdc.itism.ac.in/files/AIPC_Guidelines_2023.pdf .We have gone through the AIPC guidelines thoroughly and agree to abide by the guidelines during the entire process of placement/internship activities. In case of violation of guidelines by us, we understand that an appropriate action may be taken on us as per AIPC guidelines.",
  },
  {
    key: "shortlisting_assurance",
    label: "We declare that we would be providing the shortlisting criteria along with the CV-shortlisted and/or Test-shortlisted candidates. We also assure that the details of final shortlisted candidates will be provided within the 24 to 48 hours after the written test.",
  },
  {
    key: "information_verification",
    label: "The information related to various job/intern profiles posted by us is verified and correct to the best of our knowledge, and the company will abide by the terms and conditions as outlined in these job/intern profiles posted while making the offers. No new clauses/ changes would be added/made in the final offer rolled out to the candidates selected on the profile(s). All details have already been outlined in the Internship Notification Forms. In the event of any discrepancy in the final offers, the company may be subject to appropriate actions in accordance with the AIPC guidelines.",
  },
  {
    key: "sharing_consent",
    label: "We consent to sharing of company name, logo and email with national ranking agencies and government directives, and to listing company names in social media platforms and press/media.",
  },
];

/** AIPC declaration items for JNF (Job Notification Form). */
export const jnfAipcGuidelineItems: { key: string; label: string }[] = [
  {
    key: "aipc_guidelines_agreement",
    label: "We have gone through the AIPC guidelines thoroughly and agree to abide by the guidelines during the entire process of placement/internship activities. In case of violation of guidelines by us, we understand that an appropriate action may be taken on us as per AIPC guidelines.",
  },
  {
    key: "shortlisting_assurance",
    label: "We declare that we would be providing the shortlisting criteria along with the CV-shortlisted and/or Test-shortlisted candidates. We also assure that the details of final shortlisted candidates will be provided within the 24 to 48 hours after the written test.",
  },
  {
    key: "information_verification",
    label: "The information related to various job/intern profiles posted by us is verified and correct to the best of our knowledge, and the company will abide by the terms and conditions as outlined in these job/intern profiles posted while making the offers. No new clauses/ changes would be added/made in the final offer rolled out to the candidates selected on the profile(s). All details have already been outlined in the Job Notification Forms. In the event of any discrepancy in the final offers, the company may be subject to appropriate actions in accordance with the AIPC guidelines.",
  },
  {
    key: "sharing_consent",
    label: "We consent to sharing of company name, logo and email with national ranking agencies and government directives, and to listing company names in social media platforms and press/media.",
  },
  {
    key: "final_confirmation",
    label: "I/We confirm that the information pertaining to the posted job profile is accurate and verified to the best of our knowledge. The company commits to adhere to the terms and conditions outlined in these job profiles while extending offers. No additional clauses or changes will be introduced in the final offers extended to the candidates selected for the respective profiles. All relevant details have been clearly outlined in the Job Notification Form. In the event of any discrepancies in the final offers, the company will be subject to strict action as per the AIPC guidelines.",
  },
];

export const aipcGuidelineItems = infAipcGuidelineItems; // Default fallback

export const stageDurationOptions = [
  "15 mins",
  "30 mins",
  "45 mins",
  "1 hour",
  "Half day",
  "1 day",
  "2 days",
];

export const companyCountries = [
  "India",
  "United States",
  "United Kingdom",
  "Germany",
  "Singapore",
  "Canada",
  "Australia",
  "Japan",
  "Other",
];
