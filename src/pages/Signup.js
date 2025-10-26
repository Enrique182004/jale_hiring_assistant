import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, User, Building, AlertCircle, CheckCircle } from 'lucide-react';

const Signup = () => {
  const [userType, setUserType] = useState('worker');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    location: '',
    pay: '',
    availability: ''
  });
  const [skills, setSkills] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);

    const userData = {
      ...formData,
      userType,
      ...(userType === 'worker' 
        ? { skillsOffered: skillsArray }
        : { skillsNeeded: skillsArray, company }
      )
    };

    const result = await signup(userData);
    
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Jale</h1>
                <p className="text-xs text-gray-600">AI-Powered Hiring Platform</p>
              </div>
            </div>
            <Link 
              to="/login" 
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl w-full space-y-6">
          {/* Welcome Section */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Create Your Account
            </h2>
            <p className="text-gray-600">
              Join thousands of professionals finding their perfect match
            </p>
          </div>

          {/* Registration Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* User Type Selection */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-4">I am a:</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setUserType('worker')}
                  className={`p-5 border-2 rounded-xl flex flex-col items-center justify-center space-y-3 transition ${
                    userType === 'worker'
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    userType === 'worker' ? 'bg-blue-600' : 'bg-gray-100'
                  }`}>
                    <User className={`w-6 h-6 ${userType === 'worker' ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold ${userType === 'worker' ? 'text-blue-700' : 'text-gray-700'}`}>
                      Job Seeker
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Looking for work
                    </p>
                  </div>
                  {userType === 'worker' && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('employer')}
                  className={`p-5 border-2 rounded-xl flex flex-col items-center justify-center space-y-3 transition ${
                    userType === 'employer'
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    userType === 'employer' ? 'bg-blue-600' : 'bg-gray-100'
                  }`}>
                    <Building className={`w-6 h-6 ${userType === 'employer' ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold ${userType === 'employer' ? 'text-blue-700' : 'text-gray-700'}`}>
                      Employer
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Hiring workers
                    </p>
                  </div>
                  {userType === 'employer' && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  {userType === 'worker' ? 'Full Name *' : 'Business Name *'}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={userType === 'worker' ? 'John Doe' : 'ABC Construction Co.'}
                />
              </div>

              {userType === 'employer' && (
                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ABC Construction"
                  />
                </div>
              )}

              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Los Angeles, CA"
                />
              </div>

              <div>
                <label htmlFor="skills" className="block text-sm font-semibold text-gray-700 mb-2">
                  {userType === 'worker' ? 'Skills You Offer *' : 'Skills Needed *'}
                </label>
                <input
                  id="skills"
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Plumbing, Electrical, Carpentry"
                />
                <p className="text-xs text-gray-500 mt-2">Separate multiple skills with commas</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="availability" className="block text-sm font-semibold text-gray-700 mb-2">
                    Availability *
                  </label>
                  <input
                    id="availability"
                    name="availability"
                    type="text"
                    value={formData.availability}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="8:00 AM - 5:00 PM"
                  />
                </div>

                <div>
                  <label htmlFor="pay" className="block text-sm font-semibold text-gray-700 mb-2">
                    {userType === 'worker' ? 'Expected Pay *' : 'Pay Offered *'}
                  </label>
                  <input
                    id="pay"
                    name="pay"
                    type="text"
                    value={formData.pay}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="$25-35/hr"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;