import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import MobileNotificationHelper from './components/MobileNotificationHelper';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import UPISetup from './components/UPISetup';
import './App.css';

// Private route component
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('shopperToken');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  // Register service worker for mobile notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('✅ Service Worker registered:', registration);
        })
        .catch(error => {
          console.log('❌ Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <div className="App">
            <MobileNotificationHelper />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } />
              <Route path="/upi-setup" element={
                <PrivateRoute>
                  <UPISetup />
                </PrivateRoute>
              } />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </div>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
