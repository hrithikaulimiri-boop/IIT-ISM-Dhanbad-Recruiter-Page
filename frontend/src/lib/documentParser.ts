import Tesseract from 'tesseract.js';
import mammoth from 'mammoth';
import { api } from './api';

// Use dynamic import for pdfjs to avoid SSR/Worker issues if possible, 
// but for a simple script, we'll try a basic approach.
// Note: pdfjs-dist usually requires a worker script.

export interface ExtractedData {
  profile_name?: string;
  job_designation?: string;
  description?: string;
  location?: string;
  place_of_posting?: string;
  work_mode?: string;
  expected_hires?: string;
  min_hires?: string;
  joining_month?: string;
  required_skills?: string[];
  training_period?: string;
  bond?: string;
  registration_link?: string;
  onboarding_procedure?: string;
  additional_info?: string;
  job_categories?: string[];
  has_psychometric_test?: boolean;
  has_medical_test?: boolean;
  other_screening_details?: string;
  ppo_provision?: string;
  salary?: {
    currency?: string;
    ctc_lpa?: number;
    fixed_component?: number;
    variable_component?: number;
    stipend?: number;
    internship_duration?: string;
    joining_bonus?: number;
    retention_bonus?: number;
    bond_deductions?: number;
    esops?: number;
    relocation_allowance?: number;
    monthly_take_home?: number;
    different_structure_per_programme?: boolean;
    salaries_json?: any[];
  };
  eligibility?: {
    global_min_cgpa?: number;
    global_allow_backlogs?: boolean;
    global_max_backlogs?: number;
    high_school_percentage?: string;
    gender_filter?: string;
    degrees?: string[];
    disciplines?: string[];
    disciplines_json?: any[];
  };
  declaration?: {
    authorised_signatory_name?: string;
    authorised_signatory_designation?: string;
    authorised_signatory_date?: string;
    typed_signature?: string;
  };
  stages?: Array<{
    name: string;
    duration?: string;
    selection_mode?: string;
    interview_mode?: string;
  }>;
}

/**
 * Service to handle document parsing via Tesseract.js (ML-based OCR)
 * and backend NLP analysis.
 */
export const parseDocument = async (file: File, session: any): Promise<ExtractedData> => {
  try {
    const token = session?.accessToken || session?.user?.accessToken;
    if (!token) throw new Error("No authentication token found.");

    let text = "";
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // 1. Text Extraction Step based on file type
    if (fileType === "text/plain" || fileName.endsWith(".txt")) {
      text = await file.text();
    } 
    else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith(".docx")) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } 
    else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      // PDF handling via pdfjs-dist (simplistic version for client-side)
      const pdfjsLib = await import('pdfjs-dist');
      // Set worker source for pdfjs
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      text = fullText;

      // If text extraction failed (e.g. image-only PDF), fall back to OCR
      if (!text.trim()) {
        const { data: { text: ocrText } } = await Tesseract.recognize(file, 'eng');
        text = ocrText;
      }
    } 
    else if (fileType.startsWith("image/")) {
      const { data: { text: ocrText } } = await Tesseract.recognize(file, 'eng');
      text = ocrText;
    } 
    else {
      // Fallback: try OCR if it's something else
      const { data: { text: ocrText } } = await Tesseract.recognize(file, 'eng');
      text = ocrText;
    }

    if (!text || text.trim().length < 10) {
      throw new Error('Could not extract enough text from the document.');
    }

    // 2. Analysis Step: Send text to backend AI/NLP parser
    const response = await api.post('/documents/parse', 
      { text },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data.data;
  } catch (error) {
    console.error('Document parsing failed:', error);
    throw error;
  }
};
