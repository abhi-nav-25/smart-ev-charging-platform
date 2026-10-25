import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService.js';
import { AuthContext } from './authContextDef.js';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('voltway_token') || null);
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('voltway_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Synchronize and verify session on initial mount
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem('voltway_token');
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await authService.getMe();
        if (isMounted && response.success && response.data) {
          const freshProfile = response.data;
          const updatedUser = {
            id: freshProfile.id,
            email: freshProfile.email,
            role: freshProfile.role || 'user',
            profile: freshProfile,
          };
          setUser(updatedUser);
          localStorage.setItem('voltway_user', JSON.stringify(updatedUser));
        }
      } catch (err) {
        // If token is expired or invalid (HTTP 401), clean up
        if (err.statusCode === 401) {
          console.warn('[AUTH] Stored token expired or invalid. Logging out.');
          localStorage.removeItem('voltway_token');
          localStorage.removeItem('voltway_user');
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Log in user with credentials
   */
  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const res = await authService.login({ email, password });
      if (res.success && res.data) {
        const { access_token, user: userData } = res.data;
        setToken(access_token);
        setUser(userData);
        localStorage.setItem('voltway_token', access_token);
        localStorage.setItem('voltway_user', JSON.stringify(userData));
        return { success: true, user: userData };
      }
      throw new Error(res.message || 'Login failed');
    } catch (err) {
      const message = err.message || 'Invalid email or password.';
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  /**
   * Register a new driver account
   */
  const register = useCallback(async ({ email, password, full_name, phone }) => {
    setAuthError(null);
    try {
      const res = await authService.register({ email, password, full_name, phone });
      if (res.success && res.data) {
        const { user: userData, session } = res.data;
        // If Supabase issued a session immediately (email confirmation disabled)
        if (session?.access_token) {
          setToken(session.access_token);
          setUser(userData);
          localStorage.setItem('voltway_token', session.access_token);
          localStorage.setItem('voltway_user', JSON.stringify(userData));
        }
        return { success: true, user: userData, hasSession: Boolean(session?.access_token) };
      }
      throw new Error(res.message || 'Registration failed');
    } catch (err) {
      const message = err.message || 'Failed to create account.';
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  /**
   * Log out current user
   */
  const logout = useCallback(() => {
    localStorage.removeItem('voltway_token');
    localStorage.removeItem('voltway_user');
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    authError,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
