import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { privateAxios } from "../../utils/axios"; // adjust path if needed
import AttemptSidebar from "./AttemptSidebar";
import MCQQuestion from "./MCQQuestion";
import RearrangeQuestion from "./RearrangeQuestion";
import CodeRunner from "../CodeRunner";
import { useModal } from "../../utils/ModalUtils";
import InstructionsPanel from "./InstructionPanel";
const DEV_MODE = false;

// small, reusable loading spinner (tailwind)
const LoadingSpinner = ({ label = "Loading..." }) => (
  <div className="flex items-center justify-center flex-col gap-3 p-6">
    <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin" />
    <div className="text-[#CCCCCC] text-sm">{label}</div>
  </div>
);

/* Design tokens kept for reference (Tailwind used in markup) */
const PRIMARY = "#4CA466";
const BG = "#1E1E1E";
const CARD = "#2D2D30";
const BORDER = "#3E3E42";
const TEXT = "#FFFFFF";
const MUTED = "#CCCCCC";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

/* Local fallback instructions (used if fetch fails) */
const INSTRUCTIONS = [
  {
    id: "ins-1",
    title: "Instruction 1",
    content:
      "Read these instructions carefully. This test is timed. Make sure you are seated in a distraction-free environment.",
    format: "text",
  },
  {
    id: "ins-2",
    title: "Instruction 2",
    content:
      "Do not refresh the page or switch tabs during the test. If you leave fullscreen, you will receive a warning and the test may end.",
    format: "text",
  },
  {
    id: "ins-3",
    title: "Instruction 3",
    content:
      "Keep your device charged and stable. Autosave will happen every few seconds. When you start the test, it will begin immediately.",
    format: "text",
  },
];

// ---- FIXED: all durations are in seconds ----
const INSTRUCTION_TOTAL_SECONDS = 2; // 2 minutes (seconds) — adjust as needed
const VIOLATION_SECONDS = 30000; // 30 seconds out-of-fullscreen before auto-submit
const MAX_TAB_SWITCHES = 500;
const TAB_EVENT_DEDUP_MS = 1000; // dedupe visibility/blur events within 1s

