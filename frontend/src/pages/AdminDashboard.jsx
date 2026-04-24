import React, { useState, useEffect } from 'react';
import { Users, Activity, CheckCircle, AlertTriangle, LogOut } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Fetch metrics from mock API
    fetch('http://localhost:5000/api/admin/metrics')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error("Error fetching metrics:", err));
  }, []);

  const performanceData = [
    { name: 'Jan', accuracy: 92, precision: 90 },
    { name: 'Feb', accuracy: 93, precision: 91 },
    { name: 'Mar', accuracy: 94, precision: 92 },
    { name: 'Apr', accuracy: 94.5, precision: 92.1 },
  ];

  const distributionData = metrics ? [
    { name: 'Cancer', value: metrics.cancer_cases },
    { name: 'Non-Cancer', value: metrics.non_cancer_cases }
  ] : [];

  const COLORS = ['#ef4444', '#22c55e'];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col hidden md:flex">
        <h2 className="text-2xl font-bold text-medicalPrimary mb-8">OralDetect Admin</h2>
        <nav className="flex-1 space-y-2">
          <a href="#" className="flex items-center space-x-3 text-slate-700 bg-slate-100 p-3 rounded-lg font-medium">
            <Activity size={20} />
            <span>Overview</span>
          </a>
          <a href="#" className="flex items-center space-x-3 text-slate-500 hover:bg-slate-50 p-3 rounded-lg font-medium transition-colors">
            <Users size={20} />
            <span>User Management</span>
          </a>
        </nav>
        <button onClick={() => navigate('/login')} className="flex items-center space-x-3 text-slate-500 hover:text-red-600 mt-auto p-3 font-medium transition-colors">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">System Dashboard</h1>
            <p className="text-slate-500 mt-1">Platform metrics and AI model performance</p>
          </div>
        </header>

        {metrics ? (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-medicalPrimary rounded-lg"><Users size={24} /></div>
                  <span className="text-sm font-medium text-green-600">+12%</span>
                </div>
                <h3 className="text-slate-500 text-sm font-medium">Total Patients</h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total_patients}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Activity size={24} /></div>
                  <span className="text-sm font-medium text-green-600">+5%</span>
                </div>
                <h3 className="text-slate-500 text-sm font-medium">Cases Analyzed</h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total_cases_analyzed}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-50 text-safe rounded-lg"><CheckCircle size={24} /></div>
                </div>
                <h3 className="text-slate-500 text-sm font-medium">Model Accuracy</h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.model_performance.accuracy}%</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-50 text-danger rounded-lg"><AlertTriangle size={24} /></div>
                </div>
                <h3 className="text-slate-500 text-sm font-medium">Cancer Cases Detected</h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.cancer_cases}</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Model Performance Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="accuracy" stroke="#0ea5e9" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="precision" stroke="#8b5cf6" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Case Distribution</h3>
                <div className="h-64 flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medicalPrimary"></div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
