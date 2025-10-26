import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { seedDatabase } from './database/db';
import Login from './pages/Login';
import Signup from './pages/Signup';
import EmployerDashboard from './pages/EmployerDashboard';
import WorkerDashboard from './pages/WorkerDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, allowedUserType }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (allowedUserType && currentUser.userType !== allowedUserType) {
    return <Navigate to={currentUser.userType === 'employer' ? '/employer-dashboard' : '/worker-dashboard'} />;
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (currentUser) {
    return <Navigate to={currentUser.userType === 'employer' ? '/employer-dashboard' : '/worker-dashboard'} />;
  }

  return children;
};

function AppContent() {
  useEffect(() => {
    // Initialize database with seed data
    seedDatabase();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } 
        />

        {/* Protected Routes */}
        <Route
          path="/employer-dashboard"
          element={
            <ProtectedRoute allowedUserType="employer">
              <EmployerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker-dashboard"
          element={
            <ProtectedRoute allowedUserType="worker">
              <WorkerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;