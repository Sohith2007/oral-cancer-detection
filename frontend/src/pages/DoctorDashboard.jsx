import { useEffect, useMemo, useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Activity, Stethoscope, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken, isDemoAuthMode, signOut, supabaseConfigError } from '../supabaseClient';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState('');

  const [schema, setSchema] = useState(null);
  const [histopathologyImage, setHistopathologyImage] = useState(null);
  const [intraOralImage, setIntraOralImage] = useState(null);
  const [clinicalData, setClinicalData] = useState({
    age: 55,
    gender: 'Male',
    tobacco_history: 'Never',
  });
  const [geneDataText, setGeneDataText] = useState('{"gene_1": 0.12, "gene_2": 0.28}');

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1').replace(/^['"]|['"]$/g, '');

  useEffect(() => {
    const loadSchema = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${apiUrl}/predict/schema`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
          throw new Error(`Schema request failed (${response.status})`);
        }
        const payload = await response.json();
        setSchema(payload);
      } catch (err) {
        console.warn('Could not load schema:', err.message);
        setApiError('Could not load prediction schema from backend.');
      }
    };

    loadSchema();
  }, [apiUrl, navigate]);

  const clinicalFields = useMemo(() => {
    const defaultFields = ['age', 'gender', 'tobacco_history'];
    if (!schema?.clinical_features?.length) {
      return defaultFields;
    }

    const preferred = schema.clinical_features.slice(0, 8);
    return preferred.length ? preferred : defaultFields;
  }, [schema]);

  const updateClinicalField = (field, value) => {
    setClinicalData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };
  
  const handlePredict = async (e) => {
    e.preventDefault();
    setApiError('');
    setLoading(true);
    
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Session not found. Please login again.');
      }

      const formData = new FormData();
      if (histopathologyImage) {
        formData.append('histopathology_image', histopathologyImage);
      }
      if (intraOralImage) {
        formData.append('intra_oral_image', intraOralImage);
      }
      formData.append('clinical_data', JSON.stringify(clinicalData));
      formData.append('gene_data', geneDataText?.trim() ? geneDataText : '{}');
      
      const response = await fetch(`${apiUrl}/predict/multimodal`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`API Error ${response.status}: ${detail}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setApiError(`Failed to run prediction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-6 hidden md:flex md:flex-col">
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
        <button onClick={handleLogout} className="flex items-center space-x-3 text-slate-500 hover:text-red-600 mt-auto p-3 font-medium transition-colors">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto w-full">
        <header className="mb-8 border-b border-slate-200 pb-4">
          <h1 className="text-3xl font-bold text-slate-900">Clinical Decision Support</h1>
          <p className="text-slate-500 mt-1">Submit patient data for multi-modal AI analysis</p>
          {isDemoAuthMode ? (
            <p className="mt-2 text-sm text-amber-700">{supabaseConfigError}</p>
          ) : null}
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
                <label className="block border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                  <UploadCloud className="mx-auto text-slate-400 mb-2" size={32} />
                  <p className="text-sm text-slate-600 font-medium">Upload Intra-Oral Image</p>
                  <p className="text-xs text-slate-400">JPG, PNG up to 10MB</p>
                  {intraOralImage && <p className="text-xs text-slate-500 mt-2">{intraOralImage.name}</p>}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => setIntraOralImage(e.target.files?.[0] || null)}
                  />
                </label>
                
                <label className="block border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                  <UploadCloud className="mx-auto text-slate-400 mb-2" size={32} />
                  <p className="text-sm text-slate-600 font-medium">Upload Histopathology (Optional)</p>
                  {histopathologyImage && <p className="text-xs text-slate-500 mt-2">{histopathologyImage.name}</p>}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => setHistopathologyImage(e.target.files?.[0] || null)}
                  />
                </label>

                {/* Clinical Fields */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {clinicalFields.map((field) => {
                    const normalized = String(field).toLowerCase();
                    const label = field.replaceAll('_', ' ');
                    const value = clinicalData[field] ?? '';

                    if (normalized.includes('gender')) {
                      return (
                        <div key={field}>
                          <label className="block text-xs font-medium text-slate-700 mb-1 capitalize">{label}</label>
                          <select
                            value={value || 'Male'}
                            onChange={(e) => updateClinicalField(field, e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-medicalPrimary outline-none my-1"
                          >
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                        </div>
                      );
                    }

                    if (normalized.includes('tobacco') || normalized.includes('smok')) {
                      return (
                        <div key={field} className="col-span-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1 capitalize">{label}</label>
                          <select
                            value={value || 'Never'}
                            onChange={(e) => updateClinicalField(field, e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-medicalPrimary outline-none my-1"
                          >
                            <option>Never</option>
                            <option>Current Smoker</option>
                            <option>Former Smoker</option>
                            <option>Chewing Tobacco</option>
                          </select>
                        </div>
                      );
                    }

                    return (
                      <div key={field}>
                        <label className="block text-xs font-medium text-slate-700 mb-1 capitalize">{label}</label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateClinicalField(field, e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-medicalPrimary outline-none my-1"
                          placeholder={`Enter ${label}`}
                        />
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Gene Details (JSON)</label>
                  <textarea
                    value={geneDataText}
                    onChange={(e) => setGeneDataText(e.target.value)}
                    className="w-full min-h-27.5 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-medicalPrimary outline-none my-1 font-mono text-xs"
                    placeholder='{"gene_1": 0.12, "gene_2": 0.28}'
                  />
                </div>

                {apiError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {apiError}
                  </div>
                ) : null}

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
              <div className="bg-slate-100 rounded-xl border border-slate-200 h-full min-h-100 flex flex-col items-center justify-center text-slate-400 shadow-inner">
                <Activity size={48} className="mb-4 opacity-50" />
                <p>Awaiting patient data for analysis...</p>
              </div>
            ) : (
              <>
                {/* Top Summary Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center bg-linear-to-r from-white to-slate-50">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Diagnosis Result</h2>
                    <div className="flex items-center mt-2">
                       {result.final_risk_score > 0.5 ? (
                          <AlertTriangle className="text-danger mr-2" size={28} />
                       ) : (
                          <CheckCircle className="text-safe mr-2" size={28} />
                       )}
                       <span className={`text-3xl font-bold ${result.final_risk_score > 0.5 ? 'text-danger' : 'text-safe'}`}>
                         {result.final_risk_score > 0.5 ? 'High Risk' : 'Low Risk'}
                       </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Risk Score</h2>
                    <div className="flex space-x-6 mt-2">
                      <div>
                        <div className="text-2xl font-bold text-slate-800">{(result.final_risk_score * 100).toFixed(1)}%</div>
                        <div className="text-xs text-slate-400">AI Fusion Score</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Explainability Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Gemini AI Clinical Insight</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    {result.clinical_insight}
                  </p>
                  
                  <h3 className="text-md font-bold text-slate-800 mb-3 border-t border-slate-100 pt-4">Base Model Dependencies</h3>
                  <div className="space-y-3">
                    {Object.entries(result.feature_dependencies || {}).map(([model, deps]) => (
                      <div key={model} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-xs font-semibold text-slate-700">{model.replace('.pkl', '').replace('.joblib', '')}</p>
                        <p className="text-xs text-slate-500 mt-1">{deps}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="p-6 rounded-xl shadow-sm border border-rose-200 bg-rose-50/30">
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
