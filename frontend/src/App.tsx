import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './components/Auth/LoginPage';
import { IDELayout } from './components/Layout/IDELayout';
import { useStore } from './store/useStore';
import { apiService } from './services/api';
import './App.css';

function App() {
  const { isAuthenticated, setUser, setAuthenticated } = useStore();

  useEffect(() => {
    // Check if user is already authenticated
    try {
      const token = localStorage.getItem('accessToken');
      
      if (token && !isAuthenticated) {
        // Verify token and get user profile
        apiService.getUserProfile()
          .then(user => {
            setUser(user);
            setAuthenticated(true);
          })
          .catch((error) => {
            console.log('Token verification failed:', error);
            // Token is invalid, clear it
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          });
      }
    } catch (error) {
      console.error('Error in authentication check:', error);
      // Clear potentially corrupted data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }, [isAuthenticated, setUser, setAuthenticated]);

  try {
    return (
      <Router>
        <div className="App">
          <Routes>
            <Route 
              path="/login" 
              element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/*" 
              element={isAuthenticated ? <IDELayout /> : <Navigate to="/login" replace />} 
            />
          </Routes>
        </div>
      </Router>
    );
  } catch (error) {
    console.error('Error rendering App:', error);
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Application Error</h1>
          <p className="text-gray-300 mb-4">Something went wrong. Please check the console.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

export default App;