import React, { useEffect, useState, useCallback } from 'react';

const PRIMARY = '#4CA466';
const BORDER = '#3E3E42';

export default function InstructionsPanel({
  instructions = [],
  seconds = 0,
  onStart = () => {},
  enterFullscreen = () => {},
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
  const [index, setIndex] = useState(0);

  // keep index in range if instructions change
  useEffect(() => {
    if (index > instructions.length - 1) setIndex(Math.max(0, instructions.length - 1));
  }, [instructions, index]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(instructions.length - 1, i + 1));
  }, [instructions.length]);

  // keyboard navigation: left / right
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext]);

  const cur = instructions[index] || { title: 'No instructions', content: '' };
  const isLast = index === instructions.length - 1 && instructions.length > 0;

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white p-6 relative">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="m-0 text-xl font-semibold">Please read the instructions</h1>
            <div className="text-[#CCCCCC] mt-1 text-sm">All instructions must be visible for at least the specified time. Use the arrows or buttons to navigate.</div>
          </div>
          <div className="text-right">
            <div className="text-[#CCCCCC] text-xs">Time before test can be started</div>
            <div className="text-[#4CA466] font-extrabold text-lg">{humanTime(seconds)}</div>
          </div>
        </div>

        {/* Single instruction card - set fixed height (80vh) and make inner content scrollable */}
        <div
          className="bg-[#2D2D30] border rounded-lg p-6 flex flex-col"
          style={{ borderColor: BORDER, height: '80vh', maxHeight: '80vh' }}
          aria-live="polite"
        >
          {/* header inside card */}
          <div className="flex justify-between items-center">
            <div className="font-semibold text-lg">{cur.title}</div>
            <div className="text-sm text-[#CCCCCC]">{index + 1} of {instructions.length || 1}</div>
          </div>

          {/* scrollable content area */}
          <div className="mt-3 leading-relaxed text-[#CCCCCC] overflow-auto" style={{ flex: 1, minHeight: 0 }}>
            <p>{cur.content}</p>

            {/* progress dots - keep them inside the scrollable area (so they scroll with content). If you want them pinned as well, move them to the footer. */}
            <div className="mt-4 flex items-center gap-2">
              {instructions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to instruction ${i + 1}`}
                  className={`w-3 h-3 rounded-full ${i === index ? 'ring-2 ring-offset-1' : 'opacity-40'}`}
                  style={{ background: i === index ? PRIMARY : '#9CA3AF' }}
                />
              ))}
            </div>

            {/* long content can go here; this area will scroll if it overflows the 80vh card */}
          </div>

          {/* sticky footer inside the card, stays fixed to the bottom of the 80vh container */}
          <div className="mt-6 sticky bottom-0 pt-4 bg-gradient-to-t from-[#2D2D30] to-transparent">
            <div className="flex items-center justify-between bg-transparent">
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
                    disabled={instructions.length === 0}
                    className={`px-3 py-2 rounded-lg text-white border-0 ${instructions.length === 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#4CA466] cursor-pointer'}`}>
                    Next
                  </button>
                )}

                {isLast && (
                  <button
                    onClick={onStart}
                    disabled={seconds > 0}
                    className={`px-4 py-2 rounded-lg text-white border-0 ${seconds > 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#4CA466] cursor-pointer'}`}>
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
