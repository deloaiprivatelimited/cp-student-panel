// _Features/Auth/ProtectedRoute.jsx
import React ,{useState}from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * ProtectedRoute:
 *  - If auth is loading -> show a simple loader (prevents premature redirect)
 *  - If no token or token invalid -> redirect to /login
 *  - If user is first-login -> allow access to /reset-password, otherwise force redirect to /reset-password
 *  - Otherwise render children
 */
const ProtectedRoute = ({ children }) => {
  const { auth = {}, isTokenValid, loading = false } = useAuth() || {};
  const location = useLocation();

  // optional: show a loader while auth is initializing so we don't redirect too early
  if (loading) {
    return <div style={{ padding: 20 }}>Checking authentication...</div>;
  }

  const token = auth?.token;
  const isLoggedIn = !!token && typeof isTokenValid === "function" ? isTokenValid(token) : !!token;
  const isFirstLogin = !!auth?.admin?.is_first_login;

  // If not logged in -> send to login
  if (!isLoggedIn) {
    // preserve original location in state so you can redirect after login if desired
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If first-login -> allow only the reset-password route (do NOT redirect away from it)
  if (isFirstLogin && location.pathname !== "/reset-password") {
    return <Navigate to="/reset-password" replace />;
  }

  // Otherwise allow rendering children (including /reset-password when location.pathname === "/reset-password")
  return children;
};

export default ProtectedRoute;
