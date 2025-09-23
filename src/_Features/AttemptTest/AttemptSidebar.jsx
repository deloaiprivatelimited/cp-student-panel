import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  Lock,
  Clock,
  BookOpen,
  CheckCircle,
  Circle
} from 'lucide-react';

/**
 * TestSidebar
 * props:
 *  - testData: the full test payload (object with test key like your API returns)
 *  - currentSection: id of current section
 *  - currentQuestion: index of current question
 *  - onNavigate(sectionId, questionIndex)
 *  - mode: 'time' | 'open'   // controls which sections to show
 *  - completedSections: Set of completed sectionIds (managed by parent)
 *  - questionStates: object { [sectionId]: { [qIndex]: { viewed, solved } } }
 */
export const TestSidebar = ({
  testData,
  currentSection,
  currentQuestion,
  onNavigate,
  mode = 'time',
  completedSections = new Set(),
  questionStates = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!testData || !testData.test) return null;

  const timeRestrictedSections = (testData.test.sections_time_restricted || []).map((s) => ({
    ...s,
    time_restricted: true
  }));

  const openSections = (testData.test.sections_open || []).map((s) => ({
    ...s,
    time_restricted: false
  }));

  // mode controls visibility
  const timeSectionsToShow = mode === 'time' ? timeRestrictedSections : [];
  const openSectionsToShow = mode === 'open' ? openSections : [];

  const allTimeRestrictedCompleted = timeRestrictedSections.every(s => completedSections.has(s.id));

  // helper: whether a section is unlocked (for time-mode only sequential; for open-mode unlocked if time sections done)
  const isSectionUnlocked = (section, idx, localMode) => {
    if (localMode === 'time') {
      // in time mode sections are sequential
      // find index of this section in timeRestrictedSections
      const localIndex = timeRestrictedSections.findIndex(ss => ss.id === section.id);
      if (localIndex === 0) return true;
      const prevId = timeRestrictedSections[localIndex - 1]?.id;
      return completedSections.has(prevId);
    } else {
      // open mode: unlocked only if all time-restricted completed
      return allTimeRestrictedCompleted;
    }
  };

  const getQuestionStateColor = (sectionId, questionIndex) => {
    const state = questionStates?.[sectionId]?.[questionIndex];
    if (!state) return 'transparent';
    if (state.solved) return '#4CA466';
    if (state.viewed) return '#FFA500';
    return 'transparent';
  };

  const canNavigateQuestion = (section, questionIndex) => {
    // time mode: cannot navigate back to earlier questions in a time-restricted section if that section is active and user previously moved forward.
    // Parent should enforce stricter rules; sidebar only prevents obvious backwards navigation.
    if (mode === 'time') {
      // allow navigation only within the active time section; parent ensures cannot go back to previous sections
      return currentSection === section.id || isSectionUnlocked(section, null, 'time');
    }
    // open mode allow
    return true;
  };

  return (
    <div
      className={`flex-none h-screen bg-[#2D2D30] border-r border-[#3E3E42] transition-all duration-300 z-50 ${
      isExpanded ? 'w-80' : 'w-16'
    }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#3E3E42]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#4CA466] rounded-lg flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            {isExpanded && (
              <div>
                <h3 className="text-white font-medium text-sm">Test Navigation</h3>
                <p className="text-[#999999] text-xs">{testData.test.test_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sections List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {/* Time Restricted Sections (only when mode === 'time') */}
            {timeSectionsToShow.length > 0 && isExpanded && (
              <h4 className="text-[#CCCCCC] text-xs font-medium mb-3 px-2 flex items-center gap-2">
                <Clock size={14} />
                Time Restricted
              </h4>
            )}

            {timeSectionsToShow.map((section, index) => {
              const isUnlocked = isSectionUnlocked(section, index, 'time');
              const isCompleted = completedSections.has(section.id);
              const isActive = currentSection === section.id;

              return (
                <div key={section.id} className="mb-3">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isActive ? 'bg-[#4CA466] bg-opacity-20 border border-[#4CA466]' : 'hover:bg-[#3E3E42]'
                    } ${!isUnlocked ? 'opacity-50' : 'cursor-pointer'}`}
                  >
                    <div className="flex-shrink-0">
                      {!isUnlocked ? (
                        <Lock size={16} className="text-[#999999]" />
                      ) : isCompleted ? (
                        <CheckCircle size={16} className="text-[#4CA466]" />
                      ) : (
                        <Clock size={16} className="text-[#CCCCCC]" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="flex-1 min-w-0">
                        <h5 className="text-white text-sm font-medium truncate">{section.name}</h5>
                        <p className="text-[#999999] text-xs">
                          {section.duration}min • {section.no_of_questions} questions
                        </p>
                      </div>
                    )}

                    {isExpanded && isUnlocked && <ChevronRight size={16} className="text-[#999999]" />}
                  </div>

                  {/* Questions Grid - only expand for unlocked sections and only in time mode */}
                  {isExpanded && isUnlocked && (
                    <div className="mt-2 ml-8 grid grid-cols-6 gap-1">
                      {section.questions.map((_, questionIndex) => {
                        const canClick = canNavigateQuestion(section, questionIndex);

                        return (
                          <button
                            key={questionIndex}
                            onClick={() => canClick && onNavigate(section.id, questionIndex)}
                            className={`w-8 h-8 rounded text-xs font-medium border transition-all ${
                              currentSection === section.id && currentQuestion === questionIndex
                                ? 'border-[#4CA466] text-[#4CA466]'
                                : 'border-[#3E3E42] text-[#CCCCCC]'
                            } ${!canClick ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#4CA466]'}`}
                            style={{
                              backgroundColor: getQuestionStateColor(section.id, questionIndex)
                            }}
                            disabled={!canClick}
                          >
                            {questionIndex + 1}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Open Sections (only when mode === 'open') */}
            {openSectionsToShow.length > 0 && isExpanded && (
              <h4 className="text-[#CCCCCC] text-xs font-medium mb-3 px-2 flex items-center gap-2">
                <BookOpen size={14} />
                Open Sections
              </h4>
            )}

            {openSectionsToShow.map((section, index) => {
              const isUnlocked = isSectionUnlocked(section, null, 'open');
              const isCompleted = completedSections.has(section.id);
              const isActive = currentSection === section.id;

              return (
                <div key={section.id} className="mb-3">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isActive ? 'bg-[#4CA466] bg-opacity-20 border border-[#4CA466]' : 'hover:bg-[#3E3E42]'
                    } ${!isUnlocked ? 'opacity-50' : 'cursor-pointer'}`}
                  >
                    <div className="flex-shrink-0">
                      {!isUnlocked ? (
                        <Lock size={16} className="text-[#999999]" />
                      ) : isCompleted ? (
                        <CheckCircle size={16} className="text-[#4CA466]" />
                      ) : (
                        <Circle size={16} className="text-[#CCCCCC]" />
                      )}
                    </div>

                    {isExpanded && (
                      <div className="flex-1 min-w-0">
                        <h5 className="text-white text-sm font-medium truncate">{section.name}</h5>
                        <p className="text-[#999999] text-xs">{section.no_of_questions} questions • No time limit</p>
                      </div>
                    )}

                    {isExpanded && isUnlocked && <ChevronRight size={16} className="text-[#999999]" />}
                  </div>

                  {/* Questions Grid */}
                  {isExpanded && isUnlocked && (
                    <div className="mt-2 ml-8 grid grid-cols-6 gap-1">
                      {section.questions.map((_, questionIndex) => (
                        <button
                          key={questionIndex}
                          onClick={() => onNavigate(section.id, questionIndex)}
                          className={`w-8 h-8 rounded text-xs font-medium border transition-all hover:border-[#4CA466] ${
                            currentSection === section.id && currentQuestion === questionIndex
                              ? 'border-[#4CA466] text-[#4CA466]'
                              : 'border-[#3E3E42] text-[#CCCCCC]'
                          }`}
                          style={{
                            backgroundColor: getQuestionStateColor(section.id, questionIndex)
                          }}
                        >
                          {questionIndex + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#3E3E42]">
          {isExpanded && (
            <div className="text-xs text-[#999999]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded bg-[#4CA466]"></div>
                <span>Solved</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded bg-[#FFA500]"></div>
                <span>Viewed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border border-[#3E3E42]"></div>
                <span>Not viewed</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestSidebar;
