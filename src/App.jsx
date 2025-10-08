import React from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./_Features/Auth/AuthContext";
import ProtectedRoute from "./_Features/Auth/ProtectedRoute";

import Login from "./_Features/Auth/Login";
import ResetPassword from "./_Features/Auth/ResetPassword";
import Tests from "./_Features/Dashboard/pages/Tests";
import Courses from "./_Features/Dashboard/pages/Courses";
import Dashboard from "./_Features/Dashboard/pages/Dashboard";
import Attempt from "./_Features/AttemptTest/Attempt";
import ProfileBuilder from "./_Features/ProfileBuilder";
import InstallApp from "./_Features/InstallApp/installApp";
import Navbar from "./_Features/Dashboard/components/Navbar";

import "./App.css";

/**
 * Keep one source of truth for navbar height.
 * Adjust this value if you change Navbar's height.
 */
const NAV_HEIGHT = 64; // px (matches Navbar's h-16)

function Layout() {
  // convert px to rem-friendly/inline style if you prefer, or use Tailwind pt-16 class.
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#1E1E1E" }}>
      {/* Navbar is fixed, so content must be padded from top */}
      <Navbar height={NAV_HEIGHT} />

      {/* main uses padding-top equal to navbar height so nothing overlaps */}
      <main
        className="flex-1 w-full"
        style={{ paddingTop: NAV_HEIGHT, paddingLeft: 16, paddingRight: 16 }}
      >
        {/* Outlet will render nested route elements */}
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  // console.log(localStorage.getItem("token"))
  return (
    <Router>
      <AuthProvider>
        <Toaster />
        <Routes>
          {/* Public (no navbar) */}
          <Route path="/login" element={<Login />} />

          {/* Protect attempt route but don't show navbar */}
          <Route
            path="/attempt"
            element={
              <ProtectedRoute>
                <Attempt />
              </ProtectedRoute>
            }
          />

          {/* All routes nested here will show the fixed Navbar */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* index -> / */}
            <Route index element={<Dashboard />} />
            <Route path="tests" element={<Tests />} />
            <Route path="courses" element={<Courses />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="profile-builder" element={< ProfileBuilder/ >} />

                        <Route path="install-app" element={<InstallApp/ >} />

            {/* add more nested routes here that should show the navbar */}
          </Route>

          {/* Optional: catch-all redirect (customize as needed) */}
          {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
