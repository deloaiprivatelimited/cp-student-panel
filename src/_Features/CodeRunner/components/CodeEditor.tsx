// Replace your existing CodeEditor with this file
import React, { useRef, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Play, Send } from 'lucide-react';
import type { Question } from '../types';

interface CodeEditorProps {
  question: Question;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  code: string;
  onCodeChange: (code: string) => void;
  customInput: string;
  onCustomInputChange: (input: string) => void;
  output: string;
  isRunning: boolean;
  onRunCode: () => void | Promise<void>;
  onSubmitCode: () => void | Promise<void>;
}

const languageMap: Record<string, string> = {
  python: 'python',
  cpp: 'cpp',
  java: 'java',
  javascript: 'javascript',
  c: 'c'
};

const difficultyColors = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400'
};

const difficultyBgColors = {
  easy: 'rgba(74, 222, 128, 0.1)',
  medium: 'rgba(251, 191, 36, 0.1)',
  hard: 'rgba(248, 113, 113, 0.1)'
};

export default function CodeEditor({
  question,
  selectedLanguage,
  onLanguageChange,
  code,
  onCodeChange,
  customInput,
  onCustomInputChange,
  output,
  isRunning,
  onRunCode,
  onSubmitCode
}: CodeEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const runningRef = useRef(false);
  const submittingRef = useRef(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleRunCode = useCallback(async () => {
    if (isRunning || runningRef.current) return;
    try {
      runningRef.current = true;
      await onRunCode();
    } finally {
      runningRef.current = false;
    }
  }, [isRunning, onRunCode]);

  const handleSubmitCode = useCallback(async () => {
    if (isSubmitting || submittingRef.current || isRunning) return;
    try {
      setIsSubmitting(true);
      submittingRef.current = true;
      await onSubmitCode();
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }, [isSubmitting, isRunning, onSubmitCode]);

  const isOperationInProgress = isRunning || isSubmitting;

  return (
    <div className="h-full w-full flex flex-col relative" style={{ backgroundColor: '#1f1f1f' }}>
      {/* Fixed-height header: use a predictable height so editor area is calculable */}
      <div
        className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0"
        style={{ backgroundColor: '#1f1f1f' }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-100">{question.title}</h2>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${difficultyColors[question.difficulty]}`}
            style={{ backgroundColor: difficultyBgColors[question.difficulty] }}
          >
            {question.difficulty}
          </span>
          <span className="text-sm text-gray-400">{question.points} points</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            Time: {question.time_limit_ms}ms | Memory: {question.memory_limit_kb}KB
          </span>
        </div>
      </div>

      {/* Toolbar: fixed height (so editor won't steal its space) */}
      <div
        className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0"
        style={{ backgroundColor: '#1f1f1f' }}
      >
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-300">Language:</label>
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={isOperationInProgress}
            className="px-3 py-1 border border-gray-600 rounded-md text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#2f2f2f' }}
          >
            {question.allowed_languages.map((lang) => (
              <option key={lang} value={lang} style={{ backgroundColor: '#2f2f2f' }}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {question.run_code_enabled && (
            <button
              onClick={handleRunCode}
              disabled={isOperationInProgress}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#4CA466] border border-[#4CA466] rounded-md hover:bg-[#4CA466] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running...' : 'Run'}
            </button>
          )}
          {question.submission_enabled && (
            <button
              onClick={handleSubmitCode}
              disabled={isOperationInProgress}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[#4CA466] rounded-md hover:bg-[#3d8f56] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </div>

      {/* MAIN: Editor area must take remaining space */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Editor wrapper - THIS IS THE CRITICAL PART */}
        <div className="flex-1 min-h-0" style={{ backgroundColor: '#1f1f1f' }}>
          {/* Monaco should fill this container */}
        <Editor
  height="100%"
  width="100%"
  language={languageMap[selectedLanguage] || selectedLanguage}
  value={code}
  onChange={(value) => onCodeChange(value || '')}
  theme="vs-dark"
  options={{
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 4,
    insertSpaces: true,
    readOnly: isOperationInProgress,
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    glyphMargin: false,
    contextmenu: true,
    cursorBlinking: 'blink',
    cursorSmoothCaretAnimation: 'on',
    renderWhitespace: 'selection',
    selectionHighlight: true,
    occurrencesHighlight: true,
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true
    }
  }}
  onMount={(editor, monaco) => {
    // Disable keyboard paste (Ctrl+V / Cmd+V)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
      // Do nothing
    });

    // Disable right-click paste from context menu
    editor.updateOptions({ contextmenu: false });

    // Block paste events from mouse / system clipboard
    editor.onPaste?.(() => {
      return false; // prevent paste
    });

    // Fallback: capture DOM paste
    editor.getDomNode()?.addEventListener('paste', (e) => {
      e.preventDefault();
    });
  }}
/>

        </div>

        {/* Fixed-height Input/Output Panel */}
        <div className="border-t border-gray-700 h-48 flex-shrink-0 overflow-hidden" style={{ backgroundColor: '#1f1f1f' }}>
          <div className="h-full overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 p-4 min-h-full">
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <label className="text-sm font-medium text-gray-300">Custom Input</label>
                  <button
                    onClick={() => copyToClipboard(customInput)}
                    disabled={isOperationInProgress}
                    className="p-1 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy input"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={customInput}
                  onChange={(e) => onCustomInputChange(e.target.value)}
                  disabled={isOperationInProgress}
                  placeholder="Enter your test input..."
                  className="flex-1 w-full px-3 py-2 text-sm border border-gray-600 rounded-md resize-none text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4CA466] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-h-[120px]"
                  style={{ backgroundColor: '#2f2f2f' }}
                />
              </div>

              <div className="min-w-0 flex flex-col">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <label className="text-sm font-medium text-gray-300">Output</label>
                  {output && (
                    <button
                      onClick={() => copyToClipboard(output)}
                      disabled={isOperationInProgress}
                      className="p-1 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Copy output"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div
                  className="flex-1 w-full px-3 py-2 text-sm border border-gray-600 rounded-md overflow-auto min-h-[120px]"
                  style={{ backgroundColor: '#2f2f2f' }}
                >
                  <pre className="whitespace-pre-wrap font-mono text-xs text-gray-300">
                    {output || 'Run your code to see output here...'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> {/* end main */}
    </div>
  );
}
