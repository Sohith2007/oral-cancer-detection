import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, ShieldCheck } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('doctor');

  const handleLogin = (e) => {
    e.preventDefault();
    if (role === 'doctor') {
      navigate('/doctor/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-medicalSecondary p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-medicalSecondary">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-medicalPrimary mb-2">OralDetect AI</h1>
          <p className="text-slate-500">Clinical Decision Support System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="flex justify-center space-x-4 mb-6">
            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all ${
                role === 'doctor'
                  ? 'bg-medicalPrimary text-white shadow-md'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Stethoscope size={20} />
              <span>Doctor</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all ${
                role === 'admin'
                  ? 'bg-medicalPrimary text-white shadow-md'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck size={20} />
              <span>Admin</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-medicalPrimary focus:border-transparent transition-all outline-none"
              placeholder={`demo@${role}.com`}
              defaultValue={`demo@${role}.com`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-medicalPrimary focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
              defaultValue="password"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-medicalPrimary hover:bg-blue-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
