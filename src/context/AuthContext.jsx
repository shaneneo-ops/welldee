import { createContext, useContext, useState } from 'react';
import { ADMIN_PASSPHRASE, STORAGE_KEYS } from '../utils/constants';
import { loadJSON, removeKey, saveJSON } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => loadJSON(STORAGE_KEYS.AUTH_SESSION, null)?.authenticated === true
  );

  function login(passphrase) {
    if (passphrase !== ADMIN_PASSPHRASE) {
      return { ok: false, error: 'Incorrect passphrase. Please try again.' };
    }
    // Generate a deterministic user ID for backend sync (same ID across all sessions/browsers)
    const userId = `user-${Buffer.from(ADMIN_PASSPHRASE).toString('base64').slice(0, 16)}`;
    localStorage.setItem('welldee_user_id', userId);
    saveJSON(STORAGE_KEYS.AUTH_SESSION, { authenticated: true, loginAt: new Date().toISOString() });
    setIsAuthenticated(true);
    return { ok: true };
  }

  function logout() {
    localStorage.removeItem('welldee_user_id');
    removeKey(STORAGE_KEYS.AUTH_SESSION);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
