import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import Users from './pages/Users';
import Brokers from './pages/Brokers';
import Companies from './pages/Companies';
import Settings from './pages/Settings';
import Attendance from './pages/Attendance';
import AttendanceAdmin from './pages/AttendanceAdmin';
import PerformanceAdmin from './pages/PerformanceAdmin';
import Reports from './pages/Reports';
import Eligibility from './pages/Eligibility';
import Commissions from './pages/Commissions';

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading, token } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <Register />} />

      <Route path="/dashboard" element={
        <PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>
      } />
      <Route path="/requests" element={
        <PrivateRoute><Layout><Requests /></Layout></PrivateRoute>
      } />
      <Route path="/brokers" element={
        <PrivateRoute><Layout><Brokers /></Layout></PrivateRoute>
      } />
      <Route path="/companies" element={
        <PrivateRoute adminOnly><Layout><Companies /></Layout></PrivateRoute>
      } />
      <Route path="/users" element={
        <PrivateRoute adminOnly><Layout><Users /></Layout></PrivateRoute>
      } />
      <Route path="/settings" element={
        <PrivateRoute adminOnly><Layout><Settings /></Layout></PrivateRoute>
      } />
      <Route path="/attendance" element={
        <PrivateRoute><Layout><Attendance /></Layout></PrivateRoute>
      } />
      <Route path="/attendance-admin" element={
        <PrivateRoute adminOnly><Layout><AttendanceAdmin /></Layout></PrivateRoute>
      } />
      <Route path="/performance" element={
        <PrivateRoute adminOnly><Layout><PerformanceAdmin /></Layout></PrivateRoute>
      } />
      <Route path="/reports" element={
        <PrivateRoute adminOnly><Layout><Reports /></Layout></PrivateRoute>
      } />
      <Route path="/eligibility" element={
        <PrivateRoute><Layout><Eligibility /></Layout></PrivateRoute>
      } />
      <Route path="/commissions" element={
        <PrivateRoute><Layout><Commissions /></Layout></PrivateRoute>
      } />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
