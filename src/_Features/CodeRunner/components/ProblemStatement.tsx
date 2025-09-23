import React from 'react';
import { Copy, Clock, Database, Award } from 'lucide-react';
import type { Question } from '../types';
import MarkdownRenderer from '../../../utils/MarkDownRender'
interface ProblemStatementProps {
  question: Question;
}

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

export default function ProblemStatement({ question }: ProblemStatementProps) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="p-6 text-gray-100" style={{ backgroundColor: '#1f1f1f' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 mb-3">{question.title}</h1>
        
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span 
            className={`px-3 py-1 text-sm font-medium rounded-full ${difficultyColors[question.difficulty]}`}
            style={{ backgroundColor: difficultyBgColors[question.difficulty] }}
          >
            {question.difficulty}
          </span>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Award className="w-4 h-4" />
            <span>{question.points} points</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{question.time_limit_ms}ms</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Database className="w-4 h-4" />
            <span>{question.memory_limit_kb}KB</span>
          </div>
        </div>

        {/* Tags */}
        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {question.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium text-gray-300 rounded-md"
                style={{ backgroundColor: '#2f2f2f' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Topic and Subtopic */}
        <div className="text-sm text-gray-400 mb-4">
          <span className="font-medium">{question.topic}</span>
          {question.subtopic && <span className="ml-2">• {question.subtopic}</span>}
        </div>
      </div>

      {/* Short Description */}
      {question.short_description && (
        <div className="mb-6 p-4 border-l-4 border-blue-400 rounded-md" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
<MarkdownRenderer 
          className="markdown-dark"
 text={question.short_description}/>        </div>
      )}

      {/* Long Description */}
      <div className="prose prose-sm max-w-none">
        <MarkdownRenderer 
          className="markdown-dark"
 text={question.long_description_markdown}/>
      </div>

      {/* Sample I/O Section */}
      {question.sample_io && question.sample_io.length > 0 && (
        <div className="mt-10">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-1 h-8 bg-[#4CA466] rounded-full"></div>
            Sample Test Cases
          </h3>
          <div className="space-y-8">
            {question.sample_io.map((sample, index) => (
              <div key={index} className="border border-gray-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow" style={{ backgroundColor: '#2a2a2a' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-[#4CA466] text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <h4 className="text-lg font-semibold text-white">
                    Example {index + 1}
                  </h4>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Input */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-bold text-gray-300 uppercase tracking-wide">Input</label>
                      <button
                        onClick={() => copyToClipboard(sample.input_text)}
                        className="p-2 text-gray-500 hover:text-[#4CA466] hover:bg-gray-700 rounded-lg transition-all"
                        title="Copy input"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <pre className="p-4 border border-gray-600 rounded-lg text-sm font-mono overflow-x-auto text-gray-200 hover:border-gray-500 transition-colors" style={{ backgroundColor: '#1a1a1a' }}>
                      {sample.input_text}
                    </pre>
                  </div>

                  {/* Output */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-bold text-gray-300 uppercase tracking-wide">Output</label>
                      <button
                        onClick={() => copyToClipboard(sample.output)}
                        className="p-2 text-gray-500 hover:text-[#4CA466] hover:bg-gray-700 rounded-lg transition-all"
                        title="Copy output"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <pre className="p-4 border border-gray-600 rounded-lg text-sm font-mono overflow-x-auto text-gray-200 hover:border-gray-500 transition-colors" style={{ backgroundColor: '#1a1a1a' }}>
                      {sample.output}
                    </pre>
                  </div>
                </div>

                {/* Explanation */}
                {sample.explanation && (
                  <div>
                    <label className="text-sm font-bold text-gray-300 block mb-3 uppercase tracking-wide">Explanation</label>
                    <div className="p-4 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors" style={{ backgroundColor: '#1a1a1a' }}>
                      <MarkdownRenderer text={sample.explanation}
  className="markdown-dark"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}