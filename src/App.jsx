import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/Login';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SettingsPanel from './components/SettingsPanel';

function AuthedApp() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <Dashboard />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function Gate() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? (
    <PortfolioProvider>
      <AuthedApp />
    </PortfolioProvider>
  ) : (
    <Login />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ThemeProvider>
  );
}
