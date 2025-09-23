import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { privateAxios } from '../../utils/axios';
import TestSidebar from '../components/TestSidebar'; // adjust path

const ATTEMPT_FETCH_URL = (testId) => `/api/students/test/attempt/${testId}`;
function useQuery() { return new URLSearchParams(useLocation().search); }

const AttemptOpen = () => {
  const query = useQuery();
  const testId = query.get('testId');

  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // open sections state
  const [openSections, setOpenSections] = useState([]);
  const [currentSectionId, setCurrentSectionId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState({});
  const [completedSections, setCompletedSections] = useState(new Set());

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    privateAxios.get(ATTEMPT_FETCH_URL(testId))
      .then(resp => {
        if (!mounted) return;
        if (!resp?.data?.success) throw new Error(resp?.data?.message || 'Failed to fetch attempt');
        const data = resp.data.data || resp.data;
        const opens = (data?.test?.sections_open || []).map(s => ({ ...s }));
        setPayload(data);
        setOpenSections(opens);
        if (opens.length > 0) {
          setCurrentSectionId(opens[0].id);
        }
        // init states
        const init = {};
        opens.forEach(s => {
          init[s.id] = {};
          (s.questions || []).forEach((_, idx) => init[s.id][idx] = { viewed: false, solved: false });
        });
        setQuestionStates(init);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load');
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [testId]);

  const handleNavigate = (sectionId, questionIndex) => {
    setCurrentSectionId(sectionId);
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
    // maybe mark section completed if all solved
    const section = openSections.find(s => s.id === sectionId);
    if (section) {
      const allSolved = (section.questions || []).every((_, idx) => (questionStates[sectionId]?.[idx]?.solved || idx === questionIndex));
      if (allSolved) {
        setCompletedSections(prev => new Set([...Array.from(prev), sectionId]));
      }
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;

  const currentSection = openSections.find(s => s.id === currentSectionId);
  const currentQuestion = currentSection?.questions?.[currentQuestionIndex]?.question;

  return (
    <div style={{ background: '#1E1E1E', minHeight: '100vh', color: '#fff' }}>
      <TestSidebar
        testData={payload}
        currentSection={currentSectionId}
        currentQuestion={currentQuestionIndex}
        onNavigate={handleNavigate}
        mode="open"
        completedSections={completedSections}
        questionStates={questionStates}
      />

      <div style={{ marginLeft: 80, padding: 24, maxWidth: 1100 }}>
        <h2>{payload?.test_name || payload?.data?.test?.test_name || 'Open Sections'}</h2>
        <div style={{ color: '#CCCCCC', marginBottom: 12 }}>
          Open sections — you can navigate freely between sections and questions.
        </div>

        <div style={{ background: '#2D2D30', padding: 16, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{currentSection?.name || 'No active section'}</div>
              <div style={{ color: '#999', fontSize: 13 }}>{currentSection?.no_of_questions || 0} questions</div>
            </div>
          </div>

          <hr style={{ borderColor: '#3E3E42', margin: '12px 0' }} />

          <div>
            <div style={{ color: '#fff', fontWeight: 600 }}>
              Q{currentQuestionIndex + 1}. {currentQuestion?.title || '—'}
            </div>
            <div style={{ color: '#CCCCCC', marginTop: 8 }}>{currentQuestion?.question_text}</div>

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
              onClick={() => markQuestionSolved(currentSectionId, currentQuestionIndex)}
              style={{ background: '#4CA466', color: '#fff', padding: '8px 12px', borderRadius: 8, border: 'none' }}
            >
              Mark Solved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttemptOpen;
