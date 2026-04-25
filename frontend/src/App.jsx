import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { hasActiveSession, isDemoAuthMode, supabaseConfigError } from './supabaseClient';

function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const runCheck = async () => {
      const sessionExists = await hasActiveSession();
      if (isMounted) {
        setHasSession(sessionExists);
        setChecking(false);
      }
    };

    runCheck();

    return () => {
      isMounted = false;
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">
        Checking session...
      </div>
    );
  }

  if (isDemoAuthMode && !hasSession) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-6 text-center text-slate-600">
        {supabaseConfigError}
      </div>
    );
  }

  return hasSession ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/doctor/dashboard"
            element={(
              <ProtectedRoute>
                <DoctorDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/dashboard"
            element={(
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            )}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
