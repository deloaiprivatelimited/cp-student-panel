import React, { useState } from 'react';
import { Clock, Calendar, Users, Eye } from 'lucide-react';

const formatDateTime = (dateTimeStr) => {
  const date = new Date(dateTimeStr);
  const optionsDate = { year: 'numeric', month: 'short', day: 'numeric' };
  const optionsTime = { hour: '2-digit', minute: '2-digit' };

  return {
    date: date.toLocaleDateString(undefined, optionsDate),
    time: date.toLocaleTimeString(undefined, optionsTime),
  };
};

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0 mins';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (hrs > 0) parts.push(`${hrs} hr${hrs > 1 ? 's' : ''}`);
  if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
  if (parts.length === 0) parts.push(`${seconds % 60} sec${seconds % 60 !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

// New helper: returns true if now is >= start && now <= end
const isNowBetween = (startStr, endStr) => {
  const start = Date.parse(startStr);
  const end = Date.parse(endStr);
  if (isNaN(start) || isNaN(end)) return false;
  const now = Date.now();
  return now >= start && now <= end;
};

const TestPreviewModal = ({ test, isOpen, onClose, onAttempt, onStartAttempt }) => {
  if (!isOpen) return null;

  const start = formatDateTime(test.start_datetime);
  const end = formatDateTime(test.end_datetime);

  const canStartNow = isNowBetween(test.start_datetime, test.end_datetime);

  const handleStart = () => {
    // prefer onStartAttempt, fallback to onAttempt
    const fn = onStartAttempt || onAttempt;
    if (fn) fn(test);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* modal card */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-[#1F1F22] border border-[#333436] p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">{test.test_name}</h2>
            <p className="text-sm text-[#CCCCCC] mt-1 truncate w-[80%]">{test.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs px-3 py-1 rounded-full text-white" style={{ backgroundColor: getStatusColor(test.status) }}>
              {getStatusText(test.status)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm text-[#DDDDDD]">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <div>
                <div className="text-xs text-[#BBBBBB]">Start</div>
                <div className="font-medium">{start.date} at {start.time}</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <div>
                <div className="text-xs text-[#BBBBBB]">End</div>
                <div className="font-medium">{end.date} at {end.time}</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <div>
                <div className="text-xs text-[#BBBBBB]">Duration</div>
                <div className="font-medium">{formatTime(test.duration_seconds)}</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-xs text-[#BBBBBB]">Instructions</div>
              <div className="font-medium text-sm text-[#EEEEEE]">{test.instructions || '—'}</div>
            </div>

            <div>
              <div className="text-xs text-[#BBBBBB]">Notes</div>
              <div className="font-medium text-sm text-[#EEEEEE]">{test.notes || '—'}</div>
            </div>

            <div>
              <div className="text-xs text-[#BBBBBB]">Sections</div>
              <div className="font-medium">{test.total_sections ?? '—'}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-[#2f2f31] pt-4 text-sm text-[#DDDDDD]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-[#BBBBBB]">Students enrolled</div>
            <div className="font-medium">{test.no_of_students ?? 0}</div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-[#BBBBBB]">Tags</div>
            <div className="flex flex-wrap gap-2">
              {(test.tags || []).length > 0 ? (
                (test.tags || []).map((t) => (
                  <span key={t} className="text-xs px-2 py-1 rounded-full bg-[#2b2b2d]">{t}</span>
                ))
              ) : (
                <span className="text-xs text-[#AAAAAA]">—</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#3a3a3c] text-sm text-[#EEEEEE]"
            >
              Close
            </button>

            {/* Show Start Test when current time is between start and end */}
            {canStartNow && (
              <button
                onClick={handleStart}
                className="px-4 py-2 rounded-lg bg-[#4CA466] text-white text-sm"
              >
                Start Test
              </button>
            )}

            {test.status === 'ongoing' && !canStartNow && (
              <button
                onClick={() => { onAttempt?.(test); onClose(); }}
                className="px-4 py-2 rounded-lg bg-[#4CA466] text-white text-sm"
              >
                Attempt Test
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// helper functions used in modal
const getStatusColor = (status) => {
  switch (status) {
    case 'ongoing':
      return '#4CA466';
    case 'upcoming':
      return '#F59E0B';
    case 'past':
      return '#6B7280';
    default:
      return '#4CA466';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'ongoing':
      return 'Ongoing';
    case 'upcoming':
      return 'Upcoming';
    case 'past':
      return 'Completed';
    default:
      return 'Upcoming';
  }
};

const TestCard = ({ test, onAttempt = (t) => console.log('Attempt', t), onStartAttempt }) => {
  const [isOpen, setIsOpen] = useState(false);

  const start = formatDateTime(test.start_datetime);
  const end = formatDateTime(test.end_datetime);

  const canStartNow = isNowBetween(test.start_datetime, test.end_datetime);

  const handleStart = () => {
    const fn = onStartAttempt || onAttempt;
    if (fn) fn(test);
  };

  return (
    <>
      <div
        className="relative rounded-lg p-6 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer flex flex-col h-full"
        style={{ backgroundColor: '#2D2D30', border: '1px solid #3E3E42' }}
      >
        {/* Header section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-grow min-w-0 pr-3">
            <h3 className="text-lg font-semibold text-white mb-1 truncate" title={test.test_name}>
              {test.test_name}
            </h3>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 flex-shrink-0" style={{ color: '#CCCCCC' }} />
              <span style={{ color: '#CCCCCC' }} className="text-sm truncate">{test.description}</span>
            </div>
          </div>

          {/* Eye icon to preview (top-right) */}
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Preview test"
            className="ml-3 rounded-full p-2 hover:bg-white/5"
            style={{ color: '#CCCCCC' }}
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>

        {test.status && (
          <span
            className="px-3 py-1 rounded-full text-xs font-medium text-white flex-shrink-0 inline-block mb-4"
            style={{ backgroundColor: getStatusColor(test.status) }}
          >
            {getStatusText(test.status)}
          </span>
        )}

        {/* Spacer to push footer to bottom */}
        <div className="flex-grow"></div>

        {/* Footer section - always at bottom */}
        <div className="mt-auto">
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" style={{ color: '#4CA466' }} />
                <span className="text-sm text-white">Start:</span>
              </div>
              <span style={{ color: '#CCCCCC' }} className="text-sm">
                {start.date} at {start.time}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" style={{ color: '#4CA466' }} />
                <span className="text-sm text-white">End:</span>
              </div>
              <span style={{ color: '#CCCCCC' }} className="text-sm">
                {end.date} at {end.time}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" style={{ color: '#4CA466' }} />
                <span className="text-sm text-white">Duration:</span>
              </div>
              <span style={{ color: '#CCCCCC' }} className="text-sm">{formatTime(test.duration_seconds)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            {/* Show Start Test button if now is between start and end */}
            {canStartNow && (
              <button
                onClick={handleStart}
                className="px-4 py-2 rounded-lg bg-[#4CA466] text-white text-sm"
              >
                Start Test
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview modal */}
      <TestPreviewModal
        test={test}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAttempt={(t) => {
          setIsOpen(false);
          onAttempt(t);
        }}
        onStartAttempt={(t) => {
          setIsOpen(false);
          const fn = onStartAttempt || onAttempt;
          if (fn) fn(t);
        }}
      />
    </>
  );
};

export default TestCard;
