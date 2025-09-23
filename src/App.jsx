import React ,{useState,useEffect}from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./_Features/Auth/AuthContext";
import ProtectedRoute from "./_Features/Auth/ProtectedRoute";
import Login from "./_Features/Auth/Login"
import ResetPassword from "./_Features/Auth/ResetPassword"
import Sidebar from "./utils/sidebar";
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import Tests from './_Features/Dashboard/pages/Tests'
import Courses from "./_Features/Dashboard/pages/Courses";
import Dashboard from './_Features/Dashboard/pages/Dashboard'
import Navbar from "./_Features/Dashboard/components/Navbar"
import './App.css'
import { privateAxios } from "./utils/axios";
import Attempt from "./_Features/AttemptTest/Attempt";
// import Dashboard from "./_Features/Auth/Dashbaord";

function App() {

   // hide Navbar only on /attempt
  const hideNavbarRoutes = ["/attempt"];
  const shouldShowNavbar = !hideNavbarRoutes.includes(location.pathname);

   useEffect(() => {
   
  
     
      const fetchQuestions = async () => {
        try {
          // GET /sections/<section_id>/questions
          const resp = await privateAxios.get(`api/students/tests`)
  
          // The backend returns a response like: { success: true, message: "...", data: [...] }
          // Adjust if your backend shape differs.
          const payload = resp && resp.data ? resp.data : resp;
          console.log('students')
          console.log(payload)
  
        
        } catch (err) {
        
              console.log(err);
             
          }
      };
  
      // fetchQuestions();
  
    }, []);
  return (
  <Router>
          <div className="min-h-screen" style={{ backgroundColor: '#1E1E1E' }}>
        <main >

    <AuthProvider>
      <Toaster/>
          {shouldShowNavbar && <Navbar />}
        <Routes>
                      <Route path="/login" element={<Login />} />
 <Route
              path="/reset-password"
              element={
                <ProtectedRoute>
                  <ResetPassword />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard/>
                </ProtectedRoute>
              }
            />
              <Route
              path="/attempt"
              element={
                <ProtectedRoute>
                  <Attempt/>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tests"
              element={
                <ProtectedRoute>
                  <Tests/>
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <Courses/>
                </ProtectedRoute>
              }
            />
        </Routes>

    </AuthProvider>
          
</main>
    </div>
  </Router>
  )
}

export default App
