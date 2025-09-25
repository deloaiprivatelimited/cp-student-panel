import React, { useEffect, useState, useCallback, useRef } from 'react';
// Optional (recommended): npm install dompurify
import DOMPurify from 'dompurify';

const PRIMARY = '#4CA466';
const BORDER = '#3E3E42';

// Helper: pretty-guard parse JSON strings into object (returns null on parse error)
function tryParseJsonMaybe(strOrObj) {
  if (!strOrObj) return null;
  if (typeof strOrObj === 'object') return strOrObj;
  if (typeof strOrObj !== 'string') return null;
  try {
    return JSON.parse(strOrObj);
  } catch (e) {
    // not JSON string
    return null;
  }
}

export default function InstructionsPanel({
  instructions = [],          // array of instruction objects (mixed formats allowed)
  seconds = 0,                // countdown seconds before Start becomes active
  onStart = () => {},         // called when the user starts the test
  enterFullscreen = () => {}, // callback to request fullscreen
  isBlockedForFs = false,
  showEnterFsButton = false,
  humanTime = (s) => {
    if (s == null) return '--:--';
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (hrs > 0) return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(mins).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
}) {
  // Normalize incoming instructions into shape: { title, content, format }
  const normalize = useCallback((raw) => {
    if (!raw) return { title: 'No instructions', content: '', format: 'text' };

    // If raw is an object with fields
    if (typeof raw === 'object') {
      // detect JSON-structured block: contains note and sections
      if ((raw.note || raw.sections) && typeof raw.sections !== 'string') {
        return { title: raw.title || 'Section Instructions', content: raw, format: 'json' };
      }

      const fmt =
        raw.format ||
        (typeof raw.content === 'string' && /<\/?[a-z][\s\S]*>/i.test(raw.content) ? 'html' :
         (typeof raw.content === 'object' ? 'json' : 'text'));

      const title = raw.title || raw.name || (fmt === 'html' ? extractTitleFromHtml(raw.content) : 'Instruction');
      const content = raw.content ?? '';
      return { title, content, format: fmt };
    }

    // if raw is a string, try to guess if HTML or JSON string
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
    const maybeJson = tryParseJsonMaybe(raw);
    if (maybeJson) {
      return { title: maybeJson.title || 'Instruction', content: maybeJson, format: 'json' };
    }
    return { title: 'Instruction', content: raw, format: isHtml ? 'html' : 'text' };
  }, []);

  function extractTitleFromHtml(htmlStr = '') {
    try {
      const m = htmlStr.match(/<h1[^>]*>([^<]+)<\/h1>|<h2[^>]*>([^<]+)<\/h2>|<h3[^>]*>([^<]+)<\/h3>/i);
      if (m) return (m[1] || m[2] || m[3]).trim();
    } catch (e) { /* ignore */ }
    return 'Instruction';
  }

  const normalized = instructions.map(normalize);

  const [index, setIndex] = useState(0);
  const contentRef = useRef(null);
  const startButtonRef = useRef(null);

  useEffect(() => {
    if (index > normalized.length - 1) {
      setIndex(Math.max(0, normalized.length - 1));
    }
  }, [normalized.length, index]);

  const goPrev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex(i => Math.min(normalized.length - 1, i + 1)), [normalized.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [index]);

  const cur = normalized[index] || { title: 'No instructions', content: '', format: 'text' };
  const isLast = index === normalized.length - 1 && normalized.length > 0;

  // Renders JSON-structured instruction object (your payload)
  const renderJsonInstruction = (obj) => {
    if (!obj) return <div className="text-sm">No content</div>;
    const note = obj.note || null;
    const sections = Array.isArray(obj.sections) ? obj.sections : [];

    return (
      <div className="space-y-4">
        {note && (
          <div className="bg-[#111111] p-3 rounded-md border" style={{ borderColor: BORDER }}>
            <div className="font-semibold mb-1">Note</div>
            <div className="text-[#CCCCCC]" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(String(note))}} />
          </div>
        )}

        <div className="space-y-3">
          {sections.map((sec, idx) => {
            const name = sec.name || sec.title || `Section ${idx + 1}`;
            const instr = sec.instruction ?? null;
            const hasHtml = typeof instr === 'string' && /<\/?[a-z][\s\S]*>/i.test(instr);

            return (
              <div key={idx} className="bg-[#111111] p-3 rounded-md border" style={{ borderColor: BORDER }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{name}</div>
                  </div>
                </div>

                {instr ? (
                  <div className="mt-2 text-[#CCCCCC]">
                    {hasHtml ? (
                      // sanitize HTML first
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(instr)) }} />
                    ) : (
                      // plain text or fallback: preserve newlines
                      String(instr).split('\n').map((ln, i) => <p key={i} className="mb-1">{ln}</p>)
                    )}
                  </div>
                ) : (
                  <div className="mt-2 text-[#888888] italic">No instruction provided for this section.</div>
                )}
              </div>
            );
          })}
          {sections.length === 0 && <div className="text-[#CCCCCC]">No sections available.</div>}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (cur.format === 'html') {
      // sanitize HTML before rendering
      const safe = DOMPurify.sanitize(String(cur.content || ''), {ALLOWED_TAGS: false});
      return <div dangerouslySetInnerHTML={{ __html: safe }} />;
    }

    if (cur.format === 'json') {
      // content might be an object (preferred) or a stringified JSON (parse attempt)
      const obj = typeof cur.content === 'object' ? cur.content : tryParseJsonMaybe(cur.content) || {};
      return renderJsonInstruction(obj);
    }

    if (cur.format === 'text') {
      return (cur.content || '').split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>);
    }

    // fallback
    return <pre className="whitespace-pre-wrap">{String(cur.content ?? '')}</pre>;
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white p-6 relative">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="m-0 text-xl font-semibold">Please read the instructions</h1>
            <div className="text-[#CCCCCC] mt-1 text-sm">All instructions must be visible for at least the specified time. Use the arrows, dots, or buttons to navigate.</div>
          </div>
          <div className="text-right">
            <div className="text-[#CCCCCC] text-xs">Time before test can be started</div>
            <div className="text-[#4CA466] font-extrabold text-lg">{humanTime(seconds)}</div>
          </div>
        </div>

        <div
          className="bg-[#2D2D30] border rounded-lg flex flex-col"
          style={{ borderColor: BORDER, height: '80vh', maxHeight: '80vh' }}
          aria-live="polite"
        >
          <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: '#3A3A3D' }}>
            <div className="font-semibold text-lg">{cur.title}</div>
            <div className="text-sm text-[#CCCCCC]">{index + 1} of {normalized.length || 1}</div>
          </div>

          <div ref={contentRef} className="px-6 py-4 leading-relaxed text-[#CCCCCC] overflow-auto" style={{ flex: 1, minHeight: 0 }}>
            {renderContent()}

            <div className="mt-4 flex items-center gap-2" role="tablist" aria-label="Instruction pages">
              {normalized.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to instruction ${i + 1}`}
                  role="tab"
                  aria-selected={i === index}
                  className={`w-3 h-3 rounded-full focus:outline-none ${i === index ? 'ring-2 ring-offset-1' : 'opacity-40'}`}
                  style={{ background: i === index ? PRIMARY : '#9CA3AF' }}
                />
              ))}
            </div>
          </div>

          <div className="px-6 py-4 bg-gradient-to-t from-[#2D2D30] to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={goPrev}
                  disabled={index === 0}
                  className={`px-3 py-2 rounded-lg text-white border-0 ${index === 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#3E3E42] cursor-pointer'}`}>
                  Previous
                </button>
              </div>

              <div className="flex items-center gap-3">
                {!isLast && (
                  <button
                    onClick={goNext}
                    disabled={normalized.length === 0}
                    className={`px-3 py-2 rounded-lg text-white border-0 ${normalized.length === 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#4CA466] cursor-pointer'}`}>
                    Next
                  </button>
                )}

                {isLast && (
                  <button
                    ref={startButtonRef}
                    onClick={() => { if (seconds <= 0) onStart(); }}
                    disabled={seconds > 0}
                    aria-disabled={seconds > 0}
                    className={`px-4 py-2 rounded-lg text-white border-0 ${seconds > 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#4CA466] cursor-pointer'}`}
                    title={seconds > 0 ? `Wait ${humanTime(seconds)}` : 'Start the test'}
                  >
                    {seconds > 0 ? `Wait ${humanTime(seconds)}` : 'Start Test'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {(isBlockedForFs || showEnterFsButton) && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center flex-col text-white p-6">
          <h2 className="mb-3 text-2xl">Fullscreen Required</h2>
          <p className="text-[#CCCCCC] text-center max-w-2xl">
            Fullscreen is required to view and start the test. Please click the button below to enter fullscreen.
            The instruction timer will resume after you enter fullscreen.
          </p>
          <button
            onClick={enterFullscreen}
            className="mt-5 px-5 py-3 bg-[#4CA466] rounded-lg text-white"
          >
            Enter Fullscreen
          </button>
        </div>
      )}
    </div>
  );
}
