import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from '../database/db';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const user = await db.users
        .where('email')
        .equals(email.toLowerCase())
        .first();

      if (user && user.password === password) {
        const userWithoutPassword = { ...user };
        delete userWithoutPassword.password;
        setCurrentUser(userWithoutPassword);
        localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
        return { success: true, user: userWithoutPassword };
      }
      return { success: false, error: 'Invalid email or password' };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const signup = async (userData) => {
    try {
      // Check if user already exists
      const existingUser = await db.users
        .where('email')
        .equals(userData.email.toLowerCase())
        .first();

      if (existingUser) {
        return { success: false, error: 'Email already registered' };
      }

      // Add new user
      const userId = await db.users.add({
        ...userData,
        email: userData.email.toLowerCase(),
        createdAt: new Date()
      });

      const newUser = await db.users.get(userId);
      const userWithoutPassword = { ...newUser };
      delete userWithoutPassword.password;
      
      setCurrentUser(userWithoutPassword);
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      
      return { success: true, user: userWithoutPassword };
    } catch (error) {
      return { success: false, error: 'Signup failed' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const value = {
    currentUser,
    login,
    signup,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};