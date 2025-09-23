import React, { useState } from 'react';
import { Search, BookOpen } from 'lucide-react';
import CourseCard from '../components/CourseCard';
import { mockCourses } from '../data/mockData';

const Courses = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = mockCourses.filter(course => 
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.tagline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Courses</h1>
        <p style={{ color: '#CCCCCC' }} className="text-lg">
          Explore and continue your learning journey
        </p>
      </div>

      {/* Course Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div 
          className="p-4 rounded-lg text-center"
          style={{ backgroundColor: '#2D2D30', border: '1px solid #3E3E42' }}
        >
          <h3 className="text-2xl font-bold text-white">{mockCourses.length}</h3>
          <p style={{ color: '#CCCCCC' }} className="text-sm">Total Courses</p>
        </div>
        <div 
          className="p-4 rounded-lg text-center"
          style={{ backgroundColor: '#2D2D30', border: '1px solid #3E3E42' }}
        >
          <h3 className="text-2xl font-bold text-white">{mockCourses.filter(c => c.progress !== undefined).length}</h3>
          <p style={{ color: '#CCCCCC' }} className="text-sm">In Progress</p>
        </div>
        <div 
          className="p-4 rounded-lg text-center"
          style={{ backgroundColor: '#2D2D30', border: '1px solid #3E3E42' }}
        >
          <h3 className="text-2xl font-bold text-white">{mockCourses.filter(c => c.progress === undefined).length}</h3>
          <p style={{ color: '#CCCCCC' }} className="text-sm">Not Started</p>
        </div>
        <div 
          className="p-4 rounded-lg text-center"
          style={{ backgroundColor: '#2D2D30', border: '1px solid #3E3E42' }}
        >
          <h3 className="text-2xl font-bold text-white">{mockCourses.filter(c => c.progress === 100).length}</h3>
          <p style={{ color: '#CCCCCC' }} className="text-sm">Completed</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#CCCCCC' }} />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2"
            style={{ 
              backgroundColor: '#2D2D30', 
              border: '1px solid #3E3E42',
              focusRingColor: '#4CA466'
            }}
          />
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCourses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto w-12 h-12 mb-4" style={{ color: '#CCCCCC' }} />
          <h3 className="text-lg font-medium text-white mb-2">No courses found</h3>
          <p style={{ color: '#CCCCCC' }}>
            Try adjusting your search criteria
          </p>
        </div>
      )}
    </div>
  );
};

export default Courses;