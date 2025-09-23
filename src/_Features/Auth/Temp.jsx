import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Users,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Star,
  User,
  CheckCircle,
  XCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  usn: string;
  enrollment_number: string;
  branch: string;
  year_of_study: number;
  semester: number;
  cgpa: number;
  gender: string;
  is_active: boolean;
  first_time_login: boolean;
  city: string;
  state: string;
}

interface FilterOption {
  value: any;
  count: number;
}

interface ApiResponse {
  success: boolean;
  college: {
    id: string;
    name: string;
  };
  students: Student[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
    sort_by: string;
    sort_dir: string;
  };
  filters_meta: {
    years: FilterOption[];
    genders: FilterOption[];
    branches: FilterOption[];
  };
}

interface Filters {
  search: string;
  year_of_study: string[];
  gender: string[];
  branch: string[];
  is_active: string;
  min_cgpa: string;
  max_cgpa: string;
}

const StudentList: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collegeName, setCollegeName] = useState<string>('');
  const navigate = useNavigate();

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    search: '',
    year_of_study: [],
    gender: [],
    branch: [],
    is_active: '',
    min_cgpa: '',
    max_cgpa: ''
  });
  
  const [filtersMeta, setFiltersMeta] = useState<{
    years: FilterOption[];
    genders: FilterOption[];
    branches: FilterOption[];
  }>({
    years: [],
    genders: [],
    branches: []
  });
  
  const [showFilters, setShowFilters] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy,
        sort_dir: sortDir
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.year_of_study.length) params.set('year_of_study', filters.year_of_study.join(','));
      if (filters.gender.length) params.set('gender', filters.gender.join(','));
      if (filters.branch.length) params.set('branch', filters.branch.join(','));
      if (filters.is_active) params.set('is_active', filters.is_active);
      if (filters.min_cgpa) params.set('min_cgpa', filters.min_cgpa);
      if (filters.max_cgpa) params.set('max_cgpa', filters.max_cgpa);

      // Replace with your actual API endpoint
      const response = await fetch(`/api/students/list?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch students');
      }

      setStudents(data.students);
      setTotalPages(data.meta.total_pages);
      setTotalStudents(data.meta.total);
      setFiltersMeta(data.filters_meta);
      setCollegeName(data.college.name);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, sortBy, sortDir, filters]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const toggleArrayFilter = (key: 'year_of_study' | 'gender' | 'branch', value: string) => {
    setFilters(prev => {
      const current = prev[key] as string[];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      year_of_study: [],
      gender: [],
      branch: [],
      is_active: '',
      min_cgpa: '',
      max_cgpa: ''
    });
    setCurrentPage(1);
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDir === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" />
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const hasActiveFilters = () => {
    return filters.search || 
           filters.year_of_study.length > 0 || 
           filters.gender.length > 0 || 
           filters.branch.length > 0 || 
           filters.is_active || 
           filters.min_cgpa || 
           filters.max_cgpa;
  };

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Students</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchStudents}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Management</h1>
          <p className="text-gray-600">{collegeName} • {totalStudents} students</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, USN, or enrollment number..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filter Toggle & Clear */}
              <div className="flex items-center gap-3">
                {hasActiveFilters() && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Year of Study */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year of Study</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {filtersMeta.years.map(year => (
                        <label key={year.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.year_of_study.includes(year.value.toString())}
                            onChange={() => toggleArrayFilter('year_of_study', year.value.toString())}
                            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            Year {year.value} ({year.count})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <div className="space-y-2">
                      {filtersMeta.genders.map(gender => (
                        <label key={gender.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.gender.includes(gender.value)}
                            onChange={() => toggleArrayFilter('gender', gender.value)}
                            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {gender.value} ({gender.count})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {filtersMeta.branches.map(branch => (
                        <label key={branch.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.branch.includes(branch.value)}
                            onChange={() => toggleArrayFilter('branch', branch.value)}
                            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {branch.value} ({branch.count})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status & CGPA */}
                  <div className="space-y-4">
                    {/* Active Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={filters.is_active}
                        onChange={(e) => handleFilterChange('is_active', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Students</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>

                    {/* CGPA Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">CGPA Range</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          step="0.1"
                          min="0"
                          max="10"
                          value={filters.min_cgpa}
                          onChange={(e) => handleFilterChange('min_cgpa', e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          step="0.1"
                          min="0"
                          max="10"
                          value={filters.max_cgpa}
                          onChange={(e) => handleFilterChange('max_cgpa', e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mr-2" />
              <span className="text-gray-600">Updating results...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                        >
                          Student {getSortIcon('name')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => handleSort('branch')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                        >
                          Academic {getSortIcon('branch')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left">
                        <button
                          onClick={() => handleSort('cgpa')}
                          className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                        >
                          Performance {getSortIcon('cgpa')}
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {student.gender}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {student.email}
                            </div>
                            {student.phone_number && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                {student.phone_number}
                              </div>
                            )}
                            {student.city && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                {student.city}, {student.state}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3 text-gray-400" />
                              {student.branch}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <BookOpen className="w-3 h-3 text-gray-400" />
                              Year {student.year_of_study}, Sem {student.semester}
                            </div>
                            <div className="text-xs text-gray-500">
                              USN: {student.usn} • Enroll: {student.enrollment_number}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {student.cgpa ? student.cgpa.toFixed(2) : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center">
                              {student.is_active ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span className="text-sm text-green-700 font-medium">Active</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <XCircle className="w-4 h-4 text-red-500" />
                                  <span className="text-sm text-red-700 font-medium">Inactive</span>
                                </div>
                              )}
                            </div>
                            {student.first_time_login && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                New User
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalStudents)} of {totalStudents} students
                    </div>
                    <select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentList;