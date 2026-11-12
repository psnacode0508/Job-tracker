import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

import { AuthProvider } from './context/AuthContext.jsx';
import { setNavigateHandler } from './api/axiosClient.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

/**
 * Connects React Router's navigate function to axiosClient's 401 interceptor.
 */
function AxiosNavigationConnector() {
  const navigate = useNavigate();

  useEffect(() => {
    setNavigateHandler(navigate);
  }, [navigate]);

  return null;
}

/**
 * Main application routing component.
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AxiosNavigationConnector />
        <div className="app-container" style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc' }}>
          <Navbar />
          <main>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Root and fallback redirects to /dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
