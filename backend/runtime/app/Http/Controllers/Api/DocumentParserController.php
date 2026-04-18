<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DocumentParserController extends Controller
{
    /**
     * Parse text extracted from documents using a "Smart NLP-based" approach.
     * This simulates an ML model for field extraction.
     */
    public function parse(Request $request)
    {
        $text = $request->input('text', '');
        if (empty($text)) {
            return response()->json(['message' => 'No text provided for parsing.'], 400);
        }

        $fields = $this->extractFields($text);

        return response()->json([
            'success' => true,
            'data' => $fields,
            'message' => 'Data extracted successfully using AI parser.'
        ]);
    }

    private function extractFields($text)
    {
        // 1. Pre-process text: normalize and structure
        $lines = explode("\n", $text);
        $trimmedLines = array_map(fn($l) => trim($l), $lines);
        $normalizedText = implode("\n", $trimmedLines);

        $fields = [
            'profile_name' => null,
            'job_designation' => null,
            'description' => null,
            'location' => null,
            'place_of_posting' => null,
            'work_mode' => 'offline',
            'expected_hires' => null,
            'min_hires' => null,
            'joining_month' => null,
            'required_skills' => [],
            'training_period' => null,
            'bond' => null,
            'registration_link' => null,
            'onboarding_procedure' => null,
            'additional_info' => null,
            'job_categories' => ['Technical'],
            'has_psychometric_test' => false,
            'has_medical_test' => false,
            'other_screening_details' => null,
            'ppo_provision' => null,
            'salary' => [
                'currency' => 'INR',
                'ctc_lpa' => null,
                'fixed_component' => null,
                'variable_component' => null,
                'stipend' => null,
                'internship_duration' => null,
                'joining_bonus' => null,
                'retention_bonus' => null,
                'bond_deductions' => null,
                'esops' => null,
                'relocation_allowance' => null,
                'monthly_take_home' => null,
                'different_structure_per_programme' => false,
                'salaries_json' => [],
                'additional_components' => [
                    'global' => [
                        'joining_bonus' => "",
                        'retention_bonus' => "",
                        'bond_deductions' => "",
                        'esops_vest_period' => "",
                        'relocation_allowance' => "",
                        'hra' => ""
                    ]
                ]
            ],
            'eligibility' => [
                'global_min_cgpa' => "0.0",
                'global_allow_backlogs' => false,
                'global_max_backlogs' => "0",
                'high_school_percentage' => "0",
                'gender_filter' => 'All',
                'disciplines_json' => [],
                'degrees' => [],
                'disciplines' => []
            ],
            'declaration' => [
                'agreed' => false,
                'rti_nirf_consent' => false,
                'authorised_signatory_name' => "",
                'authorised_signatory_designation' => "",
                'authorised_signatory_date' => date('Y-m-d'),
                'typed_signature' => "",
                'aipc_guidelines' => []
            ],
            'stages' => []
        ];

        // VAST Labels and Synonyms for Unstructured Data
        // Order by length DESC to match most specific labels first
        $labels = [
            'Job Designation', 'Job Description', 'Expected Number of Hires', 'Minimum Number of Hires',
            'Tentative Joining Month', 'Work Location Mode', 'Internship Description', 'Roles & Responsibilities',
            'Post-Internship Offer', 'Service Agreement', 'Authorised Signatory Name', 'Designation of Signatory',
            'Date of Declaration', 'Onboarding Procedure', 'Recruitment Workflow', 'Total Compensation',
            'Additional Job Info', 'Internship Duration', 'Eligibility Criteria', 'Academic Criteria',
            'Screening Details', 'Psychometric Test', 'Pre-Placement Offer', 'Place of Posting',
            'Notification Type', 'Required Skills', 'Important Details', 'Official Designation',
            'Registration Link', 'Application Review', 'Hiring Procedure', 'Selection Process',
            'Additional Info', 'Expected Joining', 'Work Location', 'Training Period',
            'Probation Period', 'Application Link', 'Expected Duration', 'Performance Bonus', 'Performance Pay', 'Variable Pay', 'Incentives',
            'Monthly Take Home', 'Monthly In-hand', 'Relocation Allowance', 'Annual CTC',
            'HRA', 'House Rent Allowance', 'Housing Allowance', 'Housing', 'Perks', 'Other Perks',
            'Eligibility', 'Criteria', 'Degrees', 'Disciplines', 'Academic', 'Requirements',
            'Min CGPA', 'CGPA Cutoff', 'Max Backlogs', 'Medical Test', 'Medical Exam',
            'Internship Title', 'Formal Title', 'Designated as', 'Work Mode', 'Type of Work',
            'Minimum Hires', 'Expected Hires', 'Joining Month', 'Joining Date', 'Start Date',
            'Job Profile', 'Job Title', 'Job Site', 'Remote/Onsite', 'Work Type', 'Vacancies',
            'Openings', 'Bond Details', 'Apply Link', 'External Link', 'PPO Provision',
            'Description', 'Designation', 'Environment', 'Commencement', 'Responsibilities',
            'Technologies', 'Must-haves', 'PPO Details', 'Agreement', 'Contract', 'Commitment',
            'Obligation', 'Procedure', 'Hiring Process', 'Salary', 'Remuneration', 'Compensation',
            'Total Package', 'Fixed Pay', 'Base Salary', 'Monthly Stipend', 'Pocket Money',
            'Variable Pay', 'Incentives', 'Other Perks', 'Cut-off', 'Training', 'Probation',
            'Duration', 'Assessments', 'Evaluations', 'Declared By', 'Signature', 'Profile',
            'Title', 'Role', 'Position', 'Location', 'Posting', 'Base', 'City', 'Area', 'Region',
            'Mode', 'Seats', 'Count', 'Skills', 'Stack', 'Stack', 'Notes', 'Remarks', 'PPO',
            'Bond', 'Link', 'URL', 'Portal', 'CTC', 'Package', 'Stipend', 'HRA', 'Housing',
            'Bonus', 'Perks', 'CGPA', 'Tests', 'Stage', 'Date', 'Name', 'Job Name'
        ];

        // Ensure longer strings come first to avoid partial matching
        usort($labels, fn($a, $b) => strlen($b) - strlen($a));

        $labelPattern = '(?:\b' . implode('\b|\b', array_map(fn($l) => preg_quote($l, '/'), $labels)) . '\b)';

        // 1. Profile Name & Designation
        if (preg_match('/(?:\bJob Profile\b|\bProfile\b|\bRole\b|\bTitle\b|\bInternship Title\b|\bPosition\b|\bNotification Type\b|\bJob Name\b|\bJob\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $val = $this->cleanValue($matches[1]);
            // Avoid matching generic "Name" if it's clearly just a label artifact
            if (strtolower($val) !== 'name') {
                $fields['profile_name'] = $val;
            }
        }
        if (empty($fields['profile_name']) && preg_match('/^Name\s*[:\-]\s*(.+?)(?=\s*' . $labelPattern . '|$)/im', $normalizedText, $matches)) {
            $fields['profile_name'] = $this->cleanValue($matches[1]);
        }
        if (preg_match('/(?:\bJob Designation\b|\bDesignation\b|\bFormal Title\b|\bDesignated as\b|\bOfficial Designation\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['job_designation'] = $this->cleanValue($matches[1]);
        }

        // Mutual Fallback
        if (empty($fields['profile_name']) && !empty($fields['job_designation'])) {
            $fields['profile_name'] = $fields['job_designation'];
        }
        if (empty($fields['job_designation']) && !empty($fields['profile_name'])) {
            $fields['job_designation'] = $fields['profile_name'];
        }

        // 2. Location & Place of Posting
        if (preg_match('/(?:\bLocation\b|\bPlace of Posting\b|\bPosting\b|\bBase\b|\bWork Location\b|\bCity\b|\bJob Site\b|\bArea\b|\bRegion\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $loc = $this->cleanValue($matches[1]);
            $fields['location'] = $loc;
            $fields['place_of_posting'] = $loc;
        }

        // 3. Work Mode
        if (preg_match('/(?:\bWork Mode\b|\bMode\b|\bEnvironment\b|\bWork Location Mode\b|\bType of Work\b|\bRemote\/Onsite\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $mode = strtolower($this->cleanValue($matches[1]));
            if (str_contains($mode, 'on-site') || str_contains($mode, 'office') || str_contains($mode, 'offline') || str_contains($mode, 'on campus') || str_contains($mode, 'in person')) {
                $fields['work_mode'] = 'offline';
            } elseif (str_contains($mode, 'remote') || str_contains($mode, 'online') || str_contains($mode, 'work from home') || str_contains($mode, 'wfh')) {
                $fields['work_mode'] = 'online';
            } elseif (str_contains($mode, 'hybrid') || str_contains($mode, 'flexible')) {
                $fields['work_mode'] = 'hybrid';
            }
        }

        // 4. Hires
        if (preg_match('/(?:\bExpected Number of Hires\b|\bExpected Hires\b|\bVacancies\b|\bOpenings\b|\bSeats\b|\bCount\b)\s*[:\-]?\s*(\d+)/i', $normalizedText, $matches)) {
            $fields['expected_hires'] = $matches[1];
        }
        if (preg_match('/(?:\bMinimum Number of Hires\b|\bMin Hires\b|\bMinimum Hires\b)\s*[:\-]?\s*(\d+)/i', $normalizedText, $matches)) {
            $fields['min_hires'] = $matches[1];
        }

        // 5. Joining Month
        if (preg_match('/(?:\bTentative Joining Month\b|\bJoining Month\b|\bJoining Date\b|\bJoining\b|\bExpected Joining\b|\bStart Date\b|\bCommencement\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['joining_month'] = $this->cleanValue($matches[1]);
        }

        // 6. Salary Details
        $ctcLabels = ['Annual CTC', 'Total Package', 'Total Compensation', 'Remuneration', 'Compensation', 'Package', 'Salary', 'CTC'];
        usort($ctcLabels, fn($a, $b) => strlen($b) - strlen($a));
        $ctcPattern = '/(?:\b' . implode('\b|\b', array_map(fn($l) => preg_quote($l, '/'), $ctcLabels)) . '\b)\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([\d\.,k\-\s]*[\d]+[\d\.,k\-\s]*(?:LPA|Lakhs|Lac|L|Cr)?)/i';
        if (preg_match($ctcPattern, $normalizedText, $matches)) {
            $fields['salary']['ctc_lpa'] = $this->cleanNumber($matches[1]);
        }

        $fixedLabels = ['Fixed Component', 'Base Salary', 'Base Stipend', 'Internship Pay', 'Monthly Pay', 'Fixed Pay', 'Fixed', 'Base'];
        usort($fixedLabels, fn($a, $b) => strlen($b) - strlen($a));
        $fixedPattern = '/(?:\b' . implode('\b|\b', array_map(fn($l) => preg_quote($l, '/'), $fixedLabels)) . '\b)\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([\d\.,k\-\s]*[\d]+[\d\.,k\-\s]*)/i';
        if (preg_match($fixedPattern, $normalizedText, $matches)) {
            $val = $this->cleanNumber($matches[1]);
            $fields['salary']['fixed_component'] = $val;
            $fields['salary']['stipend'] = $val;
        }

        $stipendLabels = ['Monthly Stipend', 'Internship Stipend', 'Stipend Amount', 'Stipend Details', 'Pocket Money', 'Stipend'];
        usort($stipendLabels, fn($a, $b) => strlen($b) - strlen($a));
        $stipendPattern = '/(?:\b' . implode('\b|\b', array_map(fn($l) => preg_quote($l, '/'), $stipendLabels)) . '\b)\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([\d\.,k\-\s]*[\d]+[\d\.,k\-\s]*)/i';
        if (preg_match($stipendPattern, $normalizedText, $matches)) {
            $fields['salary']['stipend'] = $this->cleanNumber($matches[1]);
        }

        if (preg_match('/(?:\bVariable Pay\b|\bVariable Component\b|\bVariable\b|\bBonus\b|\bIncentives\b|\bPerformance Bonus\b|\bPerformance Pay\b)\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([\d\.,k\-\s]+)/i', $normalizedText, $matches)) {
            $fields['salary']['variable_component'] = $this->cleanNumber($matches[1]);
        }
        if (preg_match('/(?:\bHRA\b|\bHouse Rent Allowance\b|\bHousing Allowance\b|\bHousing\b)\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([\d\.,k\-\s]+)/i', $normalizedText, $matches)) {
            $val = $this->cleanNumber($matches[1]);
            $fields['salary']['additional_components']['global']['hra'] = (string)$val;
        }
        if (preg_match('/(?:\bOther Perks\b|\bPerks\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['additional_info'] .= "\nPerks: " . $this->cleanValue($matches[1]);
        }
        if (preg_match('/(?:\bJoining Bonus\b|\bSign-on Bonus\b|\bOne-time Bonus\b)\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([\d\.,k\-\s]+)/i', $normalizedText, $matches)) {
            $val = $this->cleanNumber($matches[1]);
            $fields['salary']['joining_bonus'] = $val;
            $fields['salary']['additional_components']['global']['joining_bonus'] = (string)$val;
        }
        if (preg_match('/(?:\bRetention Bonus\b|\bStay Bonus\b)\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([\d\.,k\-\s]+)/i', $normalizedText, $matches)) {
            $val = $this->cleanNumber($matches[1]);
            $fields['salary']['retention_bonus'] = $val;
            $fields['salary']['additional_components']['global']['retention_bonus'] = (string)$val;
        }
        if (preg_match('/(?:\bMonthly Take Home\b|\bMonthly In-hand\b|\bTake Home\b)\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([\d\.,k\-\s]+)/i', $normalizedText, $matches)) {
            $fields['salary']['monthly_take_home'] = $this->cleanNumber($matches[1]);
        }
        if (preg_match('/(?:\bRelocation Allowance\b|\bRelocation\b)\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([\d\.,k\-\s]+)/i', $normalizedText, $matches)) {
            $val = $this->cleanNumber($matches[1]);
            $fields['salary']['relocation_allowance'] = $val;
            $fields['salary']['additional_components']['global']['relocation_allowance'] = (string)$val;
        }
        if (preg_match('/(?:\bInternship Duration\b|\bDuration\b|\bPeriod\b|\bExpected Duration\b|\bTimeframe\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['salary']['internship_duration'] = $this->cleanValue($matches[1]);
        }

        // 7. Eligibility - CGPA & Backlogs
        if (preg_match('/(?:\bMin CGPA\b|\bMinimum CGPA\b|\bCGPA Cutoff\b|\bCGPA\b|\bCut-off\b|\bAcademic Criteria\b|\bEligibility Criteria\b)\s*[:\-]?\s*(?:greater than|>|>=|above|min|minimum)?\s*([\d\.]+)/i', $normalizedText, $matches)) {
            $fields['eligibility']['global_min_cgpa'] = rtrim($matches[1], '.');
        }
        if (preg_match('/(?:\bBacklogs Allowed\b|\bAllow Backlogs\b|\bBacklogs\b)\s*[:\-]?\s*(Yes|No|True|False|Allowed|Not Allowed)/i', $normalizedText, $matches)) {
            $val = strtolower($matches[1]);
            $fields['eligibility']['global_allow_backlogs'] = str_contains($val, 'yes') || str_contains($val, 'true') || str_contains($val, 'allowed') && !str_contains($val, 'not');
        }
        if (preg_match('/(?:\bMax Backlogs\b|\bMaximum Backlogs\b|\bNumber of Backlogs\b)\s*[:\-]?\s*(\d+)/i', $normalizedText, $matches)) {
            $fields['eligibility']['global_max_backlogs'] = $matches[1];
        }

        // 8. Degree & Discipline Mapping (Heuristics)
        $degreeMap = [
            'B\.?\s*Tech' => 'B.Tech / Dual Degree (JEE Advanced)',
            'Bachelor of Technology' => 'B.Tech / Dual Degree (JEE Advanced)',
            'Dual\s*Degree' => 'B.Tech / Dual Degree (JEE Advanced)',
            'Integrated\s*M\.?\s*Tech' => 'Integrated M.Tech (JEE Advanced)',
            'M\.?\s*Tech' => 'M.Tech GATE (2-year)',
            'Master of Technology' => 'M.Tech GATE (2-year)',
            'M\.?\s*Sc' => 'M.Sc JAM (2-yr)',
            'Master of Science' => 'M.Sc JAM (2-yr)',
            'MBA' => 'MBA (CAT)',
            'Master of Business Administration' => 'MBA (CAT)',
            'PhD' => 'PhD (GATE/NET)',
            'Doctor of Philosophy' => 'PhD (GATE/NET)',
            'M\.?\s*A\.?' => 'M.A. Digital Humanities & Social Sciences',
        ];
        foreach ($degreeMap as $pattern => $full) {
            if (preg_match("/\b" . $pattern . "\b/i", $normalizedText)) {
                if (!in_array($full, $fields['eligibility']['degrees'])) {
                    $fields['eligibility']['degrees'][] = $full;
                }
            }
        }

        // Expanded Discipline Mapping
        $disciplineMap = [
            'Computer\s*Science' => 'Computer Science & Engineering',
            'CSE' => 'Computer Science & Engineering',
            'Electrical' => 'Electrical Engineering',
            'EE' => 'Electrical Engineering',
            'Electronics' => 'Electronics & Communication Engineering',
            'ECE' => 'Electronics & Communication Engineering',
            'Mechanical' => 'Mechanical Engineering',
            'ME' => 'Mechanical Engineering',
            'Civil' => 'Civil Engineering',
            'CE' => 'Civil Engineering',
            'Chemical' => 'Chemical Engineering',
            'Mining' => 'Mining Engineering',
            'Petroleum' => 'Petroleum Engineering',
            'Mathematics' => 'Mathematics & Computing',
            'Maths' => 'Mathematics & Computing',
            'Data\s*Analytics' => 'Data Analytics',
            'Business\s*Analytics' => 'Business Analytics',
            'Physics' => 'Physics',
            'Chemistry' => 'Chemistry',
            'Geology' => 'Applied Geology',
            'Geophysics' => 'Applied Geophysics',
        ];
        foreach ($disciplineMap as $pattern => $full) {
            if (preg_match("/\b" . $pattern . "\b/i", $normalizedText)) {
                if (!in_array($full, $fields['eligibility']['disciplines'])) {
                    $fields['eligibility']['disciplines'][] = $full;
                }
            }
        }

        // 9. Skills & Categories
        if (preg_match('/(?:\bRequired Skills\b|\bSkills\b|\bTechnologies\b|\bStack\b|\bProficiency\b|\bRequirements\b|\bPrerequisites\b|\bDesired Skills\b|\bMust-haves\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $skillsRaw = $this->cleanValue($matches[1]);
            $skills = preg_split('/[,;|]|\band\b/i', $skillsRaw);
            $fields['required_skills'] = array_filter(array_map(fn($s) => trim($s, " \t\n\r\0\x0B-"), $skills));
        }

        // 10. Bond & Training
        if (preg_match('/(?:\bBond Details\b|\bBond\b|\bService Agreement\b|\bAgreement\b|\bContract\b|\bCommitment\b|\bService Bond\b|\bObligation\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['bond'] = $this->cleanValue($matches[1]);
        }
        if (preg_match('/(?:\bTraining Period\b|\bTraining\b|\bProbation Period\b|\bProbation\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['training_period'] = $this->cleanValue($matches[1]);
        }

        // 11. Links & Additional Info
        if (preg_match('/(?:\bRegistration Link\b|\bApply Link\b|\bLink\b|\bURL\b|\bExternal Link\b|\bPortal\b|\bApplication Link\b)\s*[:\-]?\s*(https?:\/\/[^\s]+)/i', $normalizedText, $matches)) {
            $fields['registration_link'] = trim($matches[1]);
        }
        if (preg_match('/(?:\bAdditional Info\b|\bAdditional Job Info\b|\bNotes\b|\bComments\b|\bRemarks\b|\bOther Information\b|\bImportant Details\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['additional_info'] = $this->cleanValue($matches[1]);
        }
        if (preg_match('/(?:\bPPO Provision\b|\bPPO\b|\bPre-Placement Offer\b|\bPost-Internship Offer\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['ppo_provision'] = $this->cleanValue($matches[1]);
        }

        // 12. Block Extraction (Description & Onboarding)
        if (preg_match('/(?:\bJob Description\b|\bDescription\b|\bJD\b|\bInternship Description\b|\bScope of Work\b|\bResponsibilities\b|\bRoles & Responsibilities\b|\bSummary\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['description'] = $this->cleanValue($matches[1]);
        }
        if (preg_match('/(?:\bOnboarding Procedure\b|\bSelection Process\b|\bOnboarding\b|\bProcedure\b|\bHiring Process\b|\bRecruitment Workflow\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['onboarding_procedure'] = $this->cleanValue($matches[1]);
        }

        // 13. Declaration
        if (preg_match('/(?:\bAuthorised Signatory Name\b|\bAuthorised Name\b|\bSignatory Name\b|\bName of Signatory\b|\bDeclared By\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['declaration']['authorised_signatory_name'] = $this->cleanValue($matches[1]);
            $fields['declaration']['typed_signature'] = $fields['declaration']['authorised_signatory_name'];
        }
        if (preg_match('/(?:\bDesignation of Signatory\b|\bSignatory Designation\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['declaration']['authorised_signatory_designation'] = $this->cleanValue($matches[1]);
        }

        // 14. Screening Tests
        if (preg_match('/(?:\bPsychometric Test\b|\bPsychometric\b|\bEvaluations\b|\bAssessments\b)\s*[:\-]?\s*(Yes|No|True|False|Required|Not Required)/i', $normalizedText, $matches)) {
            $val = strtolower($matches[1]);
            $fields['has_psychometric_test'] = str_contains($val, 'yes') || str_contains($val, 'true') || str_contains($val, 'required') && !str_contains($val, 'not');
        }
        if (preg_match('/(?:\bMedical Test\b|\bMedical Exam\b|\bPhysical\b)\s*[:\-]?\s*(Yes|No|True|False|Required|Not Required)/i', $normalizedText, $matches)) {
            $val = strtolower($matches[1]);
            $fields['has_medical_test'] = str_contains($val, 'yes') || str_contains($val, 'true') || str_contains($val, 'required') && !str_contains($val, 'not');
        }
        if (preg_match('/(?:\bOther Screening\b|\bScreening Details\b|\bTests\b|\bEvaluations\b)\s*[:\-]?\s*(.+?)(?=\s*' . $labelPattern . '|$)/is', $normalizedText, $matches)) {
            $fields['other_screening_details'] = $this->cleanValue($matches[1]);
        }

        // 15. Hiring Stages Extraction (Vast Aliases)
        $stageNames = [
            'Pre-Placement Talk' => ['PPT', 'Talk', 'Presentation', 'Orientation', 'Seminar', 'Pre-Placement Talk'],
            'Resume Shortlisting' => ['Shortlisting', 'CV Screening', 'Profile Review', 'Application Review', 'Resume Shortlisting'],
            'Online/Written Test' => ['Written Test', 'Coding Test', 'Aptitude Test', 'Technical Test', 'Assessment', 'Exam', 'Hackathon', 'Online Test', 'Online/Written Test'],
            'Group Discussion' => ['GD', 'Group Discussion', 'Panel Discussion', 'Case Study'],
            'Personal/Technical Interview' => ['Interview', 'Technical Interview', 'HR Interview', 'Viva', 'Face to Face', 'Interaction', 'Personal/Technical Interview'],
            'Any Other Round' => ['Other Round', 'Psychometric', 'Medical', 'Final Round', 'Managerial Round', 'Any Other Round'],
        ];

        $foundStages = [];
        foreach ($stageNames as $fullName => $aliases) {
            foreach ($aliases as $alias) {
                if (preg_match("/\b" . preg_quote($alias, '/') . "\b/i", $normalizedText)) {
                    // Try to extract duration
                    $duration = "1 hour"; // Default from FE
                    if (preg_match("/" . preg_quote($alias, '/') . ".*?(15\s*mins|30\s*mins|45\s*mins|1\s*hour|Half\s*day|1\s*day|2\s*days)/i", $normalizedText, $dMatches)) {
                        $duration = strtolower($dMatches[1]);
                        // Normalize duration to FE options
                        if (str_contains($duration, '15')) $duration = "15 mins";
                        elseif (str_contains($duration, '30')) $duration = "30 mins";
                        elseif (str_contains($duration, '45')) $duration = "45 mins";
                        elseif (str_contains($duration, 'half')) $duration = "Half day";
                        elseif (str_contains($duration, '1 day')) $duration = "1 day";
                        elseif (str_contains($duration, '2 day')) $duration = "2 days";
                        else $duration = "1 hour";
                    }
                    
                    $foundStages[] = [
                        'stage_id' => (string)(count($foundStages) + 1),
                        'sequence' => (string)(count($foundStages) + 1),
                        'name' => $fullName,
                        'duration' => $duration,
                        'selection_mode' => 'Offline',
                        'interview_mode' => 'On-campus',
                    ];
                    break; // Move to next stage type
                }
            }
        }
        $fields['stages'] = $foundStages;

        return $fields;
    }

    private function cleanValue($str)
    {
        // Remove leading/trailing junk including common OCR artifacts
        $val = trim($str, " \t\n\r\0\x0B-:*_#/");
        
        // Remove common labels that might have been accidentally caught if not in lookahead
        // This is a safety net in case the lookahead in the main regex misses something
        $val = preg_replace('/^(?:Job Profile|Profile|Role|Title|Job Name|Designation|Location|Location Mode|Description|Hires|Expected Hires|Minimum Hires|Joining Month|PPO Provision|Bond Details|Onboarding Procedure|Required Skills|Skills|Additional Info|CTC|Package|Salary|Stipend|Bonus|Name)[:\- \t\/]*/i', '', $val);
        
        // Remove common "junk" at the end of the string that might be part of the next label
        $val = preg_replace('/\s+[:\-]+$/', '', $val);
        
        return trim($val, " \t\n\r\0\x0B-:*_#/");
    }

    private function cleanNumber($str)
    {
        // Handle ranges like "10-15 LPA" or "10 to 15" - take the higher end
        if (preg_match('/(?:[\d\.,k]+)\s*(?:-|to|until)\s*([\d\.,k]+)/i', $str, $m)) {
            $str = $m[1];
        }

        $val = strtolower(trim($str));
        $multiplier = 1;
        
        // Handle 'k' notation (e.g., 50k -> 50000)
        if (str_ends_with($val, 'k')) {
            $multiplier = 1000;
            $val = substr($val, 0, -1);
        }
        
        // Remove all non-numeric characters except decimal point
        $val = preg_replace('/[^\d\.]/', '', $val);
        
        if (is_numeric($val) && strlen($val) > 0) {
            $num = (float)$val * $multiplier;
            return $num;
        }
        
        return null;
    }
}
