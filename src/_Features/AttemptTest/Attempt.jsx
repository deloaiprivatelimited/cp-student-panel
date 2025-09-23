import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { privateAxios } from "../../utils/axios"; // adjust path if needed
import AttemptSidebar from "./AttemptSidebar";
import MCQQuestion from "./MCQQuestion"; // NEW: MCQ component
// import { useModal } from "../../utils/ModalUtils";
import RearrangeQuestion from "./RearrangeQuestion";
import CodeRunner from "../CodeRunner";
import { useModal } from "../../utils/ModalUtils";

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

/* ... (INSTRUCTIONS, constants remain unchanged) ... */
const INSTRUCTIONS = [
  {
    id: "ins-1",
    title: "Instruction 1",
    content:
      "Read these instructions carefully. This test is timed. Make sure you are seated in a distraction-free environment.",
  },
  {
    id: "ins-2",
    title: "Instruction 2",
    content:
      "Do not refresh the page or switch tabs during the test. If you leave fullscreen, you will receive a warning and the test may end.",
  },
  {
    id: "ins-3",
    title: "Instruction 3",
    content:
      "Keep your device charged and stable. Autosave will happen every few seconds. When you start the test, it will begin immediately.",
  },
];

const INSTRUCTION_TOTAL_SECONDS = 2; // 2 minutes (fixing original 2 -> seconds)
const VIOLATION_SECONDS = 3000; // kept smaller than original 3000; you can set back to 3000 if you want long grace
// --- Add near other state/refs at top of component ---
const MAX_TAB_SWITCHES = 5;
const Attempt = () => {
  const query = useQuery();
  const testId = query.get("testId");
const [submissionIdsByQuestion, setSubmissionIdsByQuestion] = useState({});
const [attemptSubmitted, setAttemptSubmitted] = useState(false);
const attemptSubmittedRef = useRef(false);
useEffect(() => { attemptSubmittedRef.current = attemptSubmitted; }, [attemptSubmitted]);

  // phase: 'instructions' | 'test' | 'ended'
  const [phase, setPhase] = useState("instructions");
// at top of component
// near top of component, with other state
const [isSubmitting, setIsSubmitting] = useState(false);
const [submittedResult, setSubmittedResult] = useState(null);

const [tabSwitchCount, setTabSwitchCount] = useState(0);
const tabSwitchCountRef = useRef(0);
const ATTEMPT_FETCH_URL = (testId) => `/api/students/test/attempt/${testId}`;
useEffect(() => { tabSwitchCountRef.current = tabSwitchCount; }, [tabSwitchCount]);
// --- Tab-switch / visibility tracking and enforcement ---
useEffect(() => {
  const onVisibility = () => {
    if (document.hidden) {
      // increment count whenever page becomes hidden (tab switch or minimize)
      setTabSwitchCount((prev) => {
        const next = prev + 1;
        // If threshold exceeded AND currently not in fullscreen, then report + auto-submit
        // Use the ref for current fullscreen state to avoid stale closure issues
        const isFs = !!document.fullscreenElement;
        // Only trigger when not fullscreen
        if (next > MAX_TAB_SWITCHES && !isFs) {
          // guard against double triggers
          if (!attemptSubmittedRef.current) {
            // send violation record to server (best-effort) and auto-submit
          
            // set violation UI state for user feedback (optional)
            setViolationActive(true);
            setViolationCountdown(5); // give tiny countdown so overlay shows briefly while submit proceeds
            // auto-submit immediately
            submitTestDirect();
          }
        }
        return next;
      });

      // also treat visibility change as leaving fullscreen if that is the case (you already do this elsewhere)
      if (phase === "instructions") {
        setIsBlockedForFs(true);
        setShowEnterFsButton(true);
        setFullscreenGranted(false);
      } else if (phase === "test" && fullscreenGranted) {
        startViolationCountdown();
      }
    } else {
      // page became visible again: clear violation countdown if any
      clearViolationCountdown();
    }
  };

  // Also listen for blur (some browsers/firewalls may not toggle document.hidden reliably)
  const onBlur = () => {
    setTabSwitchCount((prev) => {
      const next = prev + 1;
      if (next > MAX_TAB_SWITCHES && !document.fullscreenElement) {
        if (!attemptSubmittedRef.current) {
          reportViolation({
            type: "excessive-tab-switch",
            details: { tab_switches: next, message: "Window lost focus too many times and is not in fullscreen." },
          });
          setViolationActive(true);
          setViolationCountdown(5);
          submitTestDirect();
        }
      }
      return next;
    });
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onBlur);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("blur", onBlur);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [phase, fullscreenGranted, testId, payload]);

// track whether attempt is submitted so autosave/intervals stop

  // single instruction timer
  const [insSeconds, setInsSeconds] = useState(INSTRUCTION_TOTAL_SECONDS);
  const insTimerRef = useRef(null);
  const { showAlert, showConfirm } = useModal();

  // fullscreen requirement state
  const [fullscreenGranted, setFullscreenGranted] = useState(false);
  const [showEnterFsButton, setShowEnterFsButton] = useState(false);
  const [isBlockedForFs, setIsBlockedForFs] = useState(false); // overlay active when not fullscreen during instructions

  // test payload & global timer (total time left; kept for compatibility)
  const [payload, setPayload] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const testTimerRef = useRef(null);
  // keep a ref to the latest payload so intervals/closures can read fresh data
const payloadRef = useRef(null);

// ensure ref is always synced with state
useEffect(() => {
  payloadRef.current = payload;
}, [payload]);


  // ---------- NEW: time-restricted section management ----------
  const [timeSections, setTimeSections] = useState([]); // array of sections with __durationSeconds meta
  const [currentTimeSectionIndex, setCurrentTimeSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // index inside active section
  const [sectionSecondsLeft, setSectionSecondsLeft] = useState(null);
  const sectionTimerRef = useRef(null);
  const [completedSections, setCompletedSections] = useState(new Set());
  // questionStates keyed by sectionId -> questionId -> { viewed, solved }
  const [questionStates, setQuestionStates] = useState({}); // { [sectionId]: { [qId]: { viewed, solved } } }

  // open sections (kept after finishing time sections)
  const [openSections, setOpenSections] = useState([]);
  const [openModeActive, setOpenModeActive] = useState(false); // when true, show open sections in sidebar
  const [currentOpenSectionId, setCurrentOpenSectionId] = useState(null);
  const [currentOpenQuestionIndex, setCurrentOpenQuestionIndex] = useState(0);

  // violation handling (after test started)
  const [violationActive, setViolationActive] = useState(false);
  const [violationCountdown, setViolationCountdown] = useState(VIOLATION_SECONDS);
  const violationTimerRef = useRef(null);

  // autosave
  const autosaveRef = useRef(null);

  // ---------- instruction timer: runs only while phase === 'instructions' and fullscreen is active ----------
  useEffect(() => {
    if (phase !== "instructions") return;

    // if not fullscreen, do not start timer (it will be started when fullscreen restored)
    if (!fullscreenGranted) {
      // show overlay and pause timer
      setIsBlockedForFs(true);
      return;
    }

    setIsBlockedForFs(false);

    // start or continue timer
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

  // ---------- attempt to request fullscreen on mount (instructions) ----------
  useEffect(() => {
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

    // only try when showing instructions
    if (phase === "instructions") {
      // small timeout to let render happen
      setTimeout(tryFs, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // fullscreen change listener (works for both instruction & test phase)
  useEffect(() => {
    const onFsChange = () => {
      const isFs = !!document.fullscreenElement;
      if (!isFs) {
        console.log("[FS] Not in fullscreen");
        setFullscreenGranted(false);
        // behavior depends on phase
        if (phase === "instructions") {
          // block and pause instruction timer
          setIsBlockedForFs(true);
          setShowEnterFsButton(true);
        } else if (phase === "test") {
          // start violation countdown in test phase
          startViolationCountdown();
        }
      } else {
        console.log("[FS] Entered fullscreen");
        setFullscreenGranted(true);
        setShowEnterFsButton(false);
        setIsBlockedForFs(false);
        // clear violation if any
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
  }, [phase]);

  // visibility change (treat as leaving fullscreen)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        console.log("[Visibility] document hidden");
        if (phase === "instructions") {
          setIsBlockedForFs(true);
          setShowEnterFsButton(true);
          setFullscreenGranted(false);
        } else if (phase === "test" && fullscreenGranted) {
          startViolationCountdown();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, fullscreenGranted]);

  // ---------- Enter fullscreen by user click ----------
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
      // resume instruction timer if in instructions
    } catch (err) {
      console.warn("User fullscreen attempt failed", err);
      showAlert("Could not enter fullscreen. Please check browser settings or try a different browser.");
    }
  };


// --- add this effect near your other effects ---

// stop autosave when attempt is submitted
useEffect(() => {
  if (attemptSubmitted) {
    if (autosaveRef.current) {
      clearInterval(autosaveRef.current);
      autosaveRef.current = null;
      console.log("[Autosave] stopped due to submission");
    }
  }
}, [attemptSubmitted]);
// Direct submit (no confirmation). Re-usable by violation timeout & time-up.
// Direct submit (no confirmation before sending). Re-usable by violation timeout & time-up.
const submitTestDirect = async () => {
  try {
    // prevent double-submit
    if (attemptSubmittedRef.current) {
      console.log("[SubmitDirect] already submitted, skipping");
      return;
    }
    attemptSubmittedRef.current = true;
    setAttemptSubmitted(true);
    setIsSubmitting(true);

    // stop autosave immediately
    if (autosaveRef.current) {
      clearInterval(autosaveRef.current);
      autosaveRef.current = null;
      console.log("[Autosave] stopped due to direct submission");
    }

    // make request -- mirror handleSubmitTest payload (adjust if backend expects different shape)
    const resp = await privateAxios.post("/api/students/test/submit", {
      test_id: testId,
      answers: payload?.answers || {},
    });

    if (resp?.data?.success) {
      setSubmittedResult(resp.data.data ?? resp.data);
      setPhase("ended");

      // Use showConfirm so user explicitly acknowledges success before we close the window
      showConfirm("Test submitted successfully!")
        .then((ok) => {
          // If user clicked OK (ok === true), try to close the window
          try {
            if (ok) window.close();
          } catch (e) {
            // ignore - many browsers block window.close() for tabs not opened by script
            console.warn("Window close failed", e);
          }
        })
        .catch(() => {
          // If modal was dismissed (or promise rejected), still end the flow
          try { window.close(); } catch (e) {}
        });
    } else {
      // submission failed - allow retry (clear attemptSubmittedRef so manual submit possible)
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


  // ---------- Start test: fetch payload and initialize section timers ----------
  const startTestPhase = async () => {
    setPhase("test");
    try {
      const resp = await privateAxios.get(ATTEMPT_FETCH_URL(testId));
      if (!resp?.data?.success) throw new Error(resp?.data?.message || "Failed to fetch attempt");
      const data = resp.data.data ?? resp.data;
      setPayload(data);

      // extract time-restricted sections and open sections
      const testObj = data?.test ?? data?.data?.test ?? data;
      const timeSecs = (testObj?.sections_time_restricted || []).map((s) => ({
        ...s,
        __durationSeconds: (Number(s.duration) || 0) * 60,
      }));
      const opens = (testObj?.sections_open || []).map((s) => ({ ...s }));

      // --- Hydrate question.answer from any saved answers in server payload (back-compat)
      // Expect savedAnswers shape: { [sectionId]: { [questionId]: [...] } } 
      // but also support numeric-index keys for backward compat.
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

      // init question states for time sections and open sections (keyed by questionId)
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

      // set global duration as before for compatibility (optional)
      const duration =
        testObj?.duration_seconds ??
        (timeSecs.reduce((s, sec) => s + (sec.__durationSeconds || 0), 0) +
          opens.reduce((s, sec) => s + 0, 0)) ??
        (testObj?.end_datetime ? Math.max(0, Math.floor((new Date(testObj.end_datetime).getTime() - Date.now()) / 1000)) : null) ??
        3600;
      setSecondsLeft(duration);

      // initialize first section timer if exists
      if (timeSecs.length > 0) {
        setCurrentTimeSectionIndex(0);
        setSectionSecondsLeft(timeSecs[0].__durationSeconds || 0);
        setCurrentQuestionIndex(0);
        setOpenModeActive(false);
      } else {
        // no time sections -> open mode immediately
        setOpenModeActive(true);
        setCurrentOpenSectionId(opens[0]?.id ?? null);
      }

      // try to request fullscreen again (best-effort); if blocked, show CTA (we treat fullscreen strongly)
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

      // start autosave placeholder (keep interval same)
  // start autosave placeholder (keep interval same)
// use payloadRef.current so we always get the latest payload inside the interval
    if (autosaveRef.current) clearInterval(autosaveRef.current);
    autosaveRef.current = setInterval(() => {
    const latest = payloadRef.current;
    console.log("[Autosave] latest payload (from ref):", latest);
    console.log("[Autosave] testId:", testId, "timestamp:", new Date().toISOString(), "answers:", (latest?.answers ?? {}));
    // Optionally: send payload to server here (debounce or batch in production)
    // only attempt save when we actually have an attempt id
    if (latest?.test_assignment_id) {
        privateAxios.post('/api/students/test/auto-save', { attemptId: latest.test_assignment_id, answers: latest.answers,test_id:testId })
        .catch((err) => console.error("Autosave failed", err));
    }
    }, 5000);

    } catch (err) {
      console.error("Failed to fetch test payload:", err);
      setPayload({ _error: err.message || "Failed to fetch test" });
    }
  };

  // ---------- Section timer: runs only while in time mode ----------
  useEffect(() => {
    // only run when in test phase and not in open mode, and we have a sectionSecondsLeft
    if (phase !== "test" || openModeActive) return;
    if (sectionSecondsLeft == null) return;

    // clear existing
    if (sectionTimerRef.current) clearInterval(sectionTimerRef.current);
    sectionTimerRef.current = setInterval(() => {
      setSectionSecondsLeft((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          clearInterval(sectionTimerRef.current);
          // mark section completed and advance
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
      // nothing to do - switch into open mode if no sections left
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
      // move to next time section
      setCurrentTimeSectionIndex(nextIndex);
      setCurrentQuestionIndex(0);
      setSectionSecondsLeft(timeSections[nextIndex].__durationSeconds || 0);
    } else {
      // finished all time sections -> switch to open mode
      setOpenModeActive(true);
      setCurrentOpenSectionId(openSections[0]?.id ?? null);
      setSectionSecondsLeft(null);
    }
  };

  // Manual advance: user may choose to advance to next time section before timer ends, but cannot come back
  const manualAdvanceSection = () => {
    const current = timeSections[currentTimeSectionIndex];
    if (!current) {
      // if no current section, switch to open
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
      // all done
      setOpenModeActive(true);
      setCurrentOpenSectionId(openSections[0]?.id ?? null);
      setSectionSecondsLeft(null);
    }
  };
// Manual submit (keeps the pre-submit confirmation) but uses showConfirm for success acknowledgement.
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

      // Show success using showConfirm and close window when user presses OK
      showConfirm("Test submitted successfully!").then((userOk) => {
        try {
          if (userOk) window.close();
        } catch (e) {
          console.warn("Window close failed", e);
        }
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


  // Navigation within active time section (both directions allowed)
  // signature maintained: (sectionId, questionIndex)
  const handleNavigateTimeSection = (sectionId, questionIndex) => {
    const activeSection = timeSections[currentTimeSectionIndex];
    if (!activeSection) return;
    // only allow navigation inside active section (both directions)
    if (sectionId !== activeSection.id) return;
    setCurrentQuestionIndex(questionIndex);

    // mark viewed by questionId
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

  // Open-mode navigation (free) - signature maintained: (sectionId, questionIndex)
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

  // Mark question solved helper (now accepts questionId)
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
        // Use the direct submit so answers get posted
        if (!attemptSubmittedRef.current) {
          submitTestDirect();
        } else {
          // if already submitted for some reason, ensure phase is ended
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

  // ---------- Violation helpers (test phase) ----------
  const startViolationCountdown = () => {
    if (violationActive) return;
    setViolationActive(true);
    setViolationCountdown(VIOLATION_SECONDS);
    violationTimerRef.current = setInterval(() => {
      setViolationCountdown((prev) => {
       if (prev <= 1) {
            clearInterval(violationTimerRef.current);
            console.log("Violation timeout — auto-submitting test");
            setViolationActive(false);
            // call auto-submit (guarded against double submissions)
            if (!attemptSubmittedRef.current) {
                submitTestDirect();
            }
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

  // helpers
  const humanTime = (s) => {
    if (s == null) return "--:--";
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (hrs > 0) return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(mins).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ------------------ QUESTION NORMALIZATION HELPER ------------------
  // Accepts either: { question: { ... } } OR the question object itself
  const getQuestionObj  = (qWrapper) => {
    if (!qWrapper) return null;
    const inner = qWrapper.question ?? qWrapper;

    // question_type may live on the wrapper (qWrapper.question_type) — use that first,
    // otherwise fallback to inner.question_type or inner.type
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
  console.log(sec);
  if (!sec) return null;

  const q = (sec.questions || []).find((qq, idx) => {
    const inner = qq?.question ?? qq;  // support wrapper shape
    const qId = inner?.id ?? inner?.question_id ?? String(idx);
    return String(qId) === String(questionId);
  });

//   console.log("question is");
//   console.log(q);

  if (!q) return null;

  // prefer wrapper.question_type, then inner.question_type, then type
  const inner = q?.question ?? q;
  return q?.question_type ?? inner?.question_type ?? q?.type ?? inner?.type ?? null;
};


  // ----------------- NEW: Persist answers keyed by questionId -----------------
  // Store answer into payload.answers[sectionId][questionId] (always an array of option_id strings)
 // Replace existing storeAnswerForQuestion with this version
const storeAnswerForQuestion = (sectionId, questionId, answer) => {
  if (!sectionId || !questionId) return;

  // normalize incoming to array (could be a single id or array)
  const incoming = Array.isArray(answer) ? answer.map(String) : (answer ? [String(answer)] : []);
  const qType = findQuestionType(sectionId, questionId);

  setPayload((prev) => {
    const next = prev ? { ...prev } : {};
    next.answers = next.answers ? { ...next.answers } : {};
    next.answers[sectionId] = next.answers[sectionId] ? { ...next.answers[sectionId] } : {};

    const existingRaw = next.answers[sectionId][questionId];

    // unwrap existing (support legacy object { value: [...], qwell } or raw array)
    const existingArray = (() => {
      if (existingRaw == null) return [];
      if (Array.isArray(existingRaw)) return existingRaw.map(String);
      if (typeof existingRaw === "object" && Array.isArray(existingRaw.value)) return existingRaw.value.map(String);
      // fallback: scalar
      return [String(existingRaw)];
    })();

    // If coding question, merge (append) and dedupe; otherwise replace
    if (qType === "coding") {
      const merged = Array.from(new Set([...existingArray, ...incoming]));
      // Keep legacy metadata shape (value + qwell) to remain backward compatible
      next.answers[sectionId][questionId] = { value: merged, qwell: qType ?? null };
    } else {
        console.log("incoming",incoming)
      // For non-coding questions we keep original behavior (store value with qwell metadata)
      next.answers[sectionId][questionId] = { value: incoming, qwell: qType ?? null };
    }

    return next;
  });

  // 2) Update in-memory question arrays so question objects hold the answer.
  //    For coding we store the merged array; for others we store incoming array.
  const toStoreForUI = (() => {
    // determine existing in-memory value for merging if coding
    const findCurrent = () => {
      // look in timeSections first
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


  // Helper to read saved answer for a question (prefers in-memory question.answer then payload map by id)
  // Helper to read saved answer for a question (prefers in-memory question.answer then payload map by id)
  // Always normalizes returned answer IDs to an array of strings (or null if no answer).
  const getSavedAnswer = (sectionId, questionObj, fallbackIndex = null) => {
    const unwrap = (raw) => {
      if (raw == null) return null;
      // support legacy object shape { value: [...] }
      if (typeof raw === "object" && Array.isArray(raw.value)) {
        return raw.value.map((v) => String(v));
      }
      if (Array.isArray(raw)) return raw.map((v) => String(v));
      // fallback: scalar
      return [String(raw)];
    };

    // If no sectionId or questionObj provided, attempt to return fallback if present
    if (!sectionId || !questionObj) {
      if (fallbackIndex != null && payload?.answers?.[sectionId]) {
        return unwrap(payload?.answers?.[sectionId]?.[String(fallbackIndex)] ?? null);
      }
      return null;
    }
    // console.log(questionObj)

    // determine question id (robust to different key names)
    const qId = questionObj.question.id ?? questionObj.question_id ?? questionObj.questionId ?? null;
    // console.log("qid",qId)
    // prefer in-memory question.answer first
    const rawFromQuestion = questionObj.answer ?? null;
    if (rawFromQuestion != null) {
      return unwrap(rawFromQuestion);
    }

    // then try payload map (payload.answers[sectionId][qId])
    const rawFromPayload = payload?.answers?.[sectionId]?.[qId] ?? payload?.answers?.[sectionId]?.[String(qId)] ?? null;
    if (rawFromPayload != null) {
      return unwrap(rawFromPayload);
    }

    // final fallback: try numeric index, if provided
    if (fallbackIndex != null) {
      return unwrap(payload?.answers?.[sectionId]?.[String(fallbackIndex)] ?? null);
    }

    return null;
  };


  // Helper to advance to next question inside a time section
  const advanceToNextQuestionInTimeSection = () => {
    const nxt = currentQuestionIndex + 1;
    const activeTimeSection = timeSections[currentTimeSectionIndex];
    if (nxt < (activeTimeSection?.questions || []).length) {
      setCurrentQuestionIndex(nxt);
    } else {
      // reached end of section - user can manual advance or wait for timer
      showAlert("End of section questions. You can Advance Section or wait for timer to auto-advance.");
    }
  };

  // ---------- Handlers: MCQ / Rearrange / Clear (time-mode & open-mode) ----------
  // Time-mode MCQ solved
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

  // Open-mode MCQ solved
  const handleMcqSolvedInOpenSection = (answerPayload) => {
    const activeOpenSection = openSections.find((s) => s.id === currentOpenSectionId);
    if (!activeOpenSection) return;
    const qObj = getQuestionObj(activeOpenSection?.questions?.[currentOpenQuestionIndex]);
    const qId = qObj?.id ?? activeOpenSection?.questions?.[currentOpenQuestionIndex]?.id;
    if (!qId) return;

    storeAnswerForQuestion(activeOpenSection.id, qId, answerPayload);
    markQuestionSolved(activeOpenSection.id, qId);
  };

  // Rearrange time-mode
  const handleRearrangeSolvedInTimeSection = (orderArray) => {
    const activeTimeSection = timeSections[currentTimeSectionIndex];
    if (!activeTimeSection) return;
    const qObj = getQuestionObj(activeTimeSection?.questions?.[currentQuestionIndex]);
    const qId = qObj?.id ?? activeTimeSection?.questions?.[currentQuestionIndex]?.id;
    if (!qId) return;
    storeAnswerForQuestion(activeTimeSection.id, qId, orderArray);
    markQuestionSolved(activeTimeSection.id, qId);
    // After saving, advance to next question in time section
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

  // Open-mode rearrange
  const handleRearrangeSolvedInOpenSection = (orderArray) => {
    const activeOpenSection = openSections.find((s) => s.id === currentOpenSectionId);
    if (!activeOpenSection) return;
    const qObj = getQuestionObj(activeOpenSection?.questions?.[currentOpenQuestionIndex]);
    const qId = qObj?.id ?? activeOpenSection?.questions?.[currentOpenQuestionIndex]?.id;
    if (!qId) return;
    storeAnswerForQuestion(activeOpenSection.id, qId, orderArray);
    markQuestionSolved(activeOpenSection.id, qId);
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

  // Next without saving for time-mode: just advance locally (no store)
  const handleMcqNextWithoutSaveInTimeSection = () => {
    const activeTimeSection = timeSections[currentTimeSectionIndex];
    const nxt = currentQuestionIndex + 1;
    if (nxt < (activeTimeSection?.questions || []).length) {
      setCurrentQuestionIndex(nxt);
    } else {
      showAlert("End of section questions. You can Advance Section or wait for timer to auto-advance.");
    }
  };

  // CLEAR handler for time-mode: persist an empty answer but DO NOT advance
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
    // do NOT advance currentQuestionIndex
  };
const handleCodingSolvedInOpenSection = (submissionIds) => {
  const activeOpenSection = openSections.find((s) => s.id === currentOpenSectionId);
  if (!activeOpenSection) return;
  const qObj = getQuestionObj(activeOpenSection?.questions?.[currentOpenQuestionIndex]);
  const qId = qObj?.id ?? activeOpenSection?.questions?.[currentOpenQuestionIndex]?.id;
  if (!qId) return;

  // normalize & dedupe
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

  // normalize incoming ids to strings and dedupe
  const ids = (submissionIds || []).map(String);
  const unique = Array.from(new Set(ids));

  // persist answer (keeps your existing storage shape)
  storeAnswerForQuestion(activeTimeSection.id, qId, unique);
  markQuestionSolved(activeTimeSection.id, qId);

  // update local map so UI (SubmissionsTabs via CodeRunner initialSubmissions) refreshes
setSubmissionIdsByQuestion((prev) => {
  const next = { ...(prev || {}) };
  next[activeTimeSection.id] = { ...(next[activeTimeSection.id] || {}) };

  const prevIds = next[activeTimeSection.id][qId] || [];
  const merged = Array.from(new Set([...prevIds, ...unique]));

  next[activeTimeSection.id][qId] = merged;
  return next;
});


  // optionally auto-advance:
  // advanceToNextQuestionInTimeSection();
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
    // don't change currentOpenQuestionIndex
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

  // ---------------- Render -----------------
  // Instructions phase UI: show all 3 instructions and 2-min timer; block interaction unless fullscreen
  if (phase === "instructions") {
    return (
      <div className="min-h-screen bg-[#1E1E1E] text-white p-6 relative">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="m-0 text-xl font-semibold">Please read the instructions</h1>
              <div className="text-[#CCCCCC] mt-1 text-sm">All instructions must be visible for at least 2 minutes.</div>
            </div>
            <div className="text-right">
              <div className="text-[#CCCCCC] text-xs">Time before test can be started</div>
              <div className="text-[#4CA466] font-extrabold text-lg">{humanTime(insSeconds)}</div>
            </div>
          </div>

          <div className="grid gap-3">
            {INSTRUCTIONS.map((ins) => (
              <div key={ins.id} className="bg-[#2D2D30] border rounded-lg p-4" style={{ borderColor: BORDER }}>
                <div className="flex justify-between items-center">
                  <div className="font-semibold">{ins.title}</div>
                </div>
                <p className="text-[#CCCCCC] mt-2">{ins.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="text-[#CCCCCC]">You must be in fullscreen during instructions. The timer pauses if you exit fullscreen.</div>
            <div>
              <button
                onClick={startTestPhase}
                disabled={insSeconds > 0}
                className={`px-4 py-2 rounded-lg text-white border-0 ${insSeconds > 0 ? "bg-gray-600 cursor-not-allowed" : "bg-[#4CA466] cursor-pointer"}`}
              >
                {insSeconds > 0 ? `Wait ${humanTime(insSeconds)}` : "Start Test"}
              </button>
            </div>
          </div>
        </div>

        {/* Overlay when not fullscreen during instructions */}
        {(isBlockedForFs || showEnterFsButton) && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center flex-col text-white p-6">
            <h2 className="mb-3 text-2xl">Fullscreen Required</h2>
            <p className="text-[#CCCCCC] text-center max-w-2xl">
              Fullscreen is required to view and start the test. Please click the button below to enter fullscreen.
              The instruction timer will resume after you enter fullscreen.
            </p>
            <button
              onClick={enterFullscreenOnClick}
              className="mt-5 px-5 py-3 bg-[#4CA466] rounded-lg text-white"
            >
              Enter Fullscreen
            </button>
          </div>
        )}
      </div>
    );
  }

  // Test phase UI
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

    const testName = payload?.data?.test?.test_name ?? payload?.test_name ?? payload?.test?.test_name ?? "Test Attempt";
    const instructionsText = payload?.data?.test?.instructions ?? payload?.instructions ?? payload?.test?.instructions ?? "";

    // Active time section & question for render
    const activeTimeSection = timeSections[currentTimeSectionIndex];
    const activeTimeQuestionObj = getQuestionObj(activeTimeSection?.questions?.[currentQuestionIndex]);

    // Active open section & question
    const activeOpenSection = openSections.find(s => s.id === currentOpenSectionId);
    const activeOpenQuestionObj = getQuestionObj(activeOpenSection?.questions?.[currentOpenQuestionIndex]);

    return (
      <div className="bg-[#1E1E1E] min-h-screen text-white p-6 relative">
        <div className="flex justify-between mb-5">
          <div>
            <h2 className="m-0 text-xl">{testName}</h2>
            <p className="text-[#CCCCCC] mt-1">{instructionsText}</p>
          </div>
          <div className="text-right">
            <div className="text-[#CCCCCC] text-sm">Time Remaining</div>
            <div className="text-[#4CA466] font-extrabold text-lg">{humanTime(secondsLeft)}</div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex gap-4">
          {/* Sidebar */}
          <div >
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

          {/* Content column */}
          <div className="flex-1">
            {/* If in time mode show current time section UI */}
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
                  <div className="text-white font-semibold">
                    Q{currentQuestionIndex + 1}. {activeTimeQuestionObj?.title ?? activeTimeQuestionObj?.question_text ?? "Question"}
                  </div>
                  <div className="text-[#CCCCCC] mt-2">
                    {activeTimeQuestionObj?.question_text}
                  </div>

                  {/* options: if MCQ -> render MCQQuestion, else fallback to previous generic rendering */}
            {/* inside time-mode options area */}
<div className="mt-3">
  {activeTimeQuestionObj?.question_type === "mcq" ? (
    <MCQQuestion
      question={activeTimeQuestionObj}
      onSolved={handleMcqSolvedInTimeSection}
      onClear={handleMcqClearInTimeSection}
      onNextWithoutSave={handleMcqNextWithoutSaveInTimeSection}
      initialSelected={
        // prefer in-memory question.answer, otherwise payload map by qId
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
      isDrag={!!activeTimeQuestionObj?.is_drag_and_drop} // true => drag/drop, false => up/down buttons
    />
  )  : activeTimeQuestionObj?.question_type === "coding" ? (
    <CodeRunner
      question={activeTimeQuestionObj}
      loading={false}
      error={false}
  initialSubmissions={
  // prefer live state map, fallback to saved answer
  submissionIdsByQuestion[activeTimeSection.id]?.[activeTimeQuestionObj?.id] ??
  (getSavedAnswer(
    activeTimeSection.id,
    activeTimeSection?.questions?.[currentQuestionIndex],
    currentQuestionIndex
  ) ?? [])
}
onSubmit={(submissionIds) => handleCodingSolvedInTimeSection(submissionIds)}
    
    />
  ): (
    // fallback for other types
    (activeTimeQuestionObj?.options || []).map((opt) => (
      <div key={opt.option_id} className="p-2 rounded-md border mb-2" style={{ borderColor: BORDER }}>
        {opt.value}
      </div>
    ))
  )}
</div>


                  <div className="mt-4 flex gap-2">
                    {/* If question is MCQ we remove the explicit Mark Solved & Next Q button (selection auto-solves).
                        For non-MCQ show the existing Mark Solved & Next Q button as before. */}
                    {activeTimeQuestionObj?.question_type !== "mcq" && (
                      <button
                        onClick={() => {
                          // mark solved & move to next question if present
                          const qObj = getQuestionObj(activeTimeSection?.questions?.[currentQuestionIndex]);
                          const qId = qObj?.id ?? activeTimeSection?.questions?.[currentQuestionIndex]?.id;
                          if (qId) markQuestionSolved(activeTimeSection.id, qId);

                          const nxt = currentQuestionIndex + 1;
                          if (nxt < (activeTimeSection.questions || []).length) {
                            setCurrentQuestionIndex(nxt);
                          } else {
                            // end of section; user can manually advance or wait for timer.
                            showAlert("End of section questions. You can Advance Section or wait for timer to auto-advance.");
                          }
                        }}
                        className="px-3 py-2 rounded-md text-white"
                        style={{ background: PRIMARY }}
                      >
                        Mark Solved & Next Q
                      </button>
                    )}

                    <button
                      onClick={() => {
                        // manual advance current section
  showConfirm("Advance to next section? You will not be able to return.")
    .then((ok) => {
      if (ok) manualAdvanceSection();
    });                      }}
                      className="px-3 py-2 rounded-md text-white bg-gray-700"
                    >
                      Advance Section
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* If in open mode show open-section UI */}
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
  ): activeOpenQuestionObj?.question_type === "coding" ? (
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
                    {/* For non-MCQ keep manual Mark Solved button */}
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

            {/* Manual controls common area */}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  console.log("[Manual Save] testId:", testId);
                  console.log("Payload snapshot:", payload);
                  // Example: persist payload to server
                  // privateAxios.post('/api/students/test/save-answers', { attemptId: payload.id, answers: payload.answers })
                  showAlert("Saved (console.log)");
                }}
                className="px-3 py-2 rounded-md text-white"
                style={{ background: PRIMARY }}
              >
                Save
              </button>

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

        {/* Fullscreen CTA if auto failed */}
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

        {/* Violation overlay */}
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
