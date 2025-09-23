import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { privateAxios } from '../../utils/axios';
import TestSidebar from '../components/TestSidebar'; // adjust path
const ATTEMPT_FETCH_URL = (testId) => `/api/students/test/attempt/${testId}`;

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const AttemptTimed = () => {
  const query = useQuery();
  const testId = query.get('testId');
  const navigate = useNavigate();

  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // time sections
  const [timeSections, setTimeSections] = useState([]);
  const [currentTimeSectionIndex, setCurrentTimeSectionIndex] = useState(0);
  const [sectionSecondsLeft, setSectionSecondsLeft] = useState(null);
  const sectionTimerRef = useRef(null);

  // completed sections
  const [completedSections, setCompletedSections] = useState(new Set());

  // question navigation state (within current section)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState({});

  // fetch payload on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    privateAxios.get(ATTEMPT_FETCH_URL(testId))
      .then(resp => {
        if (!mounted) return;
        if (!resp?.data?.success) {
          throw new Error(resp?.data?.message || 'Failed to fetch attempt');
        }
        const data = resp.data.data || resp.data;
        const testObj = data?.test || data?.data?.test || data;
        const timeSecs = (testObj?.sections_time_restricted || []).map(s => {
          return {
            ...s,
            __durationSeconds: (Number(s.duration) || 0) * 60
          };
        });
        setPayload(data);
        setTimeSections(timeSecs);
        if (timeSecs.length > 0) {
          setSectionSecondsLeft(timeSecs[0].__durationSeconds);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [testId]);

  // initialize questionStates when payload/timeSections ready
  useEffect(() => {
    if (!timeSections || timeSections.length === 0) return;
    const init = {};
    timeSections.forEach(section => {
      init[section.id] = {};
      (section.questions || []).forEach((_, idx) => {
        init[section.id][idx] = { viewed: false, solved: false };
      });
    });
    setQuestionStates(init);
    setCurrentQuestionIndex(0);
  }, [timeSections]);

  // section timer: runs only for the currentTimeSectionIndex
  useEffect(() => {
    if (sectionTimerRef.current) {
      clearInterval(sectionTimerRef.current);
      sectionTimerRef.current = null;
    }
    if (sectionSecondsLeft == null) return;

    sectionTimerRef.current = setInterval(() => {
      setSectionSecondsLeft(prev => {
        if (prev == null) return null;
        if (prev <= 1) {
          clearInterval(sectionTimerRef.current);
          // mark completed and advance
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
  }, [currentTimeSectionIndex, sectionSecondsLeft]);

  const markCurrentSectionCompletedAndAdvance = () => {
    const current = timeSections[currentTimeSectionIndex];
    if (!current) return;
    setCompletedSections(prev => {
      const next = new Set(prev);
      next.add(current.id);
      return next;
    });

    // auto advance to next time section if exists
    const nextIndex = currentTimeSectionIndex + 1;
    if (nextIndex < timeSections.length) {
      setCurrentTimeSectionIndex(nextIndex);
      setCurrentQuestionIndex(0);
      setSectionSecondsLeft(timeSections[nextIndex].__durationSeconds || 0);
    } else {
      // all time-restricted sections completed -> move to open page
      navigate(`/attempt/open?testId=${encodeURIComponent(testId)}`);
    }
  };

  // manual advance (allowed before timer end). Cannot go back to previous sections.
  const manualAdvanceSection = () => {
    const nextIndex = currentTimeSectionIndex + 1;
    if (nextIndex < timeSections.length) {
      // mark current as completed and move on
      setCompletedSections(prev => {
        const next = new Set(prev);
        next.add(timeSections[currentTimeSectionIndex].id);
        return next;
      });
      setCurrentTimeSectionIndex(nextIndex);
      setCurrentQuestionIndex(0);
      setSectionSecondsLeft(timeSections[nextIndex].__durationSeconds || 0);
    } else {
      // finished time sections -> go to open page
      setCompletedSections(prev => {
        const next = new Set(prev);
        next.add(timeSections[currentTimeSectionIndex].id);
        return next;
      });
      navigate(`/attempt/open?testId=${encodeURIComponent(testId)}`);
    }
  };

  // handlers for question navigation inside current section
  const handleNavigate = (sectionId, questionIndex) => {
    // only allow navigation inside the active section (both directions)
    const activeSection = timeSections[currentTimeSectionIndex];
    if (!activeSection) return;
    if (sectionId !== activeSection.id) return;
    setCurrentQuestionIndex(questionIndex);
    setQuestionStates(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [questionIndex]: {
          ...prev[sectionId]?.[questionIndex],
          viewed: true
        }
      }
    }));
  };

  const markQuestionSolved = (sectionId, questionIndex) => {
    setQuestionStates(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [questionIndex]: {
          viewed: true,
          solved: true
        }
      }
    }));
  };

  if (loading) {
    return <div className="p-8 text-white">Loading...</div>;
  }
  if (error) {
    return <div className="p-8 text-red-400">Error: {error}</div>;
  }
  if (!payload) {
    return <div className="p-8 text-white">No payload</div>;
  }

  const activeSection = timeSections[currentTimeSectionIndex];
  const currentQuestion = activeSection?.questions?.[currentQuestionIndex]?.question;

  return (
    <div style={{ background: '#1E1E1E', minHeight: '100vh', color: '#fff' }}>
      <TestSidebar
        testData={payload}
        currentSection={activeSection?.id}
        currentQuestion={currentQuestionIndex}
        onNavigate={handleNavigate}
        mode="time"
        completedSections={completedSections}
        questionStates={questionStates}
      />

      <div style={{ marginLeft: isNaN(0) ? 80 : 80, padding: 24, maxWidth: 1100 }}>
        <h2>{payload?.test_name || payload?.data?.test?.test_name || 'Timed Sections'}</h2>
        <div style={{ color: '#CCCCCC', marginBottom: 12 }}>
          You must complete the time-restricted sections first. Sections are sequential and cannot be returned to once completed.
        </div>

        <div style={{ background: '#2D2D30', padding: 16, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{activeSection?.name || 'No active section'}</div>
              <div style={{ color: '#999', fontSize: 13 }}>{activeSection?.no_of_questions || 0} questions</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#999', fontSize: 12 }}>Section time remaining</div>
              <div style={{ color: '#4CA466', fontWeight: 700 }}>{formatTime(sectionSecondsLeft)}</div>
            </div>
          </div>

          <hr style={{ borderColor: '#3E3E42', margin: '12px 0' }} />

          <div>
            <div style={{ color: '#fff', fontWeight: 600 }}>
              Q{currentQuestionIndex + 1}. {currentQuestion?.title || '—'}
            </div>
            <div style={{ color: '#CCCCCC', marginTop: 8 }}>{currentQuestion?.question_text}</div>

            {/* Example options render (for MCQ) */}
            <div style={{ marginTop: 12 }}>
              {(currentQuestion?.options || []).map(opt => (
                <div key={opt.option_id} style={{ padding: 8, borderRadius: 6, border: '1px solid #3E3E42', marginBottom: 8 }}>
                  {opt.value}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                // mark solved for demo
                markQuestionSolved(activeSection.id, currentQuestionIndex);
                // move to next question inside the same section if exists
                const nextQ = currentQuestionIndex + 1;
                if (nextQ < (activeSection.questions || []).length) {
                  setCurrentQuestionIndex(nextQ);
                } else {
                  // end of section but do not auto-complete (user must advance or wait for timer)
                  alert('End of section. You may advance section or wait for timer to complete.');
                }
              }}
              style={{ background: '#4CA466', color: '#fff', padding: '8px 12px', borderRadius: 8, border: 'none' }}
            >
              Mark Solved & Next Question
            </button>

            <button
              onClick={() => {
                manualAdvanceSection();
              }}
              style={{ background: '#444', color: '#fff', padding: '8px 12px', borderRadius: 8, border: 'none' }}
            >
              Advance to Next Section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// small helper
function formatTime(s) {
  if (s == null) return '--:--';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default AttemptTimed;
