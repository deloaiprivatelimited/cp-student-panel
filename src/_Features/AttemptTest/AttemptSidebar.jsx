import React, { useState, useCallback } from "react";
import { ChevronRight, Lock, Clock, BookOpen, CheckCircle, Circle } from "lucide-react";

/**
 * TestSidebar (accessible + high contrast improvements)
 *
 * Props:
 *  - testData
 *  - currentSection
 *  - currentQuestion
 *  - onNavigate(sectionId, questionIndex)
 *  - mode: 'time' | 'open'
 *  - completedSections: Set
 *  - questionStates: { [sectionId]: { [qIndex]: { viewed, solved } } }
 *  - highContrast: boolean (optional) -> forces very-high-contrast palette
 */
export const TestSidebar = ({
  testData,
  currentSection,
  currentQuestion,
  onNavigate,
  mode = "time",
  completedSections = new Set(),
  questionStates = {},
  highContrast = false,
  headerHeight = 120,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!testData || !testData.test) return null;

  // Merge sections
  const timeRestrictedSections = (testData.test.sections_time_restricted || []).map((s) => ({
    ...s,
    time_restricted: true
  }));
  const openSections = (testData.test.sections_open || []).map((s) => ({
    ...s,
    time_restricted: false
  }));

  const timeSectionsToShow = mode === "time" ? timeRestrictedSections : [];
  const openSectionsToShow = mode === "open" ? openSections : [];

  const allTimeRestrictedCompleted = timeRestrictedSections.every((s) => completedSections.has(s.id));

  const isSectionUnlocked = (section, _idx, localMode) => {
    if (localMode === "time") {
      const localIndex = timeRestrictedSections.findIndex((ss) => ss.id === section.id);
      if (localIndex === 0) return true;
      const prevId = timeRestrictedSections[localIndex - 1]?.id;
      return completedSections.has(prevId);
    } else {
      return allTimeRestrictedCompleted;
    }
  };

  // accessible color tokens (high contrast variant optional)
  const colors = {
    bg: highContrast ? "#0B0B0C" : "#2D2D30",
    panelBorder: "#3E3E42",
    highlight: "#1DB954", // green highlight (sufficient contrast)
    solved: "#1DB954",
    viewed: "#FFA500",
    textPrimary: "#FFFFFF",
    textMuted: "#BFC2C6",
    tileBg: highContrast ? "#121213" : "#111214"
  };

  const getQuestionStateStyle = (sectionId, questionIndex, questionObj) => {
    // const state = questionStates?.[sectionId]?.[questionIndex] || {};
     const qId = (questionObj?.id ?? questionObj?.question_id ?? String(questionIndex));
  const state = questionStates?.[sectionId]?.[qId] || {};
      console.log("State", questionIndex,state)

    // We return an object with backgroundColor & borderColor (so numbers remain visible)
    if (state.solved) {
      return {
        backgroundColor: colors.solved,
        borderColor: "#0A4128",
        color: "#FFFFFF",
        // use strong box shadow for focus contrast
      };
    }
    if (state.viewed) {
      return {
        backgroundColor: colors.viewed,
        borderColor: "#7A5200",
        color: "#000000"
      };
    }
    // not viewed: keep dark tile with clear border and light text
    return {
      backgroundColor: "transparent",
      borderColor: "#3E3E42",
      color: colors.textPrimary
    };
  };

  // keyboard handler helper for clickable rows / tiles
  const onKeyActivate = useCallback((event, fn) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fn();
    }
  }, []);

  const canNavigateQuestion = (section, questionIndex) => {
    if (mode === "time") {
      return currentSection === section.id || isSectionUnlocked(section, null, "time");
    }
    return true;
  };

  return (
    <nav
      aria-label="Test navigation"
      className={`flex-none h-screen transition-all duration-300 z-50 ${isExpanded ? "w-80" : "w-16"}`}
      style={{ backgroundColor: colors.bg, borderRight: `1px solid ${colors.panelBorder}` ,        height: `calc(100vh - ${headerHeight}px)`,
}}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: colors.panelBorder }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: colors.solved }}
              aria-hidden
            >
              <BookOpen size={18} className="text-white" />
            </div>

            {isExpanded ? (
              <div>
                <h3 className="text-white font-semibold text-base" style={{ color: colors.textPrimary }}>
                  Test Navigation
                </h3>
                <p className="text-xs" style={{ color: colors.textMuted }}>
                  {testData.test.test_name}
                </p>
              </div>
            ) : (
              <span className="sr-only">Open test navigation</span>
            )}
          </div>
        </div>

        {/* Sections list */}
        <div className="flex-1 overflow-y-auto" role="region" aria-label="Sections">
          <div className="p-2">
            {/* Time Restricted heading */}
            {timeSectionsToShow.length > 0 && isExpanded && (
              <h4
                className="text-xs font-medium mb-3 px-2 flex items-center gap-2"
                style={{ color: colors.textMuted }}
              >
                <Clock size={14} />
                Time Restricted
              </h4>
            )}

            {timeSectionsToShow.map((section, index) => {
              const isUnlocked = isSectionUnlocked(section, index, "time");
              const isCompleted = completedSections.has(section.id);
              const isActive = currentSection === section.id;

              const onSectionClick = () => {
                // If not unlocked, do nothing
                if (!isUnlocked) return;
                // navigate to first question of this section
                onNavigate(section.id, 0);
              };

              return (
                <div key={section.id} className="mb-3">
                  <div
                    role="button"
                    tabIndex={isUnlocked ? 0 : -1}
                    aria-disabled={!isUnlocked}
                    onKeyDown={(e) => onKeyActivate(e, onSectionClick)}
                    onClick={onSectionClick}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all focus:outline-none`}
                    style={{
                      backgroundColor: isActive ? `${colors.highlight}1A` : "transparent",
                      border: isActive ? `1px solid ${colors.highlight}` : "1px solid transparent",
                      cursor: isUnlocked ? "pointer" : "default",
                      opacity: isUnlocked ? 1 : 0.55
                    }}
                  >
                    <div className="flex-shrink-0" aria-hidden>
                      {!isUnlocked ? (
                        <Lock size={16} className="text-[#999999]" />
                      ) : isCompleted ? (
                        <CheckCircle size={16} className="text-white" style={{ color: colors.solved }} />
                      ) : (
                        <Clock size={16} className="text-[#CCCCCC]" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="flex-1 min-w-0">
                        <h5
                          className="text-sm font-medium truncate"
                          style={{ color: colors.textPrimary, fontSize: "0.95rem" }}
                        >
                          {section.name}
                        </h5>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          {section.duration ? `${section.duration} min • ` : ""}{section.no_of_questions} questions
                        </p>
                      </div>
                    )}

                    {isExpanded && isUnlocked && <ChevronRight size={16} className="text-[#999999]" />}
                  </div>

                  {/* Questions grid */}
                  {isExpanded && isUnlocked && (
                    <div className="mt-2 ml-8 grid grid-cols-6 gap-1">
                      {section.questions.map((qWrapper, questionIndex) => {
                        const canClick = canNavigateQuestion(section, questionIndex);

  const q = qWrapper?.question ?? qWrapper;
  const style = getQuestionStateStyle(section.id, questionIndex, q);    
    const qId = q?.id ?? q?.question_id ?? String(questionIndex);
                    const isCurrent = currentSection === section.id && currentQuestion === questionIndex;
// console.log("demo" ,section.index,questionIndex)
                        const onQuestionClick = () => {
                          if (!canClick) return;
                          onNavigate(section.id, questionIndex);
                        };

                        return (
                          <button
                            key={questionIndex}
                            onClick={onQuestionClick}
                            onKeyDown={(e) => onKeyActivate(e, onQuestionClick)}
                            aria-label={`Question ${questionIndex + 1} — ${section.name}`}
                            aria-current={isCurrent ? "true" : undefined}
                            aria-disabled={!canClick}
                            disabled={!canClick}
                            className={`w-10 h-10 rounded text-sm font-medium border transition-all focus:outline-none flex items-center justify-center`}
                            style={{
                              backgroundColor: style.backgroundColor,
                              border: `1px solid ${style.borderColor}`,
                              color: style.color,
                              fontWeight: isCurrent ? 700 : 600,
                              // bigger numbers and clearer contrast:
                              fontSize: "0.9rem",
                              lineHeight: "1rem",
                              cursor: canClick ? "pointer" : "not-allowed",
                              boxShadow: isCurrent ? `0 0 0 3px ${colors.highlight}33` : undefined
                            }}
                          >
                            <span style={{ display: "inline-block", minWidth: 18, textAlign: "center" }}>
                              {questionIndex + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Open Sections heading */}
            {openSectionsToShow.length > 0 && isExpanded && (
              <h4
                className="text-xs font-medium mb-3 px-2 flex items-center gap-2"
                style={{ color: colors.textMuted }}
              >
                <BookOpen size={14} />
                Open Sections
              </h4>
            )}

            {openSectionsToShow.map((section, index) => {
              const isUnlocked = isSectionUnlocked(section, null, "open");
              const isCompleted = completedSections.has(section.id);
              const isActive = currentSection === section.id;

              const onSectionClick = () => {
                if (!isUnlocked) return;
                onNavigate(section.id, 0);
              };

              return (
                <div key={section.id} className="mb-3">
                  <div
                    role="button"
                    tabIndex={isUnlocked ? 0 : -1}
                    aria-disabled={!isUnlocked}
                    onKeyDown={(e) => onKeyActivate(e, onSectionClick)}
                    onClick={onSectionClick}
                    className="flex items-center gap-3 p-3 rounded-lg transition-all focus:outline-none"
                    style={{
                      backgroundColor: isActive ? `${colors.highlight}1A` : "transparent",
                      border: isActive ? `1px solid ${colors.highlight}` : "1px solid transparent",
                      cursor: isUnlocked ? "pointer" : "default",
                      opacity: isUnlocked ? 1 : 0.55
                    }}
                  >
                    <div className="flex-shrink-0" aria-hidden>
                      {!isUnlocked ? (
                        <Lock size={16} className="text-[#999999]" />
                      ) : isCompleted ? (
                        <CheckCircle size={16} className="text-white" style={{ color: colors.solved }} />
                      ) : (
                        <Circle size={16} className="text-[#CCCCCC]" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="flex-1 min-w-0">
                        <h5
                          className="text-sm font-medium truncate"
                          style={{ color: colors.textPrimary, fontSize: "0.95rem" }}
                        >
                          {section.name}
                        </h5>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          {section.no_of_questions} questions • No time limit
                        </p>
                      </div>
                    )}

                    {isExpanded && isUnlocked && <ChevronRight size={16} className="text-[#999999]" />}
                  </div>

                  {isExpanded && isUnlocked && (
                    <div className="mt-2 ml-8 grid grid-cols-6 gap-1">
                      {section.questions.map((_, questionIndex) => {
                        const style = getQuestionStateStyle(section.id, questionIndex);
                        const isCurrent = currentSection === section.id && currentQuestion === questionIndex;

                        const onQuestionClick = () => {
                          onNavigate(section.id, questionIndex);
                        };

                        return (
                          <button
                            key={questionIndex}
                            onClick={onQuestionClick}
                            onKeyDown={(e) => onKeyActivate(e, onQuestionClick)}
                            aria-label={`Question ${questionIndex + 1} — ${section.name}`}
                            aria-current={isCurrent ? "true" : undefined}
                            className={`w-10 h-10 rounded text-sm font-medium border transition-all focus:outline-none flex items-center justify-center`}
                            style={{
                              backgroundColor: style.backgroundColor,
 border: isCurrent
      ? "2px solid #1DB954"   // ✅ Green border for current question
      : `1px solid ${style.borderColor}`,                              color: style.color,
                              fontWeight: isCurrent ? 700 : 600,
                              fontSize: "0.9rem",
                              lineHeight: "1rem"
                            }}
                          >
                            <span style={{ display: "inline-block", minWidth: 18, textAlign: "center" }}>
                              {questionIndex + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: colors.panelBorder }}>
          {isExpanded && (
            <div className="text-xs" style={{ color: colors.textMuted }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.solved }}></div>
                <span>Answered / Solved</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.viewed }}></div>
                <span>Viewed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border" style={{ borderColor: "#3E3E42" }}></div>
                <span>Not viewed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default TestSidebar;
