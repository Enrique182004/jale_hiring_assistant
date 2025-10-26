import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, AlertCircle, Shield } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      if (result.user.userType === 'employer') {
        navigate('/employer-dashboard');
      } else {
        navigate('/worker-dashboard');
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Professional Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Jale</h1>
              <p className="text-xs text-gray-600">AI-Powered Hiring Platform</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600">
              Sign in to continue to your account
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Don't have an account?{' '}
                <Link to="/signup" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
                  Create Account
                </Link>
              </p>
            </div>
          </div>

          {/* Demo Accounts Section */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-sm font-semibold text-gray-900">Demo Accounts</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <p className="text-xs font-semibold text-gray-700 mb-1">Employer Account</p>
                <p className="text-xs text-gray-600">employer@demo.com</p>
                <p className="text-xs text-gray-600">Password: demo123</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <p className="text-xs font-semibold text-gray-700 mb-1">Job Seeker Account</p>
                <p className="text-xs text-gray-600">worker@demo.com</p>
                <p className="text-xs text-gray-600">Password: demo123</p>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Secure • Private • Trusted by thousands
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;