const Attempt = () => {
  const query = useQuery();
  const testId = query.get("testId");

  const [submissionIdsByQuestion, setSubmissionIdsByQuestion] = useState({});
  const [attemptSubmitted, setAttemptSubmitted] = useState(false);
  const attemptSubmittedRef = useRef(false);
  useEffect(() => {
    attemptSubmittedRef.current = attemptSubmitted;
  }, [attemptSubmitted]);

  const [phase, setPhase] = useState("instructions");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);

  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const tabSwitchCountRef = useRef(0);

  const ATTEMPT_FETCH_URL = (testId) => `/api/students/test/attempt/${testId}`;
  const INSTRUCTIONS_FETCH_URL = (testId) => `/api/students/test/instructions/${testId}`;

  // instruction timer
  const [insSeconds, setInsSeconds] = useState(INSTRUCTION_TOTAL_SECONDS);
  const insTimerRef = useRef(null);
  const { showAlert, showConfirm } = useModal();

  // fullscreen state
  const [fullscreenGranted, setFullscreenGranted] = useState(false);
  const [showEnterFsButton, setShowEnterFsButton] = useState(false);
  const [isBlockedForFs, setIsBlockedForFs] = useState(false);

  // NEW: server-fetched instructions state & loading
  const [serverInstructions, setServerInstructions] = useState(null);
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [instructionsError, setInstructionsError] = useState(null);

  // test payload & global timer
  const [payload, setPayload] = useState(null);
  const [payloadLoading, setPayloadLoading] = useState(false); // <- NEW

  const [secondsLeft, setSecondsLeft] = useState(null);
  const testTimerRef = useRef(null);
  const payloadRef = useRef(null);
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  // time-restricted sections
  const [timeSections, setTimeSections] = useState([]);
  const [currentTimeSectionIndex, setCurrentTimeSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sectionSecondsLeft, setSectionSecondsLeft] = useState(null);
  const sectionTimerRef = useRef(null);
  const [completedSections, setCompletedSections] = useState(new Set());
  const [questionStates, setQuestionStates] = useState({});

  // open sections
  const [openSections, setOpenSections] = useState([]);
  const [openModeActive, setOpenModeActive] = useState(false);
  const [currentOpenSectionId, setCurrentOpenSectionId] = useState(null);
  const [currentOpenQuestionIndex, setCurrentOpenQuestionIndex] = useState(0);

  // violation handling
  const [violationActive, setViolationActive] = useState(false);
  const [violationCountdown, setViolationCountdown] = useState(VIOLATION_SECONDS);
  const violationTimerRef = useRef(null);

  // autosave
  const autosaveRef = useRef(null);

  // dedupe and previous hidden state refs for tab-switch handling
  const prevHiddenRef = useRef(false);
  const lastTabEventAtRef = useRef(0);

  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount;
  }, [tabSwitchCount]);

  // ---------- Fetch instructions from server ----------
  const fetchInstructions = async () => {
    // if (DEV_MODE) {
    //   // in dev mode, keep local INSTRUCTIONS
    //   setServerInstructions(null);
    //   setInstructionsLoading(false);
    //   setInstructionsError(null);
    //   return;
    // }

    setInstructionsLoading(true);
    setInstructionsError(null);
    try {
      const resp = await privateAxios.get(INSTRUCTIONS_FETCH_URL(testId));
      const data = resp?.data;
      if (!data || !data.success) {
        throw new Error(data?.message || "Failed to fetch instructions");
      }
      // server returns data.data.instructions (per backend route we used)
      const instrs = data?.data?.instructions ?? data?.instructions ?? [];

      // Map server instruction items into the panel-friendly shape:
      // { id, title, content, format } - InstructionsPanel should accept this.
      const mapped = instrs.map((it, idx) => {
        // server items may be { type: 'general'|'test'|'sections', content: ..., format: 'html'|'text'|'json' }
        const id = it.id ?? `srv-${it.type ?? idx}-${idx}`;
       let title;
switch (it.type) {
  case "general":
    title = "General Instructions";
    break;
  case "test":
    title = "Test Instructions";
    break;
  case "sections":
    title = "Section Instructions";
    break;
  default:
    title = it.title ?? `Instruction ${idx + 1}`;
}

        let content = it.content;
        // if the server provided a JSON block for sections (content is object), stringify into readable text or keep object for panel
        if (it.format === "json" && typeof content === "object") {
          // keep object as-is — InstructionsPanel may render it specially. Also provide a fallback textual summary:
          content = content;
        } else if (it.format === "html" && typeof content === "string") {
          // keep the HTML string
          content = content;
        } else if (typeof content !== "string") {
          // fallback stringify
          content = JSON.stringify(content);
        }

        return {
          id,
          title,
          content,
          format: it.format ?? "text",
        };
      });

      setServerInstructions(mapped);
      setInstructionsLoading(false);
    } catch (err) {
      console.error("[fetchInstructions] failed:", err);
      setInstructionsError(err.message || "Failed to fetch instructions");
      setInstructionsLoading(false);
      setServerInstructions(null); // fallback to local INSTRUCTIONS
    }
  };

  // fetch instructions once when component mounts or testId changes
  useEffect(() => {
    if (!testId) return;
    fetchInstructions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // ---------- API helpers ----------
  const reportTabSwitch = async ({ testId, answers }) => {
    if (DEV_MODE) {
      console.log("[DEV_MODE] reportTabSwitch skipped", { testId, answers });
      return null;
    }
    try {
      const body = { test_id: testId, answers: answers || {} };
      const resp = await privateAxios.post("/api/students/test/tab-switch", body);
      return resp?.data ?? null;
    } catch (err) {
      console.error("[reportTabSwitch] failed:", err);
      return null;
    }
  };

  const reportFullscreenViolation = async ({ testId, answers }) => {
    if (DEV_MODE) {
      console.log("[DEV_MODE] reportFullscreenViolation skipped", { testId, answers });
      return null;
    }
    try {
      const body = { test_id: testId, answers: answers || {} };
      const resp = await privateAxios.post("/api/students/test/fullscreen-violation", body);
      return resp?.data ?? null;
    } catch (err) {
      console.error("[reportFullscreenViolation] failed:", err);
      return null;
    }
  };

  const handleServerAutoSubmit = (respData) => {
    const data = respData?.data ?? respData ?? {};
    const wasSubmitted = !!(data.auto_submitted || data.submitted);
    if (!wasSubmitted) return false;

    attemptSubmittedRef.current = true;
    setAttemptSubmitted(true);
    setPhase("ended");
    setSubmittedResult(data);

    // Inform user and try to close
    showConfirm("Your test was submitted automatically due to a proctoring violation.").then(() => {
      try {
        window.close();
      } catch (e) {}
    }).catch(() => {
      try {
        window.close();
      } catch (e) {}
    });

    return true;
  };

  useEffect(() => {
    if (attemptSubmitted) {
      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
        console.log("[Autosave] stopped due to submission");
      }
    }
  }, [attemptSubmitted]);

  const submitTestDirect = async () => {
    try {
      if (attemptSubmittedRef.current) {
        console.log("[SubmitDirect] already submitted, skipping");
        return;
      }
      attemptSubmittedRef.current = true;
      setAttemptSubmitted(true);
      setIsSubmitting(true);

      if (autosaveRef.current) {
        clearInterval(autosaveRef.current);
        autosaveRef.current = null;
        console.log("[Autosave] stopped due to direct submission");
      }

      const resp = await privateAxios.post("/api/students/test/submit", {
        test_id: testId,
        answers: payload?.answers || {},
      });

      if (resp?.data?.success) {
        setSubmittedResult(resp.data.data ?? resp.data);
        setPhase("ended");

        showConfirm("Test submitted successfully!")
          .then((ok) => {
            try {
              if (ok) window.close();
            } catch (e) {}
          })
          .catch(() => {
            try { window.close(); } catch (e) {}
          });
      } else {
        attemptSubmittedRef.current = false;
        setAttemptSubmitted(false);
        showConfirm(resp?.data?.message || "Auto-submission failed.");
      }
    } catch (err) {
      console.error("[submitTestDirect] failed:", err);
      attemptSubmittedRef.current = false;
      setAttemptSubmitted(false);
      showConfirm("Error auto-submitting test. Please try to submit manually.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Tab-switch / visibility tracking (deduped) ----------
  useEffect(() => {
    if (DEV_MODE) {
      console.log("[DEV_MODE] skipping tab/visibility listeners");
      return;
    }
    const now = () => new Date().getTime();

    const handleTabEvent = (ev) => {
      // dedupe multiple events that may fire on same action (visibilitychange + blur)
      const last = lastTabEventAtRef.current || 0;
      if (now() - last < TAB_EVENT_DEDUP_MS) {
        return;
      }
      lastTabEventAtRef.current = now();

      // Determine if this is a transition visible -> hidden or blur
      const isHidden = document.hidden || document.visibilityState === "hidden";
      const isBlur = ev.type === "blur";

      // Only increment when we transition from visible to hidden/blur
      const wasHidden = prevHiddenRef.current || false;
      if (!wasHidden && (isHidden || isBlur)) {
        // increment local ref + state
        tabSwitchCountRef.current = (tabSwitchCountRef.current || 0) + 1;
        setTabSwitchCount(tabSwitchCountRef.current);

        // Best-effort: send latest answers but don't await in event handler
        const latestAnswers = payloadRef.current?.answers || {};
        reportTabSwitch({ testId, answers: latestAnswers })
          .then((resp) => {
            // server may auto-submit; let server be canonical
            if (handleServerAutoSubmit(resp)) return;

            // If server returned a tab_switches_count >= threshold and user not in fullscreen,
            // start violation countdown. We do NOT immediately submit on client.
            const data = resp?.data ?? resp ?? {};
            const count = data.tab_switches_count ?? tabSwitchCountRef.current;
            if (count >= MAX_TAB_SWITCHES && !document.fullscreenElement) {
              if (!violationActive) {
                setViolationActive(true);
                setViolationCountdown(VIOLATION_SECONDS);
                startViolationCountdown();
              }
            }
          })
          .catch((err) => {
            console.warn("reportTabSwitch failed:", err);
            // Network error: do NOT auto-submit locally immediately. Optionally notify user.
          });
      }

      prevHiddenRef.current = (isHidden || isBlur);
    };

    window.addEventListener("blur", handleTabEvent);
    document.addEventListener("visibilitychange", handleTabEvent);

    return () => {
      window.removeEventListener("blur", handleTabEvent);
      document.removeEventListener("visibilitychange", handleTabEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, testId, payload, violationActive]);

  // ---------- instruction timer ----------
  useEffect(() => {
    if (phase !== "instructions") return;

    if (!fullscreenGranted) {
      setIsBlockedForFs(true);
      return;
    }

    setIsBlockedForFs(false);

    if (insTimerRef.current) clearInterval(insTimerRef.current);
    insTimerRef.current = setInterval(() => {
      setInsSeconds((s) => {
        if (s <= 1) {
          clearInterval(insTimerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (insTimerRef.current) {
        clearInterval(insTimerRef.current);
        insTimerRef.current = null;
      }
    };
  }, [phase, fullscreenGranted]);

  // ---------- try auto fullscreen on mount ----------
  useEffect(() => {
    if (DEV_MODE) {
      setFullscreenGranted(true); // pretend we have fullscreen in dev
      setShowEnterFsButton(false);
      setIsBlockedForFs(false);
      return;
    }
    const tryFs = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen();
        }
        setFullscreenGranted(true);
        setShowEnterFsButton(false);
        setIsBlockedForFs(false);
      } catch (err) {
        console.warn("Auto fullscreen blocked — will show CTA", err);
        setFullscreenGranted(false);
        setShowEnterFsButton(true);
        setIsBlockedForFs(true);
      }
    };

    if (phase === "instructions") {
      setTimeout(tryFs, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- fullscreen change listener ----------
  useEffect(() => {
    if (DEV_MODE) {
      console.log("[DEV_MODE] skipping fullscreenchange listener");
      return;
    }
    const onFsChange = () => {
      const isFs = !!document.fullscreenElement;
      if (!isFs) {
        console.log("[FS] Not in fullscreen");
        setFullscreenGranted(false);
        if (phase === "instructions") {
          setIsBlockedForFs(true);
          setShowEnterFsButton(true);
        } else if (phase === "test") {
          // start violation countdown (do NOT immediate-submit)
          if (!violationActive) {
            setViolationActive(true);
            setViolationCountdown(VIOLATION_SECONDS);
            startViolationCountdown();
          }
        }
      } else {
        console.log("[FS] Entered fullscreen");
        setFullscreenGranted(true);
        setShowEnterFsButton(false);
        setIsBlockedForFs(false);
        clearViolationCountdown();
      }
    };

    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, violationActive]);

  // visibility change (treat as leaving fullscreen for the instructions case)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        console.log("[Visibility] document hidden");
        if (phase === "instructions") {
          setIsBlockedForFs(true);
          setShowEnterFsButton(true);
          setFullscreenGranted(false);
        } else if (phase === "test" && fullscreenGranted) {
          if (!violationActive) {
            setViolationActive(true);
            setViolationCountdown(VIOLATION_SECONDS);
            startViolationCountdown();
          }
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, fullscreenGranted, violationActive]);

  const enterFullscreenOnClick = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else {
        throw new Error("Fullscreen not supported");
      }
      setFullscreenGranted(true);
      setShowEnterFsButton(false);
      setIsBlockedForFs(false);
    } catch (err) {
      console.warn("User fullscreen attempt failed", err);
      showAlert("Could not enter fullscreen. Please check browser settings or try a different browser.");
    }
  };

  // ---------- Start test: fetch payload and initialize section timers ----------
  const startTestPhase = async () => {
    setPhase("test");
      setPayloadLoading(true); // <- indicate we are loading attempt payload

    try {
      const resp = await privateAxios.get(ATTEMPT_FETCH_URL(testId));
      if (!resp?.data?.success) throw new Error(resp?.data?.message || "Failed to fetch attempt");
      const data = resp.data.data ?? resp.data;
      setPayload(data);

      const testObj = data?.test ?? data?.data?.test ?? data;
      const timeSecs = (testObj?.sections_time_restricted || []).map((s) => ({
        ...s,
        __durationSeconds: (Number(s.duration) || 0) * 60,
      }));
      const opens = (testObj?.sections_open || []).map((s) => ({ ...s }));

      // hydrate saved answers (back-compat)
      const savedAnswers = (data && data.answers) || resp.data.answers || resp.data.data?.answers || null;
      if (savedAnswers) {
        timeSecs.forEach((s) => {
          const ansMap = savedAnswers[s.id] || {};
          (s.questions || []).forEach((q, idx) => {
            const qId = q.id ?? q.question_id ?? String(idx);
            const raw = ansMap[qId] ?? ansMap[idx];
            if (raw !== undefined && raw !== null) {
              q.answer = Array.isArray(raw) ? raw : [raw];
            }
          });
        });
        opens.forEach((s) => {
          const ansMap = savedAnswers[s.id] || {};
          (s.questions || []).forEach((q, idx) => {
            const qId = q.id ?? q.question_id ?? String(idx);
            const raw = ansMap[qId] ?? ansMap[idx];
            if (raw !== undefined && raw !== null) {
              q.answer = Array.isArray(raw) ? raw : [raw];
            }
          });
        });
      }

      setTimeSections(timeSecs);
      setOpenSections(opens);

      // init question states
      const initStates = {};
      timeSecs.forEach((s) => {
        initStates[s.id] = {};
        (s.questions || []).forEach((q, idx) => {
          const qId = q.id ?? q.question_id ?? String(idx);
          initStates[s.id][qId] = { viewed: !!(q.answer && q.answer.length > 0), solved: !!(q.answer && q.answer.length > 0) };
        });
      });
      opens.forEach((s) => {
        initStates[s.id] = initStates[s.id] ?? {};
        (s.questions || []).forEach((q, idx) => {
          const qId = q.id ?? q.question_id ?? String(idx);
          initStates[s.id][qId] = initStates[s.id][qId] ?? { viewed: !!(q.answer && q.answer.length > 0), solved: !!(q.answer && q.answer.length > 0) };
        });
      });
      setQuestionStates(initStates);

      // global duration fallback (compat)
      const duration =
        testObj?.duration_seconds ??
        (timeSecs.reduce((s, sec) => s + (sec.__durationSeconds || 0), 0) +
          opens.reduce((s, sec) => s + 0, 0)) ??
        (testObj?.end_datetime ? Math.max(0, Math.floor((new Date(testObj.end_datetime).getTime() - Date.now()) / 1000)) : null) ??
        3600;
      setSecondsLeft(duration);

      if (timeSecs.length > 0) {
        setCurrentTimeSectionIndex(0);
        setSectionSecondsLeft(timeSecs[0].__durationSeconds || 0);
        setCurrentQuestionIndex(0);
        setOpenModeActive(false);
      } else {
        setOpenModeActive(true);
        setCurrentOpenSectionId(opens[0]?.id ?? null);
      }

      // try fullscreen again
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen();
        }
        setFullscreenGranted(true);
        setShowEnterFsButton(false);
      } catch (err) {
        console.warn("Auto fullscreen in test failed", err);
        setFullscreenGranted(false);
        setShowEnterFsButton(true);
      }

      // start autosave (use payloadRef for latest)
      if (autosaveRef.current) clearInterval(autosaveRef.current);
      autosaveRef.current = setInterval(() => {
        const latest = payloadRef.current;
        console.log("[Autosave] testId:", testId, "timestamp:", new Date().toISOString(), "answers:", (latest?.answers ?? {}));
        if (latest?.test_assignment_id) {
          privateAxios.post('/api/students/test/auto-save', { attemptId: latest.test_assignment_id, answers: latest.answers, test_id: testId })
            .catch((err) => console.error("Autosave failed", err));
        }
      }, 5000);

    } catch (err) {
      console.error("Failed to fetch test payload:", err);

      setPayload({ _error: err.message || "Failed to fetch test" });
    }
    finally{
              setPayloadLoading(false); // <- indicate we are loading attempt payload

    }
  };

  // ---------- Section timer ----------
  useEffect(() => {
    if (phase !== "test" || openModeActive) return;
    if (sectionSecondsLeft == null) return;

    if (sectionTimerRef.current) clearInterval(sectionTimerRef.current);
    sectionTimerRef.current = setInterval(() => {
      setSectionSecondsLeft((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          clearInterval(sectionTimerRef.current);
          markCurrentSectionCompletedAndAdvance();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (sectionTimerRef.current) {
        clearInterval(sectionTimerRef.current);
        sectionTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, openModeActive, currentTimeSectionIndex, sectionSecondsLeft]);

  const markCurrentSectionCompletedAndAdvance = () => {
    const current = timeSections[currentTimeSectionIndex];
    if (!current) {
      setOpenModeActive(true);
      setCurrentOpenSectionId(openSections[0]?.id ?? null);
      return;
    }

    setCompletedSections((prev) => {
      const next = new Set(prev);
      next.add(current.id);
      return next;
    });

    const nextIndex = currentTimeSectionIndex + 1;
    if (nextIndex < timeSections.length) {
      setCurrentTimeSectionIndex(nextIndex);
      setCurrentQuestionIndex(0);
      setSectionSecondsLeft(timeSections[nextIndex].__durationSeconds || 0);
    } else {
      setOpenModeActive(true);
      setCurrentOpenSectionId(openSections[0]?.id ?? null);
      setSectionSecondsLeft(null);
    }
  };

  const manualAdvanceSection = () => {
    const current = timeSections[currentTimeSectionIndex];
    if (!current) {
      setOpenModeActive(true);
      setCurrentOpenSectionId(openSections[0]?.id ?? null);
      return;
    }
    setCompletedSections((prev) => {
      const next = new Set(prev);
      next.add(current.id);
      return next;
    });

    const nextIndex = currentTimeSectionIndex + 1;
    if (nextIndex < timeSections.length) {
      setCurrentTimeSectionIndex(nextIndex);
      setCurrentQuestionIndex(0);
      setSectionSecondsLeft(timeSections[nextIndex].__durationSeconds || 0);
    } else {
      setOpenModeActive(true);
      setCurrentOpenSectionId(openSections[0]?.id ?? null);
      setSectionSecondsLeft(null);
    }
  };

  const handleSubmitTest = async () => {
    if (!payload?.test_assignment_id) {
      showConfirm("No attempt found. Please refresh.");
      return;
    }

    const ok = await showConfirm(
      "Are you sure you want to submit the test? You will not be able to change answers after this."
    );
    if (!ok) return;

    try {
      setIsSubmitting(true);
      const resp = await privateAxios.post("/api/students/test/submit", {
        test_id: testId,
        answers: payload.answers || {},
      });

      if (resp?.data?.success) {
        setSubmittedResult(resp.data.data);
        setPhase("ended");

        showConfirm("Test submitted successfully!").then((userOk) => {
          try {
            if (userOk) window.close();
          } catch (e) {}
        });
      } else {
        showConfirm(resp?.data?.message || "Submission failed.");
      }
    } catch (err) {
      console.error("Submit failed:", err);
      showConfirm("Error submitting test. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // navigation & question helpers
  const getQuestionObj = (qWrapper) => {
    if (!qWrapper) return null;
    const inner = qWrapper.question ?? qWrapper;
    const questionType = qWrapper.question_type ?? inner.question_type ?? inner.type ?? null;
    return {
      ...inner,
      question_type: questionType
    };
  };

  const findQuestionType = (sectionId, questionId) => {
    const timeSec = timeSections.find((s) => s.id === sectionId);
    const openSec = openSections.find((s) => s.id === sectionId);
    const sec = timeSec || openSec;
    if (!sec) return null;

    const q = (sec.questions || []).find((qq, idx) => {
      const inner = qq?.question ?? qq;
      const qId = inner?.id ?? inner?.question_id ?? String(idx);
      return String(qId) === String(questionId);
    });

    if (!q) return null;
    const inner = q?.question ?? q;
    return q?.question_type ?? inner?.question_type ?? q?.type ?? inner?.type ?? null;
  };

  // persist answers keyed by questionId
  const storeAnswerForQuestion = (sectionId, questionId, answer) => {
    if (!sectionId || !questionId) return;
    const incoming = Array.isArray(answer) ? answer.map(String) : (answer ? [String(answer)] : []);
    const qType = findQuestionType(sectionId, questionId);

    setPayload((prev) => {
      const next = prev ? { ...prev } : {};
      next.answers = next.answers ? { ...next.answers } : {};
      next.answers[sectionId] = next.answers[sectionId] ? { ...next.answers[sectionId] } : {};

      const existingRaw = next.answers[sectionId][questionId];

      const existingArray = (() => {
        if (existingRaw == null) return [];
        if (Array.isArray(existingRaw)) return existingRaw.map(String);
        if (typeof existingRaw === "object" && Array.isArray(existingRaw.value)) return existingRaw.value.map(String);
        return [String(existingRaw)];
      })();

      if (qType === "coding") {
        const merged = Array.from(new Set([...existingArray, ...incoming]));
        next.answers[sectionId][questionId] = { value: merged, qwell: qType ?? null };
      } else {
        next.answers[sectionId][questionId] = { value: incoming, qwell: qType ?? null };
      }

      return next;
    });

    const toStoreForUI = (() => {
      const findCurrent = () => {
        const sec = timeSections.find((s) => s.id === sectionId) || openSections.find((s) => s.id === sectionId);
        if (!sec) return [];
        const q = (sec.questions || []).find((qq, idx) => {
          const inner = qq?.question ?? qq;
          const qId = inner?.id ?? inner?.question_id ?? String(idx);
          return String(qId) === String(questionId);
        });
        const raw = q?.answer ?? null;
        if (raw == null) return [];
        if (Array.isArray(raw)) return raw.map(String);
        if (typeof raw === "object" && Array.isArray(raw.value)) return raw.value.map(String);
        return [String(raw)];
      };

      if (qType === "coding") {
        const existing = findCurrent();
        const merged = Array.from(new Set([...existing, ...incoming]));
        return merged;
      } else {
        return incoming;
      }
    })();

    setTimeSections((prev) => {
      if (!prev || prev.length === 0) return prev;
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx === -1) return prev;
      const next = [...prev];
      const sec = { ...next[idx] };
      const qs = (sec.questions || []).map((q) => {
        const qCopy = { ...q };
        const qId = qCopy.id ?? qCopy.question_id ?? null;
        if (qId === questionId) {
          qCopy.answer = toStoreForUI;
        }
        return qCopy;
      });
      sec.questions = qs;
      next[idx] = sec;
      return next;
    });

    setOpenSections((prev) => {
      if (!prev || prev.length === 0) return prev;
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx === -1) return prev;
      const next = [...prev];
      const sec = { ...next[idx] };
      const qs = (sec.questions || []).map((q) => {
        const qCopy = { ...q };
        const qId = qCopy.id ?? qCopy.question_id ?? null;
        if (qId === questionId) {
          qCopy.answer = toStoreForUI;
        }
        return qCopy;
      });
      sec.questions = qs;
      next[idx] = sec;
      return next;
    });
  };

  const getSavedAnswer = (sectionId, questionObj, fallbackIndex = null) => {
    const unwrap = (raw) => {
      if (raw == null) return null;
      if (typeof raw === "object" && Array.isArray(raw.value)) {
        return raw.value.map((v) => String(v));
      }
      if (Array.isArray(raw)) return raw.map((v) => String(v));
      return [String(raw)];
    };

    if (!sectionId || !questionObj) {
      if (fallbackIndex != null && payload?.answers?.[sectionId]) {
        return unwrap(payload?.answers?.[sectionId]?.[String(fallbackIndex)] ?? null);
      }
      return null;
    }

    const qId = questionObj.question?.id ?? questionObj.question_id ?? questionObj.questionId ?? null;
    const rawFromQuestion = questionObj.answer ?? null;
    if (rawFromQuestion != null) {
      return unwrap(rawFromQuestion);
    }

    const rawFromPayload = payload?.answers?.[sectionId]?.[qId] ?? payload?.answers?.[sectionId]?.[String(qId)] ?? null;
    if (rawFromPayload != null) {
      return unwrap(rawFromPayload);
    }

    if (fallbackIndex != null) {
      return unwrap(payload?.answers?.[sectionId]?.[String(fallbackIndex)] ?? null);
    }

    return null;
  };

  const advanceToNextQuestionInTimeSection = () => {
    const nxt = currentQuestionIndex + 1;
    const activeTimeSection = timeSections[currentTimeSectionIndex];
    if (nxt < (activeTimeSection?.questions || []).length) {
      setCurrentQuestionIndex(nxt);
    } else {
      showAlert("End of section questions. You can Advance Section or wait for timer to auto-advance.");
    }
  };

  const advanceOpenQuestionAfterSave = (sectionId) => {
    if (!sectionId) return;
    const sec = openSections.find((s) => s.id === sectionId);
    if (!sec) return;
    const currentIdx = currentOpenQuestionIndex;
    const nxt = currentIdx + 1;
    if (nxt < (sec?.questions || []).length) {
      setCurrentOpenQuestionIndex(nxt);
    } else {
      showAlert("End of section questions.");
    }
  };

  // handlers for MCQ / Rearrange / Coding
  const handleMcqSolvedInTimeSection = (answerPayload) => {
    const activeTimeSection = timeSections[currentTimeSectionIndex];
    if (!activeTimeSection) return;
    const qObj = getQuestionObj(activeTimeSection?.questions?.[currentQuestionIndex]);
    const qId = qObj?.id ?? activeTimeSection?.questions?.[currentQuestionIndex]?.id;
    if (!qId) return;

    storeAnswerForQuestion(activeTimeSection.id, qId, answerPayload);
    markQuestionSolved(activeTimeSection.id, qId);

    const isMultiple = !!qObj?.is_multiple;
    if (!isMultiple) {
      advanceToNextQuestionInTimeSection();
    }
  };

  const handleMcqSolvedInOpenSection = (answerPayload) => {
    const activeOpenSection = openSections.find((s) => s.id === currentOpenSectionId);
    if (!activeOpenSection) return;
    const qObj = getQuestionObj(activeOpenSection?.questions?.[currentOpenQuestionIndex]);
    const qId = qObj?.id ?? activeOpenSection?.questions?.[currentOpenQuestionIndex]?.id;
    if (!qId) return;

    storeAnswerForQuestion(activeOpenSection.id, qId, answerPayload);
    markQuestionSolved(activeOpenSection.id, qId);
    advanceOpenQuestionAfterSave(activeOpenSection.id);
  };

  const handleRearrangeSolvedInTimeSection = (orderArray) => {
    const activeTimeSection = timeSections[currentTimeSectionIndex];
    if (!activeTimeSection) return;
    const qObj = getQuestionObj(activeTimeSection?.questions?.[currentQuestionIndex]);
    const qId = qObj?.id ?? activeTimeSection?.questions?.[currentQuestionIndex]?.id;
    if (!qId) return;
    storeAnswerForQuestion(activeTimeSection.id, qId, orderArray);
    markQuestionSolved(activeTimeSection.id, qId);
    advanceToNextQuestionInTimeSection();
  };

  const handleRearrangeClearInTimeSection = (clearedPayload) => {
    const activeTimeSection = timeSections[currentTimeSectionIndex];
    if (!activeTimeSection) return;
    const qObj = getQuestionObj(activeTimeSection?.questions?.[currentQuestionIndex]);
    const qId = qObj?.id ?? activeTimeSection?.questions?.[currentQuestionIndex]?.id;
    if (!qId) return;
    storeAnswerForQuestion(activeTimeSection.id, qId, clearedPayload);
    setQuestionStates((prev) => ({
      ...prev,
      [activeTimeSection.id]: {
        ...prev[activeTimeSection.id],
        [qId]: {
          ...prev[activeTimeSection.id]?.[qId],
          viewed: true,
          solved: false,
        },
      },
    }));
  };

  const handleRearrangeNextWithoutSaveInTimeSection = () => {
    handleMcqNextWithoutSaveInTimeSection();
  };

  const handleRearrangeSolvedInOpenSection = (orderArray) => {
    const activeOpenSection = openSections.find((s) => s.id === currentOpenSectionId);
    if (!activeOpenSection) return;
    const qObj = getQuestionObj(activeOpenSection?.questions?.[currentOpenQuestionIndex]);
    const qId = qObj?.id ?? activeOpenSection?.questions?.[currentOpenQuestionIndex]?.id;
    if (!qId) return;
    storeAnswerForQuestion(activeOpenSection.id, qId, orderArray);
    markQuestionSolved(activeOpenSection.id, qId);
    advanceOpenQuestionAfterSave(activeOpenSection.id);
  };

  const handleRearrangeClearInOpenSection = (clearedPayload) => {
    const activeOpenSection = openSections.find((s) => s.id === currentOpenSectionId);
    if (!activeOpenSection) return;
    const qObj = getQuestionObj(activeOpenSection?.questions?.[currentOpenQuestionIndex]);
    const qId = qObj?.id ?? activeOpenSection?.questions?.[currentOpenQuestionIndex]?.id;
    if (!qId) return;
    storeAnswerForQuestion(activeOpenSection.id, qId, clearedPayload);
    setQuestionStates((prev) => ({
      ...prev,
      [activeOpenSection.id]: {
        ...prev[activeOpenSection.id],
        [qId]: {
          ...prev[activeOpenSection.id]?.[qId],
          viewed: true,
          solved: false,
        },
      },
    }));
  };

  const handleRearrangeNextWithoutSaveInOpenSection = () => {
    handleMcqNextWithoutSaveInOpenSection();
  };

  const handleMcqNextWithoutSaveInTimeSection = () => {
    const activeTimeSection = timeSections[currentTimeSectionIndex];
    const nxt = currentQuestionIndex + 1;
    if (nxt < (activeTimeSection?.questions || []).length) {
      setCurrentQuestionIndex(nxt);
    } else {
      showAlert("End of section questions. You can Advance Section or wait for timer to auto-advance.");
    }
  };

  const handleMcqClearInTimeSection = async (clearedPayload) => {
    const activeTimeSection = timeSections[currentTimeSectionIndex];
    if (!activeTimeSection) return;
    const qObj = getQuestionObj(activeTimeSection?.questions?.[currentQuestionIndex]);
    const qId = qObj?.id ?? activeTimeSection?.questions?.[currentQuestionIndex]?.id;
    if (!qId) return;
    storeAnswerForQuestion(activeTimeSection.id, qId, clearedPayload);
    setQuestionStates((prev) => ({
      ...prev,
      [activeTimeSection.id]: {
        ...prev[activeTimeSection.id],
        [qId]: {
          ...prev[activeTimeSection.id]?.[qId],
          viewed: true,
          solved: false,
        },
      },
    }));
  };

  const handleCodingSolvedInOpenSection = (submissionIds) => {
    const activeOpenSection = openSections.find((s) => s.id === currentOpenSectionId);
    if (!activeOpenSection) return;
    const qObj = getQuestionObj(activeOpenSection?.questions?.[currentOpenQuestionIndex]);
    const qId = qObj?.id ?? activeOpenSection?.questions?.[currentOpenQuestionIndex]?.id;
    if (!qId) return;

    const ids = (submissionIds || []).map(String);
    const unique = Array.from(new Set(ids));

    storeAnswerForQuestion(activeOpenSection.id, qId, unique);
    markQuestionSolved(activeOpenSection.id, qId);

    setSubmissionIdsByQuestion((prev) => {
      const next = { ...(prev || {}) };
      next[activeOpenSection.id] = { ...(next[activeOpenSection.id] || {}) };

      const prevIds = next[activeOpenSection.id][qId] || [];
      const merged = Array.from(new Set([...prevIds, ...unique]));

      next[activeOpenSection.id][qId] = merged;
      return next;
    });
  };

  const handleCodingSolvedInTimeSection = (submissionIds) => {
    const activeTimeSection = timeSections[currentTimeSectionIndex];
    if (!activeTimeSection) return;
    const qObj = getQuestionObj(activeTimeSection?.questions?.[currentQuestionIndex]);
    const qId = qObj?.id ?? activeTimeSection?.questions?.[currentQuestionIndex]?.id;
    if (!qId) return;

    const ids = (submissionIds || []).map(String);
    const unique = Array.from(new Set(ids));

    storeAnswerForQuestion(activeTimeSection.id, qId, unique);
    markQuestionSolved(activeTimeSection.id, qId);

    setSubmissionIdsByQuestion((prev) => {
      const next = { ...(prev || {}) };
      next[activeTimeSection.id] = { ...(next[activeTimeSection.id] || {}) };

      const prevIds = next[activeTimeSection.id][qId] || [];
      const merged = Array.from(new Set([...prevIds, ...unique]));

      next[activeTimeSection.id][qId] = merged;
      return next;
    });
  };

  const handleMcqClearInOpenSection = async (clearedPayload) => {
    const activeOpenSection = openSections.find((s) => s.id === currentOpenSectionId);
    if (!activeOpenSection) return;
    const qObj = getQuestionObj(activeOpenSection?.questions?.[currentOpenQuestionIndex]);
    const qId = qObj?.id ?? activeOpenSection?.questions?.[currentOpenQuestionIndex]?.id;
    if (!qId) return;
    storeAnswerForQuestion(activeOpenSection.id, qId, clearedPayload);
    setQuestionStates((prev) => ({
      ...prev,
      [activeOpenSection.id]: {
        ...prev[activeOpenSection.id],
        [qId]: {
          ...prev[activeOpenSection.id]?.[qId],
          viewed: true,
          solved: false,
        },
      },
    }));
  };

  const handleMcqNextWithoutSaveInOpenSection = () => {
    const active = openSections.find((s) => s.id === currentOpenSectionId);
    const nxt = currentOpenQuestionIndex + 1;
    if (nxt < (active?.questions || []).length) {
      setCurrentOpenQuestionIndex(nxt);
    } else {
      showAlert("End of section questions.");
    }
  };

  // navigation functions used by sidebar
  const handleNavigateTimeSection = (sectionId, questionIndex) => {
    const activeSection = timeSections[currentTimeSectionIndex];
    if (!activeSection) return;
    if (sectionId !== activeSection.id) return;
    setCurrentQuestionIndex(questionIndex);

    const qObj = activeSection?.questions?.[questionIndex];
    const qId = qObj?.id ?? qObj?.question_id ?? String(questionIndex);
    setQuestionStates((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [qId]: {
          ...prev[sectionId]?.[qId],
          viewed: true,
        },
      },
    }));
  };

  const handleNavigateOpen = (sectionId, questionIndex) => {
    setCurrentOpenSectionId(sectionId);
    setCurrentOpenQuestionIndex(questionIndex);
    const sec = (openSections.find((s) => s.id === sectionId) || {});
    const qObj = sec?.questions?.[questionIndex];
    const qId = qObj?.id ?? qObj?.question_id ?? String(questionIndex);
    setQuestionStates((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [qId]: {
          ...prev[sectionId]?.[qId],
          viewed: true,
        },
      },
    }));
  };

  const markQuestionSolved = (sectionId, questionId) => {
    if (!sectionId || !questionId) return;
    setQuestionStates((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [questionId]: {
          ...prev[sectionId]?.[questionId],
          viewed: true,
          solved: true,
        },
      },
    }));
  };

  // test timer global
  useEffect(() => {
    if (phase !== "test") return;
    if (secondsLeft == null) return;
    if (testTimerRef.current) clearInterval(testTimerRef.current);
    testTimerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          clearInterval(testTimerRef.current);
          console.log("Time up - auto-submitting test");
          if (!attemptSubmittedRef.current) {
            submitTestDirect();
          } else {
            setPhase("ended");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (testTimerRef.current) clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft]);

  // ---------- Violation helpers ----------
  const startViolationCountdown = () => {
    if (DEV_MODE) {
      console.log("[DEV_MODE] startViolationCountdown skipped");
      return;
    }
    if (violationTimerRef.current) return; // already running
    setViolationActive(true);
    setViolationCountdown(VIOLATION_SECONDS);
    violationTimerRef.current = setInterval(() => {
      setViolationCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(violationTimerRef.current);
          violationTimerRef.current = null;
          console.log("Violation timeout — auto-submitting test");
          setViolationActive(false);

          // best-effort: report final fullscreen violation with answers, let server handle auto-submission
          (async () => {
            try {
              const latestAnswers = payloadRef.current?.answers || {};
              const resp = await reportFullscreenViolation({ testId, answers: latestAnswers });
              if (handleServerAutoSubmit(resp)) return;
            } catch (e) {
              console.error("reportFullscreenViolation failed:", e);
            }
            // fallback: client-side direct submit as last resort
            if (!attemptSubmittedRef.current) {
              submitTestDirect();
            }
          })();

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearViolationCountdown = () => {
    if (violationTimerRef.current) {
      clearInterval(violationTimerRef.current);
      violationTimerRef.current = null;
    }
    setViolationActive(false);
    setViolationCountdown(VIOLATION_SECONDS);
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (insTimerRef.current) clearInterval(insTimerRef.current);
      if (testTimerRef.current) clearInterval(testTimerRef.current);
      if (autosaveRef.current) clearInterval(autosaveRef.current);
      if (violationTimerRef.current) clearInterval(violationTimerRef.current);
      if (sectionTimerRef.current) clearInterval(sectionTimerRef.current);
    };
  }, []);

  const humanTime = (s) => {
    if (s == null) return "--:--";
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (hrs > 0) return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(mins).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ------------------ Render -----------------
  if (phase === "instructions") {
    // Decide which instructions to show:
    // Prefer serverInstructions (if present), else fallback to local INSTRUCTIONS.
    const instructionsToShow = serverInstructions ?? INSTRUCTIONS;

    // Optionally, you could pass loading/error to InstructionPanel so it can show spinner/message
    return (
      <InstructionsPanel
        instructions={instructionsToShow}
        seconds={insSeconds}
        onStart={startTestPhase}
        enterFullscreen={enterFullscreenOnClick}
        isBlockedForFs={isBlockedForFs}
        showEnterFsButton={showEnterFsButton}
        humanTime={humanTime}
        // optional props so panel can show loading / error
        loading={instructionsLoading}
        error={instructionsError}
      />
    );
  }

  if (phase === "test") {
    if (payload?._error) {
      return (
        <div className="min-h-screen bg-[#1E1E1E] text-white p-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-red-500">Failed to load test</h2>
            <p className="text-[#CCCCCC]">{payload._error}</p>
          </div>
        </div>
      );
    }
    if (payloadLoading ) {
  // show a full-screen or inline loading state while payload is being fetched/initialized
  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-[#2D2D30] rounded-lg p-6 border" style={{ borderColor: BORDER }}>
          <LoadingSpinner label="Preparing your test — please wait…" />
        </div>
      </div>
    </div>
  );
}


    const testName = payload?.data?.test?.test_name ?? payload?.test_name ?? payload?.test?.test_name ?? "Test Attempt";

    const activeTimeSection = timeSections[currentTimeSectionIndex];
    const activeTimeQuestionObj = getQuestionObj(activeTimeSection?.questions?.[currentQuestionIndex]);

    const activeOpenSection = openSections.find(s => s.id === currentOpenSectionId);
    const activeOpenQuestionObj = getQuestionObj(activeOpenSection?.questions?.[currentOpenQuestionIndex]);

    return (
      <div className="bg-[#1E1E1E] min-h-screen text-white p-6 relative">
        <div className="flex justify-between mb-5">
          <div>
            <h2 className="m-0 text-xl">{testName}</h2>
          </div>
          <div className="text-right">
            <div className="text-[#CCCCCC] text-sm">Time Remaining</div>
            <div className="text-[#4CA466] font-extrabold text-lg">{humanTime(secondsLeft)}</div>
          </div>
        </div>

        <div className="flex gap-4">
          <div>
            <AttemptSidebar
              testData={payload}
              currentSection={openModeActive ? currentOpenSectionId : (activeTimeSection?.id ?? null)}
              currentQuestion={openModeActive ? currentOpenQuestionIndex : currentQuestionIndex}
              onNavigate={openModeActive ? handleNavigateOpen : handleNavigateTimeSection}
              mode={openModeActive ? "open" : "time"}
              completedSections={completedSections}
              questionStates={questionStates}
            />
          </div>

          <div className="flex-1">
            {!openModeActive && activeTimeSection && (
              <div className="bg-[#2D2D30] rounded-lg p-4 border" style={{ borderColor: BORDER }}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{activeTimeSection.name}</div>
                    <div className="text-[#CCCCCC] text-sm">{activeTimeSection.no_of_questions} questions • {activeTimeSection.duration} min</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[#CCCCCC] text-xs">Section time remaining</div>
                    <div className="text-[#4CA466] font-extrabold">{humanTime(sectionSecondsLeft)}</div>
                  </div>
                </div>

                <hr className="border-t" style={{ borderColor: BORDER, margin: '12px 0' }} />

                <div>
                
              
                  <div className="mt-3">
                    {activeTimeQuestionObj?.question_type === "mcq" ? (
                      <MCQQuestion
                      index={currentQuestionIndex+1}
                      
                        question={activeTimeQuestionObj}
                        onSolved={handleMcqSolvedInTimeSection}
                        onClear={handleMcqClearInTimeSection}
                        onNextWithoutSave={handleMcqNextWithoutSaveInTimeSection}
                        initialSelected={
                          getSavedAnswer(activeTimeSection.id, activeTimeSection?.questions?.[currentQuestionIndex], currentQuestionIndex) ?? null
                        }
                        autoSubmit={false}
                      />
                    ) : activeTimeQuestionObj?.question_type === "rearrange" ? (
                      <RearrangeQuestion
                        question={activeTimeQuestionObj}
                        onSolved={handleRearrangeSolvedInTimeSection}
                        onClear={handleRearrangeClearInTimeSection}
                        onNextWithoutSave={handleRearrangeNextWithoutSaveInTimeSection}
                        initialOrder={
                          getSavedAnswer(activeTimeSection.id, activeTimeSection?.questions?.[currentQuestionIndex], currentQuestionIndex) ?? null
                        }
                        isDrag={!!activeTimeQuestionObj?.is_drag_and_drop}
                      />
                    ) : activeTimeQuestionObj?.question_type === "coding" ? (
                      <CodeRunner
                        question={activeTimeQuestionObj}
                        loading={false}
                        error={false}
                        initialSubmissions={
                          submissionIdsByQuestion[activeTimeSection.id]?.[activeTimeQuestionObj?.id] ??
                          (getSavedAnswer(
                            activeTimeSection.id,
                            activeTimeSection?.questions?.[currentQuestionIndex],
                            currentQuestionIndex
                          ) ?? [])
                        }
                        onSubmit={(submissionIds) => handleCodingSolvedInTimeSection(submissionIds)}
                      />
                    ) : (
                      (activeTimeQuestionObj?.options || []).map((opt) => (
                        <div key={opt.option_id} className="p-2 rounded-md border mb-2" style={{ borderColor: BORDER }}>
                          {opt.value}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                 

                    <button
                      onClick={() => {
                        showConfirm("Advance to next section? You will not be able to return.")
                          .then((ok) => {
                            if (ok) manualAdvanceSection();
                          });
                      }}
                      className="px-3 py-2 rounded-md text-white bg-gray-700"
                    >
                      Advance Section
                    </button>
                  </div>
                </div>
              </div>
            )}

            {openModeActive && (
              <div className="bg-[#2D2D30] rounded-lg p-4 border" style={{ borderColor: BORDER }}>
                <div className="text-[#CCCCCC] mb-2">
                  Open sections — you can navigate freely between sections and questions.
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{activeOpenSection?.name ?? "Open Section"}</div>
                    <div className="text-[#CCCCCC] text-sm">{activeOpenSection?.no_of_questions ?? 0} questions</div>
                  </div>
                </div>

                <hr className="border-t" style={{ borderColor: BORDER, margin: '12px 0' }} />

                <div>
                  <div className="text-white font-semibold">
                    Q{currentOpenQuestionIndex + 1}. {activeOpenQuestionObj?.title ?? activeOpenQuestionObj?.question_text ?? "Question"}
                  </div>
                  <div className="text-[#CCCCCC] mt-2">
                    {activeOpenQuestionObj?.question_text}
                  </div>

                  <div className="mt-3">
                    {activeOpenQuestionObj?.question_type === "mcq" ? (
                      <MCQQuestion
                        question={activeOpenQuestionObj}
                        onSolved={handleMcqSolvedInOpenSection}
                        onClear={handleMcqClearInOpenSection}
                        onNextWithoutSave={handleMcqNextWithoutSaveInOpenSection}
                        initialSelected={
                          getSavedAnswer(activeOpenSection?.id, activeOpenSection?.questions?.[currentOpenQuestionIndex], currentOpenQuestionIndex) ?? null
                        }
                        autoSubmit={false}
                      />
                    ) : activeOpenQuestionObj?.question_type === "rearrange" ? (
                      <RearrangeQuestion
                        question={activeOpenQuestionObj}
                        onSolved={handleRearrangeSolvedInOpenSection}
                        onClear={handleRearrangeClearInOpenSection}
                        onNextWithoutSave={handleRearrangeNextWithoutSaveInOpenSection}
                        initialOrder={
                          getSavedAnswer(activeOpenSection?.id, activeOpenSection?.questions?.[currentOpenQuestionIndex], currentOpenQuestionIndex) ?? null
                        }
                        isDrag={!!activeOpenQuestionObj?.is_drag_and_drop}
                      />
                    ) : activeOpenQuestionObj?.question_type === "coding" ? (
                      <CodeRunner
                        question={activeOpenQuestionObj}
                        loading={false}
                        error={false}
                        initialSubmissions={
                          submissionIdsByQuestion[activeOpenSection?.id]?.[activeOpenQuestionObj?.id] ??
                          (getSavedAnswer(
                            activeOpenSection?.id,
                            activeOpenSection?.questions?.[currentOpenQuestionIndex],
                            currentOpenQuestionIndex
                          ) ?? [])
                        }
                        onSubmit={(submissionIds) => handleCodingSolvedInOpenSection(submissionIds)}
                      />
                    ) : (
                      (activeOpenQuestionObj?.options || []).map(opt => (
                        <div key={opt.option_id} className="p-2 rounded-md border mb-2" style={{ borderColor: BORDER }}>
                          {opt.value}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-4">
                    {activeOpenQuestionObj?.question_type !== "mcq" && (
                      <button
                        onClick={() => {
                          if (!activeOpenSection) return;
                          const qObj = getQuestionObj(activeOpenSection?.questions?.[currentOpenQuestionIndex]);
                          const qId = qObj?.id ?? activeOpenSection?.questions?.[currentOpenQuestionIndex]?.id;
                          if (qId) markQuestionSolved(activeOpenSection.id, qId);
                        }}
                        className="px-3 py-2 rounded-md text-white"
                        style={{ background: PRIMARY }}
                      >
                        Mark Solved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 flex gap-2">
           

              <button
                onClick={handleSubmitTest}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-md text-white"
                style={{ background: "#e63946" }}
              >
                {isSubmitting ? "Submitting..." : "Submit Test"}
              </button>
            </div>
          </div>
        </div>

        {showEnterFsButton && !violationActive && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 text-white p-6 flex-col">
            <h2 className="mb-3 text-2xl">Please enter fullscreen to continue</h2>
            <p className="text-[#CCCCCC] max-w-xl text-center">
              Your browser blocked automatic fullscreen. Click the button below to enter fullscreen and continue the test.
            </p>
            <button
              onClick={enterFullscreenOnClick}
              className="mt-5 px-5 py-3 bg-[#4CA466] rounded-lg text-white"
            >
              Enter Fullscreen & Continue
            </button>
          </div>
        )}

        {violationActive && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/92 z-50 text-white p-6 flex-col">
            <h2 className="text-red-500 mb-3">⚠ You left fullscreen!</h2>
            <p className="text-[#CCCCCC] mb-6">You have {violationCountdown} seconds to return to fullscreen or the test will end.</p>
            <button
              onClick={enterFullscreenOnClick}
              className="px-5 py-3 bg-[#4CA466] rounded-lg text-white"
            >
              Re-Enter Fullscreen
            </button>
          </div>
        )}
      </div>
    );
  }

  // Ended UI
  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white p-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2>Test Ended</h2>
        <p className="text-[#CCCCCC]">The test has ended. If this was unexpected, contact your administrator.</p>
      </div>
    </div>
  );
};

export default Attempt;
