import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_BASE = import.meta.env.VITE_API_URL || '';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async (activeToken = token) => {
    if (!activeToken) {
      setUser(null);
      return null;
    }

    const response = await fetch(API_BASE + '/api/auth/me', { headers: { Authorization: `Bearer ${activeToken}` } });
    if (!response.ok) {
      setToken(null);
      localStorage.removeItem('token');
      setUser(null);
      return null;
    }

    const data = await response.json();
    const nextUser = data.user || data;
    setUser(nextUser);
    return nextUser;
  };

  useEffect(() => {
    if (token) {
      refreshUser(token)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (tok, userData) => {
    localStorage.setItem('token', tok);
    setToken(tok);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const authFetch = (url, options = {}) => {
    const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(API_BASE + url, { ...options, headers });
  };

  const userPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const hasPermission = (permissionKey) => {
    if (!permissionKey) return false;
    return user?.role === 'admin' || userPermissions.includes(permissionKey);
  };

  const hasAnyPermission = (permissionKeys = []) => {
    if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) return false;
    return user?.role === 'admin' || permissionKeys.some((permissionKey) => userPermissions.includes(permissionKey));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authFetch, refreshUser, hasPermission, hasAnyPermission, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}
