import React from "react";
import { Calendar, Clock, FileText, Users, Edit } from "lucide-react";

/**
 * TestCard
 *
 * Props:
 *  - test: object (may include start_datetime, end_datetime, duration_seconds,
 *          duration_hms, total_sections, sections, sections_time_restricted, sections_open)
 *  - assignedStudentCount: number
 *  - onClick: function
 *
 * Behavior:
 *  - Shows separate start date/time and end date/time in 12-hour format
 *  - Shows duration (prefers duration_seconds from backend; falls back to end-start)
 *  - Shows number of sections (prefer total_sections, else sum of time_restricted/open, else sections.length)
 */
const TestCard = ({ test = {}, assignedStudentCount = 0, onClick, onEdit }) => {
  // safe destructuring with sensible defaults
  const {
    id = "",
    test_name = "Untitled Test",
    description = "No description provided",
    notes = "",
    start_datetime,
    end_datetime,
    status: providedStatus = null,
    sections = [],
    total_sections = null,
    sections_time_restricted = null,
    sections_open = null,
    duration_seconds: backend_duration_seconds = null,
  } = test;

  // trim stray whitespace in test name
  const title = (test_name || "").toString().trim();

  // helper to format date/time in 12-hour format
  const formatDateTime = (dateTime) => {
    if (!dateTime) return { date: "N/A", time: "N/A", iso: null, epoch: null };
    const date = new Date(dateTime);
    const optionsDate = { year: "numeric", month: "short", day: "2-digit", timeZone: "Asia/Kolkata" };
    const optionsTime = { 
      hour: "2-digit", 
      minute: "2-digit", 
      timeZone: "Asia/Kolkata", 
      hour12: true 
    };
    return {
      date: date.toLocaleDateString("en-GB", optionsDate),
      time: date.toLocaleTimeString("en-GB", optionsTime),
      iso: date.toISOString(),
      epoch: date.getTime(),
    };
  };

  const startFormatted = formatDateTime(start_datetime);
  const endFormatted = formatDateTime(end_datetime);

  // compute derived status if backend didn't provide one
  const now = Date.now();
  let status = providedStatus;
  if (!status) {
    if (startFormatted.epoch && endFormatted.epoch) {
      if (now < startFormatted.epoch) status = "upcoming";
      else if (now >= startFormatted.epoch && now <= endFormatted.epoch) status = "ongoing";
      else status = "past";
    } else {
      status = "unknown";
    }
  }

  const statusColors = {
    upcoming: "bg-blue-50 text-blue-700 border-blue-200",
    ongoing: "bg-emerald-50 text-emerald-700 border-emerald-200",
    past: "bg-red-50 text-red-600 border-red-200",
    unknown: "bg-amber-50 text-amber-700 border-amber-200",
  };

  // sections count
  const sectionsCount = (() => {
    if (Number.isFinite(total_sections) && total_sections !== null) return total_sections;
    const trCount = Array.isArray(sections_time_restricted) ? sections_time_restricted.length
                   : typeof sections_time_restricted === "number" ? sections_time_restricted : 0;
    const openCount = Array.isArray(sections_open) ? sections_open.length
                   : typeof sections_open === "number" ? sections_open : 0;
    if (trCount || openCount) return trCount + openCount;
    if (Array.isArray(sections)) return sections.length;
    return 0;
  })();

  // compute duration
  const derivedDurationSeconds = (startFormatted.epoch && endFormatted.epoch && endFormatted.epoch > startFormatted.epoch)
    ? Math.round((endFormatted.epoch - startFormatted.epoch) / 1000)
    : null;

  const durationSeconds = (backend_duration_seconds != null) ? Number(backend_duration_seconds) : derivedDurationSeconds;

  const humanizeDuration = (seconds) => {
    if (seconds == null || Number.isNaN(seconds)) return "—";
    const s = Math.max(0, Math.round(Number(seconds)));
    if (s < 60) return `${s}s`;
    const mins = Math.floor(s / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  };

  const durationReadable = humanizeDuration(durationSeconds);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-lg hover:border-emerald-300 transition-all duration-300 group relative overflow-hidden"
      role="button"
      tabIndex={0}
    >
      {/* Gradient overlay for visual appeal */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/20 to-blue-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header with ID and Status */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            {id && (
              <div className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md inline-block mb-2">
                #{id}
              </div>
            )}
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors leading-tight">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2 ml-3">
            <span
              className={`px-2 py-1 capitalize rounded-full text-xs font-medium border ${statusColors[status] || statusColors.unknown}`}
            >
              {status}
            </span>

            {typeof onEdit === "function" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEdit(test);
                }}
                title="Edit test"
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Edit test"
              >
                <Edit size={14} className="text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">{description}</p>

        {/* Date and Time - Compact Layout */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <Calendar size={14} className="mr-2 text-emerald-500" />
              <span className="font-medium">Start:</span>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">{startFormatted.date}</div>
              <div className="text-xs text-gray-500">{startFormatted.time}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <Calendar size={14} className="mr-2 text-red-500" />
              <span className="font-medium">End:</span>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">{endFormatted.date}</div>
              <div className="text-xs text-gray-500">{endFormatted.time}</div>
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center text-gray-600">
            <Clock size={14} className="mr-2 text-blue-500" />
            <span className="font-medium">Duration:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{durationReadable}</span>
          </div>
        </div>

        {/* Notes - always show with placeholder if empty */}
        <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-50 rounded-md">
          <span className="font-medium text-gray-700">Notes:</span>{" "}
          {notes ? (
            <span className="text-gray-700">{notes}</span>
          ) : (
            <span className="italic text-gray-400">No notes available</span>
          )}
        </div>

        {/* Footer: Sections + Students */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-600">
            <FileText size={14} className="mr-1.5 text-purple-500" />
            <span className="font-medium">{sectionsCount}</span>
            <span className="ml-1 text-gray-500">section{sectionsCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users size={14} className="mr-1.5 text-orange-500" />
            <span className="font-medium">{assignedStudentCount}</span>
            <span className="ml-1 text-gray-500">student{assignedStudentCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestCard;