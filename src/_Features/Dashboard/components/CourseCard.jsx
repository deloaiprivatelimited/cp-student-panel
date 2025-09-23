import React from 'react';
import { BookOpen, Code, Play } from 'lucide-react';

const CourseCard = ({ course }) => {
  return (
    <div 
      className="rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer flex flex-col h-full"
      style={{ backgroundColor: '#2D2D30', border: '1px solid #3E3E42' }}
    >
      <div className="relative">
        <img 
          src={course.thumbnail} 
          alt={course.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-3 right-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center bg-black bg-opacity-50 hover:bg-opacity-70 transition-all"
          >
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      </div>

      <div className="p-6 flex-grow">
        <h3 className="text-lg font-semibold text-white mb-2">{course.name}</h3>
        <p style={{ color: '#CCCCCC' }} className="text-sm mb-4 line-clamp-2">
          {course.tagline}
        </p>
      </div>

      {/* Footer section - always at the bottom */}
      <div className="p-6 pt-0 mt-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4" style={{ color: '#4CA466' }} />
              <span style={{ color: '#CCCCCC' }} className="text-sm">
                {course.chapters} chapters
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Code className="w-4 h-4" style={{ color: '#4CA466' }} />
              <span style={{ color: '#CCCCCC' }} className="text-sm">
                {course.codingQuestions} questions
              </span>
            </div>
          </div>
        </div>

        {course.progress !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: '#CCCCCC' }}>Progress</span>
              <span className="text-white font-medium">{course.progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#3E3E42' }}>
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  backgroundColor: '#4CA466', 
                  width: `${course.progress}%` 
                }}
              />
            </div>
          </div>
        )}

        <button 
          className="w-full py-2 px-4 rounded-lg text-white font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: '#4CA466' }}
        >
          {course.progress !== undefined ? 'Continue Learning' : 'Start Course'}
        </button>
      </div>
    </div>
  );
};

export default CourseCard;