import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, BookOpen } from 'lucide-react';
import TestCard from '../components/TestCard';
import CourseCard from '../components/CourseCard';
import { mockTests, mockCourses } from '../data/mockData';

const Dashboard = () => {
  const upcomingTests = mockTests.filter(test => test.status === 'upcoming').slice(0, 3);
  const continueLearningCourses = mockCourses.filter(course => course.progress !== undefined).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back, John!</h1>
        <p style={{ color: '#CCCCCC' }} className="text-lg">
          Ready to continue your learning journey?
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div 
          className="p-6 rounded-lg"
          style={{ backgroundColor: '#2D2D30', border: '1px solid #3E3E42' }}
        >
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#4CA466' }}
            >
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">3</h3>
              <p style={{ color: '#CCCCCC' }} className="text-sm">Upcoming Tests</p>
            </div>
          </div>
        </div>

        <div 
          className="p-6 rounded-lg"
          style={{ backgroundColor: '#2D2D30', border: '1px solid #3E3E42' }}
        >
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#4CA466' }}
            >
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">4</h3>
              <p style={{ color: '#CCCCCC' }} className="text-sm">Courses in Progress</p>
            </div>
          </div>
        </div>

        <div 
          className="p-6 rounded-lg"
          style={{ backgroundColor: '#2D2D30', border: '1px solid #3E3E42' }}
        >
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#4CA466' }}
            >
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">87%</h3>
              <p style={{ color: '#CCCCCC' }} className="text-sm">Average Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Tests */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Upcoming Tests</h2>
          <Link
            to="/tests"
            className="flex items-center space-x-2 text-sm font-medium hover:underline"
            style={{ color: '#4CA466' }}
          >
            <span>View all tests</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingTests.map(test => (
            <TestCard key={test.id} test={test} />
          ))}
        </div>
      </section>

      {/* Continue Learning */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Continue Learning</h2>
          <Link
            to="/courses"
            className="flex items-center space-x-2 text-sm font-medium hover:underline"
            style={{ color: '#4CA466' }}
          >
            <span>View all courses</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {continueLearningCourses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;