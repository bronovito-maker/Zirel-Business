import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PublicDataDeletionPage from './components/PublicDataDeletionPage';
import DashboardHelpPage from './components/DashboardHelpPage';
import PublicChatPage from './components/PublicChatPage';
import { isAuthenticated, logout, restoreSession } from './lib/auth';

function App() {
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const restored = await restoreSession();
        if (!cancelled) {
          setIsAuth(restored || isAuthenticated());
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = () => {
    setIsAuth(true);
  };

  const handleLogout = () => {
    void logout().finally(() => {
      setIsAuth(false);
    });
  };

  if (isBootstrapping && pathname !== '/meta/data-deletion' && pathname !== '/chat') {
    return (
      <div className="min-h-screen bg-[#FBFBFD]">
        <Toaster position="top-center" />
        <div className="flex min-h-screen items-center justify-center text-sm font-medium text-gray-500">
          Caricamento sessione...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD]">
      <Toaster position="top-center" />
      {pathname === '/meta/data-deletion' ? (
        <PublicDataDeletionPage />
      ) : pathname === '/chat' ? (
        <PublicChatPage />
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
