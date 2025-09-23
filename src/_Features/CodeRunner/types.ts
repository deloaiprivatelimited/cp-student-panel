export interface SampleIO {
  input_text: string;
  output: string;
  explanation: string;
}

export interface Author {
  email: string;
  exp: number;
  id: string;
}

export interface Question {
  id: string;
  title: string;
  topic: string;
  subtopic?: string;
  tags: string[];
  short_description: string;
  long_description_markdown: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  time_limit_ms: number;
  memory_limit_kb: number;
  allowed_languages: string[];
  predefined_boilerplates?: Record<string, string>;
  solution_code?: Record<string, string>;
  run_code_enabled: boolean;
  submission_enabled: boolean;
  sample_io: SampleIO[];
  authors: Author[];
  created_at: string;
  updated_at: string;
  version: number;
}

export interface TestResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
}
// types.ts
export type Verdict = "Accepted" | "Partial" | "Wrong Answer" | string;

export interface CaseSummary {
  name: string;            // e.g. "Testcase 1"
  passed: boolean;
  points_awarded: number;
  time?: number | null;
  memory?: number | null;
  judge_token?: string | null;
}

export interface GroupSummary {
  name: string;            // "Group 1"
  group_max_points: number;
  group_points_awarded: number;
  cases: CaseSummary[];
}

export interface SubmissionResult {
  submission_id: string;
  question_id: string;
  verdict: Verdict;
  total_score: number;
  max_score: number;
  groups: GroupSummary[];
  created_at?: string;
}
