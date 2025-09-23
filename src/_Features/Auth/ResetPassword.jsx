// ResetPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { privateAxios } from "../../utils/axios";
import { useAuth } from "./AuthContext";
import { showError, showSuccess } from "../../utils/toast";

function PasswordReset() {
     const navigate = useNavigate();
      const { auth, markPasswordReset } = useAuth();
    
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

 
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Replace endpoint with your actual reset-password route
      // This call requires authorization; privateAxios attaches token automatically
      await privateAxios.post("/api/students/change-password", {
        "new_password" :password,
      });

      // Mark in context/localStorage that the first-login flow is done
      markPasswordReset();

      showSuccess("Password updated. Redirecting to dashboard...");
      // send to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to reset password.";
     showError(msg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Professional office environment"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative z-10 flex items-end p-12">
          <div className="text-white">
            <h2 className="text-3xl font-bold mb-4">Secure Your Account</h2>
            <p className="text-lg opacity-90">Set up your new password to continue</p>
          </div>
        </div>
      </div>

      {/* Right Side - Password Reset Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#4CA466' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">CareerPRerp</h1>
            <h2 className="text-xl font-semibold text-gray-700 mt-2">First-Time Login</h2>
            <p className="mt-4 text-gray-600">Please set your new password to continue</p>
          </div>

          {/* Password Reset Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition duration-200 shadow-sm"
                  style={{ focusRingColor: '#4CA466' }}
                  placeholder="Enter your new password"
                />
              </div>

              {/* Confirm Password Input */}
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition duration-200 shadow-sm"
                  style={{ focusRingColor: '#4CA466' }}
                  placeholder="Confirm your new password"
                />
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: '#4CA466' }}></div>
                  At least 8 characters long
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: '#4CA466' }}></div>
                  Include uppercase and lowercase letters
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: '#4CA466' }}></div>
                  Include at least one number
                </li>
              </ul>
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg font-semibold text-white text-lg transition duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-opacity-50"
              style={{ 
                backgroundColor: '#4CA466',
                focusRingColor: '#4CA466'
              }}
              disabled={loading}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#3d8a54'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#4CA466'}
            >
                          {loading ? "Updating..." : " Continue to Dashboard"}

             
            </button>
          </form>

          {/* Security Notice */}
          <div className="text-center pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-4 h-4 mr-2" style={{ color: '#4CA466' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-medium" style={{ color: '#4CA466' }}>Secure Connection</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Your password is encrypted and stored securely.<br />
              This is a one-time setup process.
            </p>
          </div>

          {/* Mobile Image Preview */}
          <div className="lg:hidden mt-8 rounded-lg overflow-hidden shadow-lg">
            <img
              src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&dpr=2"
              alt="Professional office environment"
              className="w-full h-32 object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PasswordReset;