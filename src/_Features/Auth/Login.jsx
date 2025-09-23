import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { privateAxios,publicAxios } from "../../utils/axios";
import { useAuth } from "./AuthContext";
import { showError,showSuccess } from "../../utils/toast";

function Login() {
      const navigate = useNavigate();
      const { login } = useAuth();
    
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Replace endpoint with your actual login route
      const resp = await publicAxios.post("/api/students/login", { email, password });
      // Expecting shape: { token, admin, college } — adapt if different
    //   if(!resp?.success){
    // console.log(resp);
      const { token, admin, college } = resp.data.data;

      if (!token) {
        throw new Error("No token returned from server");
      }

      // store auth (AuthContext will also persist in localStorage)
      login(token, admin, college);

      // Force reset-password when first login flag is true.
      if (admin?.is_first_login === true) {
        navigate("/reset-password", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
            console.log(err);

      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Login failed. Check credentials.";
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Professional workspace"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50 bg-opacity-20"></div>
        <div className="relative z-10 flex items-end p-12">
          <div className="text-white">
            <h2 className="text-3xl font-bold mb-2">Welcome to <span className='text-green-500'>CareerPrep</span></h2>
            <p className="text-lg opacity-90">Professional career management made simple</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full max-h-screen lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full h-screen flex flex-col justify-center ">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4CA466' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H7m2 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">CareerPrep</h1>
            <p className="mt-4 text-gray-600">Sign in to access your dashboard</p>
          </div>

          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:outline-none transition duration-200 shadow-sm"
                  style={{ focusRingColor: '#4CA466' }}
                  placeholder="admin@company.com"
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
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
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Login Button */}
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
          {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Contact Admin Section */}
          <div className="text-center border-t border-gray-200">
            <p className="text-sm  mt-2 text-gray-600 leading-relaxed">
              Need to signup or forgot password?<br />
              <span className="font-medium">Contact admin</span>
            </p>
            <a
              href="mailto:contact@deloai.com"
              className="inline-block px-4 py-2 text-sm font-medium rounded-lg transition duration-200 hover:bg-gray-50"
              style={{ color: '#4CA466' }}
            >
              contact@deloai.com
            </a>
          </div>

          {/* Mobile Image Preview */}
          {/* <div className="lg:hidden mt-8 rounded-lg overflow-hidden shadow-lg">
            <img
              src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&dpr=2"
              alt="Professional workspace"
              className="w-full h-32 object-cover"
            />
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default Login;