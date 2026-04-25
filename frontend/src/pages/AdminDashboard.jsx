import { ShieldCheck, Server, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../supabaseClient';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 hidden md:flex md:flex-col">
        <h2 className="text-2xl font-bold text-medicalPrimary mb-8">OralDetect Admin</h2>
        <nav className="flex-1 space-y-2">
          <div className="flex items-center space-x-3 text-slate-700 bg-slate-100 p-3 rounded-lg font-medium">
            <ShieldCheck size={20} />
            <span>Backend-Aligned View</span>
          </div>
        </nav>
        <button onClick={handleLogout} className="flex items-center space-x-3 text-slate-500 hover:text-red-600 mt-auto p-3 font-medium transition-colors">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-500 mt-1">Frontend aligned to currently available backend endpoints</p>
          </div>
        </header>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-3xl">
          <div className="flex items-start gap-3">
            <Server className="text-medicalPrimary mt-1" size={20} />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">No dedicated admin metrics endpoint in backend</h2>
              <p className="text-slate-600 mt-2 text-sm">
                The previous UI called a mock service at localhost:5000, which is not part of the FastAPI backend.
                This page is now backend-aligned and intentionally avoids unsupported API calls.
              </p>
              <button
                onClick={() => navigate('/doctor/dashboard')}
                className="mt-4 px-4 py-2 rounded-lg bg-medicalPrimary text-white font-medium hover:bg-blue-600 transition-colors"
              >
                Go to Prediction Workspace
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
