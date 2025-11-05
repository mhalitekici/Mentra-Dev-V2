import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';

import LandingPage from './pages/LandingPage';
import Home from './pages/Home';
import HomeFeed from './pages/HomeFeed';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import GoogleCallback from './pages/GoogleCallback';
import TeacherDashboard from './pages/TeacherDashboard';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Calendar from './pages/Calendar';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import PostDetail from './pages/PostDetail';
import AdminDashboard from './pages/AdminDashboard';
import ChangePassword from './pages/ChangePassword';
import Messages from './pages/Messages';
import AdminNews from './pages/AdminNews';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const AuthContext = React.createContext();

// Landing page guard component
function LandingGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('mentra_token');
    // Clear landing flag if user logs out
    if (!token) {
      localStorage.removeItem('mentra_landing_seen');
    }
    setChecked(true);
  }, []);

  if (!checked) return null;
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mentra_token');
    if (token) {
      axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('mentra_token');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('mentra_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('mentra_token');
    localStorage.removeItem('mentra_landing_seen');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-100">
        <div className="text-xl text-purple-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <LandingGuard>
          <Routes>
            <Route path="/" element={user ? <HomeFeed /> : <Home />} />
            <Route path="/home" element={user ? <HomeFeed /> : <Navigate to="/" />} />
            <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />
            <Route path="/register" element={user ? <Navigate to="/home" /> : <Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/auth/google/callback" element={<GoogleCallback />} />
            <Route path="/auth/google/success" element={<GoogleCallback />} />
            
            <Route path="/teacher-dashboard" element={user ? <TeacherDashboard /> : <Navigate to="/login" />} />
            <Route path="/students" element={user ? <Students /> : <Navigate to="/login" />} />
            <Route path="/students/:id" element={user ? <StudentDetail /> : <Navigate to="/login" />} />
            <Route path="/calendar" element={user ? <Calendar /> : <Navigate to="/login" />} />
            <Route path="/payments" element={user ? <Payments /> : <Navigate to="/login" />} />
            <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
            <Route path="/teachers/:username" element={<UserProfile />} />
            <Route path="/posts/:postId" element={<PostDetail />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/login" />} />
            <Route path="/messages" element={user ? <Messages /> : <Navigate to="/login" />} />
            <Route path="/messages/:threadId" element={user ? <Messages /> : <Navigate to="/login" />} />
            <Route path="/admin/news" element={user?.role === 'admin' ? <AdminNews /> : <Navigate to="/home" />} />
          </Routes>
        </LandingGuard>
      </BrowserRouter>
      <Toaster position="top-right" expand={false} richColors />
    </AuthContext.Provider>
  );
}

export default App;
