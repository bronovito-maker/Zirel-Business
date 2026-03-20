import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PublicDataDeletionPage from './components/PublicDataDeletionPage';
import DashboardHelpPage from './components/DashboardHelpPage';
import { isAuthenticated, logout } from './lib/auth';

function App() {
  const [isAuth, setIsAuth] = useState<boolean>(() => isAuthenticated());
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  const handleLogin = () => {
    setIsAuth(true);
  };

  const handleLogout = () => {
    logout();
    setIsAuth(false);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD]">
      <Toaster position="top-center" />
      {pathname === '/meta/data-deletion' ? (
        <PublicDataDeletionPage />
      ) : pathname === '/help' ? (
        !isAuth ? <Login onLogin={handleLogin} /> : <DashboardHelpPage />
      ) : !isAuth ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
