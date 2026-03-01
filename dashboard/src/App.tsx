import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem('zirel_tenant_id');
    if (savedId) {
      setTenantId(savedId);
    }
  }, []);

  const handleLogin = (id: string) => {
    localStorage.setItem('zirel_tenant_id', id);
    setTenantId(id);
  };

  const handleLogout = () => {
    localStorage.removeItem('zirel_tenant_id');
    setTenantId(null);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD]">
      <Toaster position="top-center" />
      {!tenantId ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard tenantId={tenantId} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
