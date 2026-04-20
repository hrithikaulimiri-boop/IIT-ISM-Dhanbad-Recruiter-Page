<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DocumentParserController extends Controller
{
    public function parse(Request $request)
    {
        try {
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
        } catch (\Exception $e) {
            Log::error('Document parsing error: ' . $e->getMessage(), [
                'exception' => $e,
                'text_preview' => substr($request->input('text', ''), 0, 500)
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Internal server error during parsing: ' . $e->getMessage()
            ], 500);
        }
    }

    private function extractFields($text)
    {
        $fields = $this->getDefaultFields();

        // Normalize text
        $normalizedText = preg_replace('/\s+/', ' ', trim($text));
        $lines = array_values(array_filter(array_map('trim', explode("\n", $text)), fn($l) => strlen($l) > 2));

        // ALWAYS extract from first few lines (usually contains role/title)
        $this->extractProfileFromLines($lines, $fields);

        // Extract sections for context-aware parsing
        $sections = $this->identifySections($text);

        // Extract from full text - Order matters, more specific first
        $this->extractLocation($normalizedText, $fields);
        $this->extractSalaryComponents($normalizedText, $fields, $sections);
        $this->extractHiresAndDuration($normalizedText, $fields);
        $this->extractJoiningMonth($normalizedText, $fields);
        $this->extractEligibility($normalizedText, $fields, $sections);
        $this->extractSkills($normalizedText, $fields);
        $this->extractDescription($text, $fields);
        $this->extractBondAndPPO($normalizedText, $fields);
        $this->extractRegistrationLink($normalizedText, $fields);
        $this->extractOnboarding($normalizedText, $fields);
        $this->extractStages($normalizedText, $fields);

        return $fields;
    }

    /**
     * Identify major sections in the document for better context
     */
    private function identifySections($text)
    {
        $sections = [
            'eligibility' => '',
            'salary' => '',
            'description' => '',
            'skills' => '',
            'stages' => '',
        ];

        $patterns = [
            'eligibility' => '/(?:eligibility|target|qualification|criteria|branches|disciplines|courses|target\s*audience|who\s*can\s*apply|eligible\s*students)/i',
            'salary' => '/(?:salary|package|ctc|stipend|compensation|remuneration|pay|benefits|perks)/i',
            'description' => '/(?:description|responsibilities|roles?|about\s*the\s*job|summary)/i',
            'skills' => '/(?:skills|requirements|competencies|technologies|tools|stack)/i',
            'stages' => '/(?:stages|process|selection|hiring|rounds|interview|test)/i',
        ];

        $lines = explode("\n", $text);
        $currentSection = null;

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;

            $foundNewSection = false;
            foreach ($patterns as $section => $pattern) {
                if (preg_match($pattern, $line) && strlen($line) < 50) {
                    $currentSection = $section;
                    $foundNewSection = true;
                    break;
                }
            }

            if ($currentSection && !$foundNewSection) {
                $sections[$currentSection] .= $line . "\n";
            }
        }

        return $sections;
    }

    /**
     * Extract Profile Name from first few lines (most important)
     */
    private function extractProfileFromLines($lines, &$fields)
    {
        // Check first 15 lines for job title patterns
        $linesToCheck = array_slice($lines, 0, min(15, count($lines)));

        $jobTitleKeywords = [
            'engineer', 'developer', 'manager', 'analyst', 'consultant', 'intern', 'trainee', 
            'specialist', 'lead', 'architect', 'director', 'head', 'executive', 'officer', 
            'associate', 'software', 'backend', 'frontend', 'fullstack', 'data', 'qa', 'test', 
            'product', 'design', 'ui', 'ux', 'marketing', 'sales', 'business', 'operations', 
            'hr', 'finance', 'accounting', 'security', 'devops', 'cloud', 'system', 'research'
        ];

        foreach ($linesToCheck as $line) {
            $line = trim($line);

            // Skip very short lines or lines that look like headers/meta-data
            if (strlen($line) < 3) continue;
            
            // Stricter skip list for common headers that are NOT job titles
            if (preg_match('/^(?:company|about|description|skills|eligibility|salary|ctc|hr|recruitment|phone|email|www\.|http|date|venue|location|posting|job\s*description|job\s*id|reference|contact|candidate|qualification)/i', $line)) continue;

            // Try to find role/position patterns
            $patterns = [
                '/(?:role|position|profile|job\s*title|work\s*profile|designation|hiring\s*for)\s*[:\-]?\s*(.+)/i',
                '/(?:we\s*are\s*(?:hiring|looking\s*for)|seeking\s*(?:a|an)?)\s*(.+)/i',
                '/^(.+?(?:position|role|profile|opportunity))$/i',
            ];

            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $line, $m)) {
                    $candidate = trim($m[1]);
                    if ($this->isValidJobTitle($candidate)) {
                        $fields['profile_name'] = $this->cleanText($candidate);
                        break 2;
                    }
                }
            }

            // Look for capitalized lines that contain job keywords and are NOT too long
            if (preg_match('/[A-Z]/', $line) && strlen($line) < 60) {
                $hasKeyword = false;
                foreach ($jobTitleKeywords as $keyword) {
                    if (stripos($line, $keyword) !== false) {
                        $hasKeyword = true;
                        break;
                    }
                }
                if ($hasKeyword && !strpos($line, ':')) {
                    $fields['profile_name'] = $this->cleanText($line);
                    break;
                }
            }
        }

        // Fallback: if profile_name still empty, look for any line containing common job keywords in the first 10 lines
        if (empty($fields['profile_name'])) {
            foreach (array_slice($lines, 0, 10) as $line) {
                foreach ($jobTitleKeywords as $keyword) {
                    if (preg_match('/\b' . $keyword . '\b/i', $line) && strlen($line) < 50 && !strpos($line, ':')) {
                        $fields['profile_name'] = $this->cleanText($line);
                        break 2;
                    }
                }
            }
        }

        // Extract designation if mentioned separately
        foreach ($lines as $line) {
            if (preg_match('/(?:job\s*)?designation\s*[:\-]?\s*(.+)/i', $line, $m)) {
                $fields['job_designation'] = $this->cleanText($m[1]);
                break;
            }
        }
    }

    private function isValidJobTitle($title)
    {
        $title = trim($title);
        if (empty($title)) return false;
        if (strlen($title) < 3 || strlen($title) > 100) return false;
        if (!preg_match('/[a-zA-Z]/', $title)) return false;
        if (preg_match('/^(?:http|www|email|phone|date|time)/i', $title)) return false;
        return true;
    }

    /**
     * Extract Location
     */
    private function extractLocation($text, &$fields)
    {
        // Known cities
        $cities = ['bengaluru', 'bangalore', 'mumbai', 'delhi', 'chennai', 'hyderabad', 'pune', 'noida', 'gurgaon', 'kolkata', 'ahmedabad', 'jaipur', 'kochi', 'trivandrum', 'chandigarh', 'visakhapatnam', 'vijayawada', 'mysore', 'coimbatore', 'indore', 'lucknow', 'patna', 'ranchi', 'bhubaneswar'];

        $textLower = strtolower($text);

        // Find city mentions
        foreach ($cities as $city) {
            if (preg_match('/\b' . $city . '\b/i', $text, $m)) {
                $fields['location'] = ucfirst(strtolower($m[0]));
                $fields['place_of_posting'] = $fields['location'];
                break;
            }
        }

        // Work mode
        if (preg_match('/\b(wfh|work\s*from\s*home|remote|online)\b/i', $text, $m)) {
            $fields['work_mode'] = 'online';
        } elseif (preg_match('/\b(hybrid|flexible)\b/i', $text, $m)) {
            $fields['work_mode'] = 'hybrid';
        } elseif (preg_match('/\b(onsite|on[\s-]?site|office|in[\s-]?office)\b/i', $text, $m)) {
            $fields['work_mode'] = 'offline';
        }

        // Explicit location patterns
        if (preg_match('/location\s*[:\-]?\s*(.+?)(?=\s*(?:work\s*mode|mode|salary|ctc|job|$))/i', $text, $m)) {
            $fields['location'] = $this->cleanText($m[1]);
            $fields['place_of_posting'] = $fields['location'];
        }
    }

    /**
     * Extract ALL Salary Components
     */
    private function extractSalaryComponents($text, &$fields, $sections = [])
    {
        // Use salary section if available for better precision
        $salaryText = !empty($sections['salary']) ? $sections['salary'] : $text;
        $normalizedSalaryText = preg_replace('/\s+/', ' ', $salaryText);

        // Patterns for ranges (e.g., "10-12 LPA")
        $rangePattern = '/([\d\.]+)\s*[\-\sto]+\s*([\d\.]+)\s*(?:lpa|lakhs?|lac)\b/i';
        if (preg_match($rangePattern, $normalizedSalaryText, $m)) {
            $fields['salary']['ctc_lpa'] = $this->parseNumber($m[2]); // Take the higher end of the range
        }

        // CTC - Look for: "12 LPA", "CTC 12", "Package 15 Lacs", "Annual Package 20 LPA"
        if (empty($fields['salary']['ctc_lpa'])) {
            if (preg_match('/([\d\.]+)\s*(?:lpa|lakhs?|lac)\b/i', $normalizedSalaryText, $m)) {
                $fields['salary']['ctc_lpa'] = $this->parseNumber($m[1]);
            } elseif (preg_match('/ctc\s*[:\-]?\s*(?:inr\s*)?([\d\.]+)/i', $normalizedSalaryText, $m)) {
                $fields['salary']['ctc_lpa'] = $this->parseNumber($m[1]);
            } elseif (preg_match('/package\s*[:\-]?\s*(?:inr\s*)?([\d\.]+)/i', $normalizedSalaryText, $m)) {
                $fields['salary']['ctc_lpa'] = $this->parseNumber($m[1]);
            }
        }

        // STIPEND - Look for: "25000/month", "Stipend 20000", "Rs 15000 per month"
        if (preg_match('/([\d\,]+)\s*(?:\/|per)\s*month/i', $normalizedSalaryText, $m)) {
            $fields['salary']['stipend'] = $this->parseNumber($m[1]);
        } elseif (preg_match('/stipend\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $fields['salary']['stipend'] = $this->parseNumber($m[1]);
        }

        // FIXED / BASE PAY
        if (preg_match('/fixed\s*(?:pay|salary|component)?\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $fields['salary']['fixed_component'] = $this->parseNumber($m[1]);
        }

        // VARIABLE PAY / BONUS
        if (preg_match('/variable\s*(?:pay|bonus)?\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $val = $this->parseNumber($m[1]);
            $fields['salary']['variable_component'] = $val;
            $fields['salary']['additional_components']['global']['variable_performance_bonus'] = (string)$val;
        }

        // HRA
        if (preg_match('/hra\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $fields['salary']['additional_components']['global']['hra'] = (string)$this->parseNumber($m[1]);
        }

        // GROSS SALARY
        if (preg_match('/gross\s*(?:salary|pay)?\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $val = $this->parseNumber($m[1]);
            $fields['salary']['gross_salary'] = $val;
            $fields['salary']['additional_components']['global']['gross_salary'] = (string)$val;
        }

        // TAKE HOME
        if (preg_match('/(?:take\s*home|in[\s-]?hand)\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $fields['salary']['monthly_take_home'] = $this->parseNumber($m[1]);
        }

        // RETENTION BONUS
        if (preg_match('/retention\s*(?:bonus|amount)?\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $val = $this->parseNumber($m[1]);
            $fields['salary']['retention_bonus'] = $val;
            $fields['salary']['additional_components']['global']['retention_bonus'] = (string)$val;
        }

        // MEDICAL ALLOWANCE
        if (preg_match('/medical\s*(?:allowance|cover|insurance)?\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $val = $this->parseNumber($m[1]);
            $fields['salary']['medical_allowance'] = $val;
            $fields['salary']['additional_components']['global']['medical_allowance'] = (string)$val;
        }

        // RELOCATION
        if (preg_match('/relocation\s*(?:allowance|bonus)?\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $val = $this->parseNumber($m[1]);
            $fields['salary']['relocation_allowance'] = $val;
            $fields['salary']['additional_components']['global']['relocation_allowance'] = (string)$val;
        }

        // FIRST YEAR CTC
        if (preg_match('/first\s*year\s*ctc\s*[:\-]?\s*(?:inr\s*)?([\d\.]+)/i', $normalizedSalaryText, $m)) {
            $val = $this->parseNumber($m[1]);
            $fields['salary']['first_year_ctc'] = $val;
            $fields['salary']['additional_components']['global']['first_year_ctc'] = (string)$val;
        }

        // STOCKS / OPTIONS
        if (preg_match('/(?:stocks?|options?|rsu[s]?)\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $val = $this->parseNumber($m[1]);
            $fields['salary']['stocks_options'] = $val;
            $fields['salary']['additional_components']['global']['stocks_options'] = (string)$val;
        }

        // JOINING BONUS
        if (preg_match('/joining\s*bonus\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $val = $this->parseNumber($m[1]);
            $fields['salary']['joining_bonus'] = $val;
            $fields['salary']['additional_components']['global']['joining_bonus'] = (string)$val;
        }

        // ESOPs
        if (preg_match('/esop[s]?\s*[:\-]?\s*(?:inr\s*)?([\d\,]+)/i', $normalizedSalaryText, $m)) {
            $val = $this->parseNumber($m[1]);
            $fields['salary']['esops'] = $val;
            $fields['salary']['additional_components']['global']['esops_vest_period'] = (string)$val;
        }

        // CTC BREAKUP
        if (preg_match('/(?:ctc|salary|package)\s*breakup\s*[:\-]?\s*(.+?)(?=\s*(?:eligibility|skills|bond|$))/is', $salaryText, $m)) {
            $fields['salary']['ctc_breakup'] = $this->cleanText($m[1]);
            $fields['salary']['additional_components']['global']['ctc_breakup'] = $this->cleanText($m[1]);
        }
    }

    /**
     * Extract Hires and Duration
     */
    private function extractHiresAndDuration($text, &$fields)
    {
        // Expected Hires
        if (preg_match('/(\d+)\s*(?:vacancies?|openings?|positions?)/i', $text, $m)) {
            $fields['expected_hires'] = $m[1];
        } elseif (preg_match('/hiring\s*(\d+)/i', $text, $m)) {
            $fields['expected_hires'] = $m[1];
        } elseif (preg_match('/(\d+)\s*(?:roles?|jobs?|posts?)\s*(?:to\s*fill)?/i', $text, $m)) {
            $fields['expected_hires'] = $m[1];
        }

        // Minimum Hires
        if (preg_match('/minimum\s*(\d+)\s*(?:hires?|candidates?)/i', $text, $m)) {
            $fields['min_hires'] = $m[1];
        }

        // Duration / Period
        if (preg_match('/(\d+)\s*(months?|weeks?)/i', $text, $m)) {
            $fields['training_period'] = $m[1] . ' ' . ($m[2]);
            $fields['salary']['internship_duration'] = $fields['training_period'];
        } elseif (preg_match('/duration\s*[:\-]?\s*(\d+)\s*(months?|weeks?)/i', $text, $m)) {
            $fields['training_period'] = $m[1] . ' ' . ($m[2]);
            $fields['salary']['internship_duration'] = $fields['training_period'];
        }
    }

    /**
     * Extract Joining Month
     */
    private function extractJoiningMonth($text, &$fields)
    {
        // Look for month names with year
        if (preg_match('/\b((?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*\d{4})\b/i', $text, $m)) {
            $fields['joining_month'] = $m[1];
        } elseif (preg_match('/\b(\d{1,2}\/\d{4})\b/', $text, $m)) {
            $fields['joining_month'] = $m[1];
        } elseif (preg_match('/joining\s*(?:month|date)?\s*[:\-]?\s*(.+?)(?=\s*(?:at|$))/i', $text, $m)) {
            $fields['joining_month'] = $this->cleanText($m[1]);
        }
    }

    /**
     * Extract Eligibility - Degrees, Disciplines, CGPA, Backlogs
     */
    private function extractEligibility($text, &$fields, $sections = [])
    {
        // Use eligibility section if available
        $eligibilityText = !empty($sections['eligibility']) ? $sections['eligibility'] : $text;
        $normalizedEligText = preg_replace('/\s+/', ' ', $eligibilityText);

        // === CGPA / CPI / PERCENTAGE ===
        if (preg_match('/(?:min(?:imum)?\s*)?(?:cgpa|cpi)\s*[:\-]?\s*([\d\.]+)/i', $normalizedEligText, $m)) {
            $fields['eligibility']['global_min_cgpa'] = $m[1];
        } elseif (preg_match('/percentage\s*[:\-]?\s*([\d\.]+)/i', $normalizedEligText, $m)) {
            $fields['eligibility']['global_min_cgpa'] = (string)((float)$m[1] / 10);
        }

        // === BACKLOGS ===
        if (preg_match('/(\d+)\s*backlog[s]?/i', $normalizedEligText, $m)) {
            $fields['eligibility']['global_max_backlogs'] = $m[1];
            $fields['eligibility']['global_allow_backlogs'] = true;
        } elseif (preg_match('/no\s*backlog[s]?/i', $normalizedEligText, $m)) {
            $fields['eligibility']['global_allow_backlogs'] = false;
        }

        // === DEGREES ===
        $degreeMap = [
            'b.tech' => 'B.Tech / Dual Degree (JEE Advanced)',
            'b.e.' => 'B.Tech / Dual Degree (JEE Advanced)',
            'dual degree' => 'B.Tech / Dual Degree (JEE Advanced)',
            'integrated m.tech' => 'Integrated M.Tech (JEE Advanced)',
            'm.tech' => 'M.Tech GATE (2-year)',
            'm.sc' => 'M.Sc JAM (2-yr)',
            'mba' => 'MBA (CAT)',
            'ph.d' => 'PhD (GATE/NET)',
            'phd' => 'PhD (GATE/NET)',
        ];

        foreach ($degreeMap as $abbr => $full) {
            if (preg_match('/\b' . preg_quote($abbr, '/') . '\b/i', $normalizedEligText)) {
                if (!in_array($full, $fields['eligibility']['degrees'])) {
                    $fields['eligibility']['degrees'][] = $full;
                }
            }
        }

        // === DISCIPLINES / BRANCHES ===
        // Stricter mapping to avoid false positives like "chemical" in "chemical properties"
        $disciplineMap = [
            'computer science' => 'Computer Science & Engineering',
            'cse' => 'Computer Science & Engineering',
            'it' => 'Computer Science & Engineering',
            'information technology' => 'Computer Science & Engineering',
            'electrical' => 'Electrical Engineering',
            'ee' => 'Electrical Engineering',
            'electronics' => 'Electronics & Communication Engineering',
            'ece' => 'Electronics & Communication Engineering',
            'mechanical' => 'Mechanical Engineering',
            'me' => 'Mechanical Engineering',
            'civil' => 'Civil Engineering',
            'ce' => 'Civil Engineering',
            'chemical' => 'Chemical Engineering',
            'ch' => 'Chemical Engineering',
            'mining' => 'Mining Engineering',
            'petroleum' => 'Petroleum Engineering',
            'pe' => 'Petroleum Engineering',
            'mathematics & computing' => 'Mathematics & Computing',
            'data science' => 'Data Science',
            'biotechnology' => 'Biotechnology',
            'physics' => 'Physics',
            'chemistry' => 'Chemistry',
        ];

        // Only look for disciplines if they appear in a relevant context
        $relevantKeywords = ['branch', 'discipline', 'course', 'target', 'eligible', 'major', 'specialization', 'background'];
        $hasRelevantContext = false;
        foreach ($relevantKeywords as $kw) {
            if (stripos($normalizedEligText, $kw) !== false) {
                $hasRelevantContext = true;
                break;
            }
        }

        // If we are in the eligibility section, we are more lenient.
        // If not, we require explicit context or bullet points near the match.
        foreach ($disciplineMap as $abbr => $full) {
            $pattern = '/\b' . preg_quote($abbr, '/') . '(?:\s+engineering)?\b/i';
            
            // Use preg_match_all to find all occurrences
            if (preg_match_all($pattern, $eligibilityText, $matches, PREG_OFFSET_CAPTURE)) {
                foreach ($matches[0] as $match) {
                    $val = $match[0];
                    $pos = $match[1];

                    if (!empty($sections['eligibility'])) {
                        // In eligibility section, just match
                        if (!in_array($full, $fields['eligibility']['disciplines'])) {
                            $fields['eligibility']['disciplines'][] = $full;
                        }
                        continue;
                    }

                    // Not in eligibility section - check context
                    // 1. Check if it's bulleted (look back from pos)
                    $lookback = substr($eligibilityText, max(0, $pos - 10), 10);
                    $isBulleted = preg_match('/(?:^|[\n\r])\s*[\-\*\x{2022}\d\.]+\s*$/iu', $lookback);

                    // 2. Check local context for keywords
                    $start = max(0, $pos - 50);
                    $localContext = substr($eligibilityText, $start, 150);
                    $hasLocalContext = false;
                    foreach ($relevantKeywords as $kw) {
                        if (stripos($localContext, $kw) !== false) {
                            $hasLocalContext = true;
                            break;
                        }
                    }

                    if ($isBulleted || $hasLocalContext) {
                        if (!in_array($full, $fields['eligibility']['disciplines'])) {
                            $fields['eligibility']['disciplines'][] = $full;
                        }
                    }
                }
            }
        }
    }

    /**
     * Extract Skills
     */
    private function extractSkills($text, &$fields)
    {
        // Known tech skills to look for
        $knownSkills = [
            'Python', 'Java', 'JavaScript', 'C++', 'C', 'React', 'Angular', 'Vue', 'Node.js',
            'SQL', 'MongoDB', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Machine Learning',
            'ML', 'AI', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scala', 'Ruby', 'Go', 'Rust',
            'Swift', 'Kotlin', 'PHP', '.NET', 'C#', 'R', 'MATLAB', 'Excel', 'PowerBI', 'Tableau',
            'Git', 'Linux', 'Django', 'Flask', 'Spring', 'HTML', 'CSS', 'REST', 'GraphQL',
            'Microservices', 'Agile', 'Scrum', 'DevOps', 'Data Science', 'Analytics', ' Hadoop',
            'Spark', 'Kafka', 'Jenkins', 'Terraform', 'k8s', 'ReactJS', 'NodeJS', 'VueJS',
            'AngularJS', 'MySQL', 'PostgreSQL', 'Redis', 'ElasticSearch', 'Jira'
        ];

        foreach ($knownSkills as $skill) {
            // Use word boundary to avoid partial matches
            if (preg_match('/\b' . preg_quote($skill, '/') . '\b/i', $text)) {
                if (!in_array($skill, $fields['required_skills'])) {
                    $fields['required_skills'][] = $skill;
                }
            }
        }

        // Also try to extract from skills section if it exists
        if (preg_match('/skills?\s*[:\-]\s*(.+?)(?=\s*(?:eligibility|cgpa|experience|$))/is', $text, $m)) {
            $skillsRaw = $m[1];
            $parts = preg_split('/[,;|\+]|\band\b/', $skillsRaw);
            foreach ($parts as $part) {
                $skill = trim($part);
                if (strlen($skill) >= 2 && strlen($skill) <= 40 && !is_numeric($skill)) {
                    if (!in_array($skill, $fields['required_skills'])) {
                        $fields['required_skills'][] = $skill;
                    }
                }
            }
        }
    }

    /**
     * Extract Job Description
     */
    private function extractDescription($text, &$fields)
    {
        // Look for description/responsibilities section
        if (preg_match('/(?:job\s*)?(?:description|responsibilities?|roles?\s*(?:and|&)\s*responsibilities?|about\s*(?:the\s*)?(?:role|job|position)|internship\s*description)\s*[:\-]?\s*(.+?)(?=\s*(?:skills?|eligibility|cgpa|requirements?|perks?|benefits?|how\s*to\s*apply|$))/is', $text, $m)) {
            $fields['description'] = $this->cleanText($m[1]);
            return;
        }

        // Try to find the longest paragraph (likely description)
        $paragraphs = preg_split('/\n\s*\n/', $text);
        $description = '';
        foreach ($paragraphs as $para) {
            $para = trim($para);
            if (strlen($para) > strlen($description) && strlen($para) > 50) {
                // Skip if it looks like a header or list
                if (!preg_match('/^(?:skills?|cgpa|ctc|salary|eligibility|experience|qualification)/i', $para)) {
                    $description = $para;
                }
            }
        }

        if (!empty($description)) {
            $fields['description'] = $this->cleanText($description);
        }
    }

    /**
     * Extract Bond and PPO
     */
    private function extractBondAndPPO($text, &$fields)
    {
        // Bond
        if (preg_match('/bond\s*[:\-]?\s*(.+?)(?=\s*(?:ppo|registration|eligibility|$))/is', $text, $m)) {
            $fields['bond'] = $this->cleanText($m[1]);
            $fields['salary']['additional_components']['global']['bond_amount_duration'] = $this->cleanText($m[1]);
        } elseif (preg_match('/(?:service|training)\s*agreement\s*[:\-]?\s*(.+?)(?=\s*(?:ppo|registration|$))/is', $text, $m)) {
            $fields['bond'] = $this->cleanText($m[1]);
            $fields['salary']['additional_components']['global']['bond_amount_duration'] = $this->cleanText($m[1]);
        }

        // PPO
        if (preg_match('/ppo\s*[:\-]?\s*(.+?)(?=\s*(?:bond|registration|eligibility|$))/is', $text, $m)) {
            $fields['ppo_provision'] = $this->cleanText($m[1]);
        } elseif (preg_match('/pre[\s-]?placement\s*offer\s*[:\-]?\s*(.+?)(?=\s*(?:bond|registration|$))/is', $text, $m)) {
            $fields['ppo_provision'] = $this->cleanText($m[1]);
        }
    }

    /**
     * Extract Registration Link
     */
    private function extractRegistrationLink($text, &$fields)
    {
        if (preg_match('/(https?:\/\/[^\s]+)/i', $text, $m)) {
            $fields['registration_link'] = trim($m[1]);
        }

        // Also check for apply link text
        if (preg_match('/apply\s*(?:at|link|url)?\s*[:\-]?\s*(https?:\/\/[^\s]+)/i', $text, $m)) {
            $fields['registration_link'] = trim($m[1]);
        }
    }

    /**
     * Extract Onboarding Procedure
     */
    private function extractOnboarding($text, &$fields)
    {
        if (preg_match('/(?:onboarding|joining\s*process|induction)\s*[:\-]?\s*(.+?)(?=\s*(?:skills?|cgpa|eligibility|$))/is', $text, $m)) {
            $fields['onboarding_procedure'] = $this->cleanText($m[1]);
        }
    }

    /**
     * Extract Hiring Stages
     */
    private function extractStages($text, &$fields)
    {
        $foundStages = [];
        $stageSequence = 1;

        $stageKeywords = [
            'Pre-Placement Talk' => ['ppt', 'pre placement', 'pre-placement', 'presentation', 'company talk', 'orientation', 'seminar'],
            'Resume Shortlisting' => ['shortlisting', 'cv screening', 'resume screening', 'profile review', 'screening'],
            'Online/Written Test' => ['written test', 'aptitude test', 'technical test', 'online test', 'coding test', 'hackathon', 'test', 'mcq', 'cbt'],
            'Group Discussion' => ['gd', 'group discussion', 'case study'],
            'Personal/Technical Interview' => ['interview', 'technical interview', 'hr interview', 'viva', 'personal interview', 'technical round'],
            'Any Other Round' => ['medical', 'psychometric', 'document verification', 'final round'],
        ];

        $textLower = strtolower($text);
        $matchedStages = [];

        foreach ($stageKeywords as $stageName => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($textLower, $keyword) !== false) {
                    $matchedStages[] = $stageName;
                    break;
                }
            }
        }

        $matchedStages = array_unique($matchedStages);

        foreach ($matchedStages as $stageName) {
            $foundStages[] = [
                'stage_id' => (string)$stageSequence,
                'sequence' => (string)$stageSequence,
                'name' => $stageName,
                'duration' => '1 hour',
                'selection_mode' => 'Offline',
                'interview_mode' => 'On-campus',
            ];
            $stageSequence++;
        }

        $fields['stages'] = $foundStages;

        // Psychometric & Medical
        if (strpos($textLower, 'psychometric') !== false) {
            $fields['has_psychometric_test'] = true;
        }
        if (strpos($textLower, 'medical') !== false) {
            $fields['has_medical_test'] = true;
        }
    }

    private function getDefaultFields()
    {
        return [
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
                'medical_allowance' => null,
                'first_year_ctc' => null,
                'stocks_options' => null,
                'ctc_breakup' => null,
                'gross_salary' => null,
                'monthly_take_home' => null,
                'different_structure_per_programme' => false,
                'salaries_json' => [],
                'additional_components' => [
                    'global' => [
                        'joining_bonus' => "",
                        'retention_bonus' => "",
                        'variable_performance_bonus' => "",
                        'esops_vest_period' => "",
                        'relocation_allowance' => "",
                        'medical_allowance' => "",
                        'deductions' => "",
                        'bond_amount_duration' => "",
                        'first_year_ctc' => "",
                        'stocks_options' => "",
                        'ctc_breakup' => "",
                        'gross_salary' => "",
                        'hra' => "",
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
    }

    private function cleanText($str)
    {
        $val = trim($str);
        $val = preg_replace('/\s+/', ' ', $val);
        if (strlen($val) > 2000) {
            $val = substr($val, 0, 2000) . '...';
        }
        return $val;
    }

    private function parseNumber($str)
    {
        $str = str_replace(',', '', trim($str));
        if (!is_numeric($str)) {
            return null;
        }
        $num = (float)$str;

        // If number is very large, it might be in absolute form (e.g., 1200000)
        if ($num > 1000000) {
            $num = $num / 100000; // Convert to Lakhs
        } elseif ($num > 10000 && $num <= 100000) {
            $num = $num / 1000; // Convert to thousands (for monthly stipends)
        }

        return round($num, 2);
    }
}
