import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { isAuthenticated, logout } from './lib/auth';

function App() {
  const [isAuth, setIsAuth] = useState<boolean>(() => isAuthenticated());

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
      {!isAuth ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
