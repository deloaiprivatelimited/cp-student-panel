import React, { useState, useEffect, useRef } from "react";
import { questionService } from "./services/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/Tabs";
import ProblemStatement from "./components/ProblemStatement";
import CodeEditor from "./components/CodeEditor";
import { Loader2 } from "lucide-react";
import type { Question } from "./types";
import { privateAxios } from "../../utils/axios";
import SubmissionsTabs from "./components/SubmissionsTab";
import ResultPanel from "./components/ResultPanel";
import type { SubmissionResult } from "./types";

function CodeRunner({
  question,
  loading,
  error,
  onSubmit,
  initialSubmissions = [],
    headerHeight = 64, // <-- default header height in px (can be overridden by parent)

}: {
  question: Question | null;
  loading?: boolean;
  error?: string | null;
  onSubmit: (submissionIds: string[]) => void;
  initialSubmissions?: string[];
    headerHeight?: number;

}) {
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);

  const [activeTab, setActiveTab] = useState("problem");
  const [selectedLanguage, setSelectedLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const initializedQuestionId = useRef<string | null>(null);

  // Local submissionIds state so SubmissionsTabs can update immediately
  const [submissionIds, setSubmissionIds] = useState<string[]>(
    (initialSubmissions || []).map(String)
  );
const containerHeightCalc = `calc(100vh - ${headerHeight}px)`;

  // keep local submissionIds in sync when parent passes new initialSubmissions
  useEffect(() => {
    setSubmissionIds((prev) => {
      const incoming = (initialSubmissions || []).map(String);
      // if identical, keep prev to avoid unnecessary reload
      if (JSON.stringify(prev) === JSON.stringify(incoming)) return prev;
      return incoming;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialSubmissions)]);

  // Initialize code with boilerplate and custom input with first sample
  useEffect(() => {
    if (question) {
      const defaultLang = (question as any).allowed_languages?.[0] || "python";
      setSelectedLanguage(defaultLang);

      if (
        (question as any).predefined_boilerplates &&
        (question as any).predefined_boilerplates[defaultLang]
      ) {
        setCode((question as any).predefined_boilerplates[defaultLang]);
      } else {
        setCode("");
      }

      if ((question as any).sample_io && (question as any).sample_io.length > 0) {
        setCustomInput((question as any).sample_io[0].input_text ?? "");
      }
    }
    // only re-init when question.id changes
  }, [question?.id]);

  // Update code when language changes (but don't clobber if user typed and you prefer not to)
  useEffect(() => {
    if (
      question &&
      (question as any).predefined_boilerplates &&
      (question as any).predefined_boilerplates[selectedLanguage]
    ) {
      setCode((question as any).predefined_boilerplates[selectedLanguage]);
    } else {
      // keep user's code if they already typed something — change to setCode("") if you want to reset
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage, question?.id]);

  /* handleRunCode */
  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput("Running...");

    try {
      const resp = await questionService.runCode(
        "test_questions",
        question?.id,
        code,
        selectedLanguage,
        customInput
      );

      const result = resp?.result || {};

      const stdout = (result.stdout ?? "").toString().trim();
      const stderr = (result.stderr ?? "").toString().trim();
      const compileOutput = (result.compile_output ?? "").toString().trim();
      const message = (result.message ?? "").toString().trim();

      let finalOutput = "";
      if (stdout.length > 0) {
        finalOutput = stdout;
      } else if (stderr.length > 0) {
        finalOutput = stderr;
      } else if (compileOutput.length > 0) {
        finalOutput = compileOutput;
      } else if (message.length > 0) {
        finalOutput = message;
      } else {
        finalOutput = "(no output)";
      }

      setOutput(finalOutput);
    } catch (err) {
      console.error("Error running code:", err);
      setOutput("Error: Failed to run code. Please try again.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    setIsRunning(true);
    setOutput("Submitting code...");
    setSubmissionResult(null);

    try {
      const res = await privateAxios.post(
        `/coding/questions/test/submit/test_questions/${question?.id}/submit`,
        {
          source_code: code,
          language: selectedLanguage,
        }
      );

      const data = res?.data ?? {};

      // build a normalized submission result
      const submission: SubmissionResult = {
        submission_id:
          data.submission_id ?? data.data?.submission_id ?? data.id ?? "unknown",
        question_id: data.question_id ?? data.data?.question_id ?? question?.id ?? "unknown",
        verdict:
          data.verdict ??
          data.data?.verdict ??
          (Number(data.total_score) === Number(data.max_score)
            ? "Accepted"
            : Number(data.total_score) > 0
            ? "Partial"
            : "Wrong Answer"),
        total_score: Number(data.total_score ?? data.data?.total_score ?? 0),
        max_score: Number(
          data.max_score ?? data.data?.max_score ?? (question as any)?.points ?? 0
        ),
        groups: data.groups ?? data.data?.groups ?? [],
        created_at:
          data.created_at ?? data.data?.created_at ?? new Date().toISOString(),
      };

      // If we have a real id, update local submissionIds AND call parent's onSubmit with an array
      if (submission.submission_id && submission.submission_id !== "unknown") {
        const sid = String(submission.submission_id);
        setSubmissionIds((prev) => {
          const next = Array.from(new Set([...(prev || []), sid]));
          return next;
        });

        // call parent with an array shape (backwards-compatible)
        try {
          onSubmit([String(submission.submission_id)]);
        } catch (err) {
          // parent callback might be optional / different signature in some code paths
          console.warn("onSubmit callback failed or not provided:", err);
        }
      }

      setSubmissionResult(submission);

      setOutput(
        `Verdict: ${submission.verdict} — Score: ${submission.total_score}/${submission.max_score}`
      );
    } catch (err: any) {
      console.error("Submit error:", err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to submit code";
      setOutput(`Error: ${message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // --- Early returns (loading / error / not found)
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-300">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading question...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center p-6">
          <h1 className="text-xl font-semibold text-gray-100 mb-2">
            Error Loading Question
          </h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center p-6">
          <h1 className="text-xl font-semibold text-gray-100 mb-2">
            Question Not Found
          </h1>
          <p className="text-gray-400">
            The requested question could not be found.
          </p>
        </div>
      </div>
    );
  }

  // Determine available tabs
  const availableTabs = ["problem"];
  if ((question as any).sample_io && (question as any).sample_io.length > 0) {
    availableTabs.push("samples");
  }

  // ---------------------------
  // MAIN LAYOUT (fixed single h-screen)
  // ---------------------------
  return (
    // Top-level: single h-screen so inner children use h-full and flex to size properly
  <div
    className="flex"
    style={{
      height: containerHeightCalc,
      minHeight: containerHeightCalc,
      backgroundColor: "#1f1f1f",
    }}
  >
      {/* Left Panel - Problem Statement */}
      <div
        className="w-1/2 flex flex-col h-full border-r border-gray-800"
        style={{ backgroundColor: "#1f1f1f" }}
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col h-full"
        >
          <TabsList
            className="flex-shrink-0  border-b border-gray-800"
            style={{ backgroundColor: "#1f1f1f" }}
          >
            <TabsTrigger
              value="problem"
              className="text-gray-300 hover:text-gray-100 data-[state=active]:text-white"
              style={{
                backgroundColor:
                  activeTab === "problem" ? "#2f2f2f" : "transparent",
              }}
            >
              Problem
            </TabsTrigger>

            <TabsTrigger
              value="submissions"
              className="text-gray-300 hover:text-gray-100 data-[state=active]:text-white"
              style={{
                backgroundColor:
                  activeTab === "submissions" ? "#2f2f2f" : "transparent",
              }}
            >
              Submissions
            </TabsTrigger>
          </TabsList>

          {/* Content area: flex-1 + independent scroll */}
          <div
            className="flex-1 overflow-y-auto custom-scrollbar"
            style={{
              backgroundColor: "#1f1f1f",
              scrollbarWidth: "thin",
              scrollbarColor: "#4a4a4a #1f1f1f",
            }}
          >
            <style jsx>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 8px;
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: #1f1f1f;
                border-radius: 4px;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #4a4a4a;
                border-radius: 4px;
                border: 1px solid #1f1f1f;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #5a5a5a;
              }
              .custom-scrollbar::-webkit-scrollbar-corner {
                background: #1f1f1f;
              }
            `}</style>

            <TabsContent value="problem" className="p-4">
              <ProblemStatement question={question} />
            </TabsContent>

            <TabsContent value="submissions" className="p-4">
              <SubmissionsTabs
                collection="questions"
                questionId={question.id}
                submissionIds={submissionIds}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Right Panel - Code Editor */}
    <div className="w-1/2 flex flex-col h-full min-h-0" style={{ backgroundColor: "#1f1f1f" }}>
      {/* Editor + Output/result area: flex-1 column, editor scrolls, result sticks to bottom */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div
          className="flex-1 min-h-0 overflow-y-auto p-4"
          style={{
            backgroundColor: "#1f1f1f",
            scrollbarWidth: "thin",
            scrollbarColor: "#4a4a4a #1f1f1f",
          }}
        >
          <CodeEditor
            question={question}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            code={code}
            onCodeChange={setCode}
            customInput={customInput}
            onCustomInputChange={setCustomInput}
            output={output}
            isRunning={isRunning}
            onRunCode={handleRunCode}
            onSubmitCode={handleSubmitCode}
          />
        </div>
        {/* Result panel placed below editor, non-scrolling (stays visible) */}
        <div className="flex-shrink-0 p-4 border-t border-gray-800">
          <ResultPanel result={submissionResult} />
        </div>
      </div>
    </div>
    </div>
  );
}

export default CodeRunner;
