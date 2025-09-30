// src/pages/Tests.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Search, Filter } from "lucide-react";
import TestCard from "../components/TestCard";
// import privateAxios from "../lib/privateAxios";
import { privateAxios } from "../../../utils/axios";
const DEFAULT_LIMIT = 12;

const Tests = () => {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tests, setTests] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTests = useCallback(async ({ status = selectedFilter, q = searchQuery, limitVal = limit, offsetVal = offset } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        status: status || "all",
        limit: limitVal,
        offset: offsetVal,
      };
      if (q && q.trim() !== "") params.q = q.trim();
      // optional: college_id param can be added here if needed
      const resp = await privateAxios.get(`api/students/tests`, { params });
      if (resp?.data?.success) {
        const payload = resp.data.data || {};
        console.log(payload)
        setTests(payload.tests || []);
        setTotal(payload.total || 0);
        setLimit(payload.limit ?? limitVal);
        setOffset(payload.offset ?? offsetVal);
      } else {
        setError(resp?.data?.message || "Failed to load tests");
      }
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, searchQuery, limit, offset]);

  // initial load and when filter/search/offset/limit change
  useEffect(() => {
    // reset offset to 0 when filter or search changes
    setOffset(0);
    fetchTests({ status: selectedFilter, q: searchQuery, limitVal: limit, offsetVal: 0 });
  }, [selectedFilter, searchQuery, limit, fetchTests]);

  useEffect(() => {
    // when offset changes (pagination)
    fetchTests({ status: selectedFilter, q: searchQuery, limitVal: limit, offsetVal: offset });
  }, [offset]); // eslint-disable-line

  const totalPages = Math.ceil((total || 0) / (limit || 1));
  const currentPage = Math.floor((offset || 0) / (limit || 1)) + 1;

  const handlePrev = () => setOffset(prev => Math.max(0, prev - limit));
  const handleNext = () => setOffset(prev => Math.min((total - 1), prev + limit));

  // UX: filter button counts are fetched from backend? For now show counts = unknown (could call endpoints for counts)
  const filterButtons = [
    { key: "all", label: "All Tests" },
    { key: "upcoming", label: "Upcoming" },
    { key: "ongoing", label: "Ongoing" },
    { key: "past", label: "Past" },
  ];
// inside Tests component
// inside Tests.jsx
// const handleAttemptTest = (test) => {
//   const attemptUrl = `${window.location.origin}/attempt?testId=${encodeURIComponent(test.id)}`;
//   const win = window.open(attemptUrl, "_blank", "noopener,noreferrer");
//   if (win) win.focus();
//   console.log("Attempting test:", test.id);
// };
const handleAttemptTest = (test) => {
  const attemptUrl = `${window.location.origin}/attempt?testId=${encodeURIComponent(test.id)}`;

  const windowFeatures = `
    width=1000,
    height=700,
    left=200,
    top=100,
    resizable=yes,
    scrollbars=yes,
    status=no,
    toolbar=no,
    menubar=no,
    location=no
  `;

  const win = window.open(attemptUrl, "AttemptTestWindow", windowFeatures);

  if (win) win.focus();
  console.log("Attempting test:", test.id);
};


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Tests</h1>
        <p style={{ color: "#CCCCCC" }} className="text-lg">
          Manage and take your tests here
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 tsop-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: "#CCCCCC" }} />
          <input
            type="text"
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2"
            style={{
              backgroundColor: "#2D2D30",
              border: "1px solid #3E3E42",
            }}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {filterButtons.map(button => (
            <button
              key={button.key}
              onClick={() => setSelectedFilter(button.key)}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                selectedFilter === button.key ? "text-white" : "text-gray-300 hover:text-white"
              }`}
              style={selectedFilter === button.key ?
                { backgroundColor: "#4CA466" } :
                { backgroundColor: "#2D2D30", border: "1px solid #3E3E42" }
              }
            >
              <span>{button.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tests Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-300">Loading tests...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-400">{error}</div>
      ) : (
        <>
          {tests.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="mx-auto w-12 h-12 mb-4" style={{ color: "#CCCCCC" }} />
              <h3 className="text-lg font-medium text-white mb-2">No tests found</h3>
              <p style={{ color: "#CCCCCC" }}>
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map(test => (
                  <TestCard key={test.id} test={test} onAttempt={handleAttemptTest} />
                ))}
              </div>

              {/* Pagination controls */}
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  Showing {Math.min(offset + 1, total || 0)} - {Math.min(offset + tests.length, total || 0)} of {total}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handlePrev}
                    disabled={offset <= 0}
                    className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <div className="text-sm text-gray-300">
                    Page {currentPage} / {Math.max(totalPages, 1)}
                  </div>
                  <button
                    onClick={handleNext}
                    disabled={offset + limit >= total}
                    className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Tests;
