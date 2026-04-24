import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Activity, Stethoscope, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const handlePredict = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock the file upload and processing
    setTimeout(() => {
      fetch('http://localhost:5000/api/predict', {
        method: 'POST',
      })
      .then(res => res.json())
      .then(data => {
        setResult(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
    }, 800);
  };

  const featureData = result ? [
    { name: 'Smoking History', impact: 30 },
    { name: 'Symptom Duration', impact: 20 },
    { name: 'Age Factor', impact: 15 },
    { name: 'Clinical Appearance', impact: 35 },
  ] : [];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col hidden md:flex">
        <h2 className="text-2xl font-bold text-medicalPrimary mb-8">OralDetect</h2>
        <nav className="flex-1 space-y-2">
          <a href="#" className="flex items-center space-x-3 text-medicalPrimary bg-blue-50 p-3 rounded-lg font-medium">
            <Stethoscope size={20} />
            <span>Diagnosis Hub</span>
          </a>
          <a href="#" className="flex items-center space-x-3 text-slate-500 hover:bg-slate-50 p-3 rounded-lg font-medium transition-colors">
            <FileText size={20} />
            <span>Patient Records</span>
          </a>
        </nav>
        <button onClick={() => navigate('/login')} className="flex items-center space-x-3 text-slate-500 hover:text-red-600 mt-auto p-3 font-medium transition-colors">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto w-full">
        <header className="mb-8 border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-bold text-slate-900">Clinical Decision Support</h1>
          <p className="text-slate-500 mt-1">Submit patient data for multi-modal AI analysis</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <FileText className="mr-2 text-medicalPrimary" size={24} />
                Patient Data Input
              </h2>
              
              <form onSubmit={handlePredict} className="space-y-4">
                {/* Image Uploads */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                  <UploadCloud className="mx-auto text-slate-400 mb-2" size={32} />
                  <p className="text-sm text-slate-600 font-medium">Upload Oral Image</p>
                  <p className="text-xs text-slate-400">JPG, PNG up to 10MB</p>
                </div>
                
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                  <UploadCloud className="mx-auto text-slate-400 mb-2" size={32} />
                  <p className="text-sm text-slate-600 font-medium">Upload Histopathology (Optional)</p>
                </div>

                {/* Clinical Fields */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Age</label>
                    <input type="number" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-medicalPrimary outline-none my-1" placeholder="e.g. 55" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                    <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-medicalPrimary outline-none my-1">
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Smoking/Tobacco History</label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-medicalPrimary outline-none my-1">
                    <option>Never</option>
                    <option>Current Smoker</option>
                    <option>Former Smoker</option>
                    <option>Chewing Tobacco</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-medicalPrimary hover:bg-blue-600 text-white font-semibold py-3 rounded-lg shadow-md transition-all mt-4 flex justify-center items-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    "Run AI Analysis"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: AI Results */}
          <div className="lg:col-span-7 space-y-6">
            {!result ? (
              <div className="bg-slate-100 rounded-xl border border-slate-200 h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 shadow-inner">
                <Activity size={48} className="mb-4 opacity-50" />
                <p>Awaiting patient data for analysis...</p>
              </div>
            ) : (
              <>
                {/* Top Summary Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center bg-gradient-to-r from-white to-slate-50">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Diagnosis Result</h2>
                    <div className="flex items-center mt-2">
                       {result.diagnosis === 'Cancer' ? (
                          <AlertTriangle className="text-danger mr-2" size={28} />
                       ) : (
                          <CheckCircle className="text-safe mr-2" size={28} />
                       )}
                       <span className={`text-3xl font-bold ${result.diagnosis === 'Cancer' ? 'text-danger' : 'text-safe'}`}>
                         {result.diagnosis}
                       </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Risk & Confidence</h2>
                    <div className="flex space-x-6 mt-2">
                      <div>
                        <div className="text-2xl font-bold text-slate-800">{(result.risk_score * 100).toFixed(0)}%</div>
                        <div className="text-xs text-slate-400">Risk Score</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-slate-800">{(result.confidence * 100).toFixed(0)}%</div>
                        <div className="text-xs text-slate-400">AI Confidence</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Explainability Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">AI Explainability</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Heatmap */}
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">Image Attention Heatmap</p>
                      <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center aspect-video relative">
                        <img 
                          src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                          alt="Medical Image" 
                          className="w-full h-full object-cover mix-blend-multiply opacity-50"
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/40 via-transparent to-transparent mix-blend-multiply"></div>
                        <div className="absolute w-16 h-16 bg-red-500/50 rounded-full blur-xl top-1/3 left-1/2"></div>
                      </div>
                    </div>

                    {/* Feature Importance */}
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-2">Clinical Feature Impact</p>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={featureData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={90} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Bar dataKey="impact" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={16}>
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-rose-200 bg-rose-50/30">
                  <h3 className="text-lg font-bold text-rose-900 mb-3 border-b border-rose-100 pb-2">Clinical Recommendations</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <div className="bg-rose-100 p-1 rounded-full mr-3 mt-0.5">
                        <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                      </div>
                      <div>
                        <p className="font-semibold text-rose-900">Immediate Biopsy Recommended</p>
                        <p className="text-sm text-rose-700/80">High probability of malignant transformation observed in lateral border.</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <div className="bg-amber-100 p-1 rounded-full mr-3 mt-0.5">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      </div>
                      <div>
                        <p className="font-semibold text-amber-900">Oncology Referral</p>
                        <p className="text-sm text-amber-700/80">Schedule consultation with surgical oncologist within 1 week.</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
