import { createContext, useContext, useState, useCallback } from 'react';
import { changePasswordRequest, loginRequest } from '@/lib/authApi';

const USER_STORAGE_KEY = 'edutrack_user';
const TOKEN_STORAGE_KEY = 'edutrack_token';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || null;
  });

  const login = useCallback(async (email, password) => {
    const authData = await loginRequest(email, password);

    setUser(authData.user);
    setToken(authData.token);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authData.user));
    sessionStorage.setItem(TOKEN_STORAGE_KEY, authData.token);

    return authData.user;
  }, []);

  const changePassword = useCallback(
    async (request) => {
      if (!token) {
        throw new Error('You are not authenticated. Please login again.');
      }

      await changePasswordRequest(
        token,
        request.currentPassword,
        request.newPassword
      );
    },
    [token]
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
