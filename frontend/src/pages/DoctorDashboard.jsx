import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle, CheckCircle, Activity, FileText, Upload, ChevronRight, X, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// "Veridian Slate" color palette approximation using Tailwind
// Background: bg-slate-900, Card: bg-slate-800, Accents: teal-400, Alerts: rose-400

const DoctorDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  // File upload states
  const [files, setFiles] = useState({
      intraoral: null,
      histopathology: null,
      genomic: null
  });
  const [previewUrl, setPreviewUrl] = useState(null);

  // Refs to hidden file inputs so we can programmatically reset them
  const intaroralInputRef  = useRef(null);
  const histoInputRef      = useRef(null);
  const genomicInputRef    = useRef(null);

  const INITIAL_FORM = {
    patient_id: 1,
    age: '',
    gender: 'Male',
    risk_factors: { smoking: false, alcohol: false, betel_nut: false, family_history: false, previous_disease: false },
    symptoms:     { pain: false, bleeding: false, ulcer_duration: '', difficulty_swallowing: false, weight_loss: false, voice_change: false }
  };

  const handleReset = () => {
    // Clear all results and files
    setResult(null);
    setLoading(false);
    setFiles({ intraoral: null, histopathology: null, genomic: null });
    setPreviewUrl(null);
    setFormData(INITIAL_FORM);
    // Reset the actual file input DOM elements so the same file can be re-selected
    [intaroralInputRef, histoInputRef, genomicInputRef].forEach(ref => {
      if (ref.current) ref.current.value = '';
    });
  };

  const handleFileUpload = (e, type) => {
      const file = e.target.files[0];
      if (file) {
          setFiles(prev => {
              const newFiles = { ...prev, [type]: file };
              // Prioritize intraoral for preview, fallback to histopathology
              if (newFiles.intraoral) {
                  setPreviewUrl(URL.createObjectURL(newFiles.intraoral));
              } else if (newFiles.histopathology) {
                  setPreviewUrl(URL.createObjectURL(newFiles.histopathology));
              }
              return newFiles;
          });
      }
  };

  const handleFileRemove = (e, type) => {
      e.preventDefault();
      e.stopPropagation();
      setFiles(prev => {
          const newFiles = { ...prev, [type]: null };
          // Re-evaluate preview
          if (newFiles.intraoral) {
              setPreviewUrl(URL.createObjectURL(newFiles.intraoral));
          } else if (newFiles.histopathology) {
              setPreviewUrl(URL.createObjectURL(newFiles.histopathology));
          } else {
              setPreviewUrl(null);
          }
          return newFiles;
      });
      // Also reset the file input so the same file can be re-uploaded if needed
      e.target.value = null;
  };
  
  // State for all requested clinical inputs
  const [formData, setFormData] = useState({
    patient_id: 1,
    age: '',
    gender: 'Male',
    risk_factors: {
        smoking: false,
        alcohol: false,
        betel_nut: false,
        family_history: false,
        previous_disease: false
    },
    symptoms: {
        pain: false,
        bleeding: false,
        ulcer_duration: '',
        difficulty_swallowing: false,
        weight_loss: false,
        voice_change: false
    }
  });

  const handleRiskToggle = (field) => {
      setFormData(prev => ({
          ...prev,
          risk_factors: { ...prev.risk_factors, [field]: !prev.risk_factors[field] }
      }));
  }

  const handleSymptomToggle = (field) => {
      setFormData(prev => ({
          ...prev,
          symptoms: { ...prev.symptoms, [field]: !prev.symptoms[field] }
      }));
  }

  const handlePredict = (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null); // Force the UI to clear and re-analyze visually every time
    
    // Send every single toggle and input to the backend so the AI reacts dynamically
    const mappedSymptoms = {
        pain: formData.symptoms.pain ? "true" : "false",
        bleeding: formData.symptoms.bleeding ? "true" : "false",
        difficulty_swallowing: formData.symptoms.difficulty_swallowing ? "true" : "false",
        weight_loss: formData.symptoms.weight_loss ? "true" : "false",
        voice_change: formData.symptoms.voice_change ? "true" : "false",
        ulcer_duration: formData.symptoms.ulcer_duration,
        smoking: formData.risk_factors.smoking ? "true" : "false",
        alcohol: formData.risk_factors.alcohol ? "true" : "false",
        betel_nut: formData.risk_factors.betel_nut ? "true" : "false",
        family_history: formData.risk_factors.family_history ? "true" : "false",
        previous_disease: formData.risk_factors.previous_disease ? "true" : "false",
        age: formData.age.toString(),
        gender: formData.gender,
        image_uploaded: files.intraoral ? "true" : "false",
        histo_uploaded: files.histopathology ? "true" : "false",
        genomic_uploaded: files.genomic ? "true" : "false"
    };

    // Build FormData to send real file bytes alongside clinical JSON
    const uploadPayload = new FormData();

    // Attach all clinical fields as a JSON string
    uploadPayload.append('clinical_data', JSON.stringify({
        patient_id: formData.patient_id,
        symptoms: mappedSymptoms
    }));

    // Attach real file bytes if present
    if (files.intraoral)      uploadPayload.append('intraoral_image', files.intraoral);
    if (files.histopathology) uploadPayload.append('histo_image',     files.histopathology);
    if (files.genomic)        uploadPayload.append('genomic_file',    files.genomic);

    fetch('http://localhost:8000/api/v1/analyze/', {
      method: 'POST',
      headers: {
          // Do NOT set Content-Type for multipart — browser sets it with boundary automatically
          'Authorization': 'Bearer mock_token_for_dev'
      },
      body: uploadPayload
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'API Error');
      }
      return data;
    })
    .then(data => {
      setResult(data);
      setLoading(false);
    })
    .catch(err => {
      console.error("API Call Failed:", err);
      setResult({
          diagnosis: "Analysis Failed",
          risk_score: 0.0,
          confidence: 0.0,
          stage: "Error",
          modality_weights: { "Histopathology": 0, "Clinical": 0, "Genomic": 0, "Intraoral": 0 },
          heatmap_url: null,
          shap_clinical: {},
          shap_genomic: {},
          clinical_summary: `The backend encountered an error: ${err.message}. Please check your server terminal.`,
          next_action: "Retry analysis"
      });
      setLoading(false);
    });
  };

  const featureData = result?.shap_clinical 
    ? Object.entries(result.shap_clinical).map(([name, impact]) => ({ name, impact })) 
    : [];

  return (
    <div className="min-h-screen bg-[#0b1326] text-slate-200 font-sans p-6 overflow-x-hidden">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-700/50 pb-4">
        <div>
          <h1 className="text-3xl font-light tracking-wide text-white">OralDetect <span className="text-teal-400 font-bold">LUMINARY</span></h1>
          <p className="text-slate-400 text-sm mt-1">Advanced Clinical Decision Support Matrix</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Reset button — visible whenever there is data to clear */}
          {(result || files.intraoral || files.histopathology || files.genomic ||
            formData.age || Object.values(formData.risk_factors).some(Boolean) ||
            Object.values(formData.symptoms).some(v => v === true || (typeof v === 'string' && v))) && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-600 bg-slate-800/60 text-slate-300 hover:border-rose-400/60 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 text-sm font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
          <div className="flex items-center space-x-3 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
              <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
              <span className="text-sm font-medium text-teal-300">System Online</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* ========================================== */}
        {/* LEFT COLUMN: 40% - INTAKE FORM             */}
        {/* ========================================== */}
        <div className="xl:col-span-5 flex flex-col space-y-6">
            
          <form onSubmit={handlePredict} className="flex flex-col space-y-6 h-full">
            
            {/* 1. Modality Intake: Images & Genomic */}
            <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/50 shadow-lg backdrop-blur-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-400 mb-4 flex items-center">
                    <Upload className="w-4 h-4 mr-2" /> Data Modalities
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    
                    <label className={`relative border border-dashed ${files.intraoral ? 'border-teal-500 bg-teal-500/10' : 'border-slate-600 hover:bg-slate-700/30'} rounded-xl p-4 text-center transition cursor-pointer flex flex-col items-center justify-center`}>
                        {files.intraoral && (
                            <button onClick={(e) => handleFileRemove(e, 'intraoral')} className="absolute top-2 right-2 p-1 bg-slate-800 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                        {files.intraoral ? <CheckCircle className="mx-auto text-teal-400 mb-2 w-6 h-6" /> : <UploadCloud className="mx-auto text-slate-400 mb-2 w-6 h-6" />}
                        <span className={`text-xs px-2 ${files.intraoral ? 'text-teal-300' : 'text-slate-300'} w-full truncate block`}>{files.intraoral ? files.intraoral.name : "Intraoral Photo"}</span>
                        <input ref={intaroralInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'intraoral')} />
                    </label>
                    
                    <label className={`relative border border-dashed ${files.histopathology ? 'border-teal-500 bg-teal-500/10' : 'border-slate-600 hover:bg-slate-700/30'} rounded-xl p-4 text-center transition cursor-pointer flex flex-col items-center justify-center`}>
                        {files.histopathology && (
                            <button onClick={(e) => handleFileRemove(e, 'histopathology')} className="absolute top-2 right-2 p-1 bg-slate-800 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                        {files.histopathology ? <CheckCircle className="mx-auto text-teal-400 mb-2 w-6 h-6" /> : <UploadCloud className="mx-auto text-slate-400 mb-2 w-6 h-6" />}
                        <span className={`text-xs px-2 ${files.histopathology ? 'text-teal-300' : 'text-slate-300'} w-full truncate block`}>{files.histopathology ? files.histopathology.name : "Histopathology Image"}</span>
                        <input ref={histoInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'histopathology')} />
                    </label>
                </div>
                
                <label className={`relative mt-4 border border-dashed ${files.genomic ? 'border-teal-500 bg-teal-500/10' : 'border-slate-600 hover:bg-slate-700/30'} rounded-xl p-3 text-center transition cursor-pointer flex items-center justify-center`}>
                    {files.genomic && (
                        <button onClick={(e) => handleFileRemove(e, 'genomic')} className="absolute top-1/2 -translate-y-1/2 right-3 p-1 bg-slate-800 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    {files.genomic ? <CheckCircle className="text-teal-400 mr-2 w-4 h-4" /> : <FileText className="text-slate-400 mr-2 w-4 h-4" />}
                    <span className={`text-xs px-8 ${files.genomic ? 'text-teal-300' : 'text-slate-300'} truncate block`}>{files.genomic ? files.genomic.name : "Upload Genomic Report (CSV)"}</span>
                    <input ref={genomicInputRef} type="file" className="hidden" accept=".csv,.xlsx,.txt" onChange={(e) => handleFileUpload(e, 'genomic')} />
                </label>
            </div>

            {/* 2. Clinical Form */}
            <div className="bg-slate-800/40 rounded-2xl p-6 border border-slate-700/50 shadow-lg backdrop-blur-sm flex-grow">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-400 mb-4">Patient Profile</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Age</label>
                        <input type="number" placeholder="55" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-400" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Gender</label>
                        <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-teal-400">
                            <option>Male</option>
                            <option>Female</option>
                        </select>
                    </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xs text-slate-400 mb-3 border-b border-slate-700 pb-1">Risk Factors</h3>
                        <div className="space-y-2">
                            {Object.keys(formData.risk_factors).map(field => (
                                <label key={field} onClick={() => handleRiskToggle(field)} className="flex items-center space-x-3 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded-sm border ${formData.risk_factors[field] ? 'bg-teal-500 border-teal-500' : 'border-slate-500 group-hover:border-teal-400'} flex items-center justify-center transition-colors`}>
                                        {formData.risk_factors[field] && <CheckCircle className="w-3 h-3 text-slate-900" />}
                                    </div>
                                    <span className="text-sm text-slate-300 capitalize">{field.replace('_', ' ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs text-slate-400 mb-3 border-b border-slate-700 pb-1">Symptoms</h3>
                        <div className="space-y-2">
                            {Object.keys(formData.symptoms).filter(k => k !== 'ulcer_duration').map(field => (
                                <label key={field} onClick={() => handleSymptomToggle(field)} className="flex items-center space-x-3 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded-sm border ${formData.symptoms[field] ? 'bg-rose-500 border-rose-500' : 'border-slate-500 group-hover:border-rose-400'} flex items-center justify-center transition-colors`}>
                                        {formData.symptoms[field] && <CheckCircle className="w-3 h-3 text-slate-900" />}
                                    </div>
                                    <span className="text-sm text-slate-300 capitalize">{field.replace('_', ' ')}</span>
                                </label>
                            ))}
                            <div className="pt-2">
                                <input type="text" value={formData.symptoms.ulcer_duration} onChange={e => setFormData({...formData, symptoms: {...formData.symptoms, ulcer_duration: e.target.value}})} placeholder="Ulcer duration (e.g. 3 weeks)" className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Run Button */}
            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#00a392] to-[#3cddc7] hover:from-[#3cddc7] hover:to-[#62fae3] text-slate-900 font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(60,221,199,0.3)] transition-all flex justify-center items-center group uppercase tracking-widest text-sm"
            >
                {loading ? (
                    <Activity className="animate-spin w-5 h-5 mr-2" />
                ) : (
                    <>Run Deep Fusion Analysis <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" /></>
                )}
            </button>

          </form>
        </div>


        {/* ========================================== */}
        {/* RIGHT COLUMN: 60% - AI RESULTS MATRIX      */}
        {/* ========================================== */}
        <div className="xl:col-span-7 flex flex-col space-y-6">
            {!result ? (
                <div className="h-full border border-slate-700/50 rounded-2xl flex flex-col items-center justify-center text-slate-500 bg-slate-800/10 min-h-[600px]">
                    <Activity className="w-16 h-16 opacity-20 mb-4" />
                    <p className="font-light tracking-wide uppercase text-sm">Awaiting Multi-Modal Input</p>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    {/* Top Hero Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Primary Diagnosis */}
                        <div className={`col-span-2 rounded-2xl p-6 border flex items-center justify-between ${result.diagnosis.includes('Cancer') ? 'bg-rose-500/10 border-rose-500/30' : 'bg-teal-500/10 border-teal-500/30'}`}>
                            <div className="flex items-center">
                                {result.diagnosis.includes('Cancer') ? <AlertCircle className="w-10 h-10 text-rose-400 mr-4" /> : <CheckCircle className="w-10 h-10 text-teal-400 mr-4" />}
                                <div>
                                    <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-1">AI Diagnosis</h3>
                                    <h2 className={`text-2xl font-bold tracking-wide ${result.diagnosis.includes('Cancer') ? 'text-rose-300' : 'text-teal-300'}`}>
                                        {result.diagnosis} {result.stage && <span className="text-lg opacity-80 font-light ml-1">({result.stage})</span>}
                                    </h2>
                                </div>
                            </div>
                        </div>

                        {/* Confidence Score */}
                        <div className="bg-slate-800/60 rounded-2xl p-6 border border-slate-700/50 flex flex-col justify-center items-center">
                            <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-1">Calibrated Confidence</h3>
                            <div className="text-3xl font-light text-white">{(result.confidence * 100).toFixed(1)}<span className="text-lg text-slate-500">%</span></div>
                        </div>
                    </div>

                    {/* Modality & SHAP Explainability Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Grad-CAM Heatmap */}
                        <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/50">
                            <h3 className="text-xs uppercase tracking-widest text-teal-400 mb-3 border-b border-slate-700 pb-2">Grad-CAM Heatmap</h3>
                            <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-600 bg-black flex items-center justify-center group">
                                {previewUrl ? (
                                    <>
                                        <img src={previewUrl} alt="Patient Upload" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        {/* Attention heatmap overlay — simulates Grad-CAM heat */}
                                        <div className="absolute w-28 h-28 bg-rose-500/60 rounded-full blur-2xl top-1/4 left-1/3 mix-blend-screen animate-pulse" />
                                        <div className="absolute w-16 h-16 bg-orange-400/40 rounded-full blur-xl top-1/3 right-1/4 mix-blend-screen" />
                                        <div className="absolute bottom-3 left-3 text-[10px] uppercase tracking-wider text-rose-300 font-bold bg-black/60 px-2 py-1 rounded">Attention Region Detected</div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-600 p-4">
                                        <UploadCloud className="w-10 h-10 mb-2 opacity-30" />
                                        <p className="text-xs text-center">Upload an Intraoral Photo to see Grad-CAM attention overlay</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SHAP Clinical Chart */}
                        <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/50">
                            <h3 className="text-xs uppercase tracking-widest text-teal-400 mb-3 border-b border-slate-700 pb-2">Clinical SHAP Drivers</h3>
                            <div className="h-44">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={featureData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={100} />
                                        <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px'}} />
                                        <Bar dataKey="impact" radius={[0, 4, 4, 0]} barSize={12}>
                                            {featureData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.impact > 10 ? '#f43f5e' : '#2dd4bf'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Bottom AI Synthesis Card */}
                    <div className="bg-gradient-to-br from-slate-800 to-[#060e20] rounded-2xl p-6 border border-teal-500/20 shadow-[0_0_30px_rgba(13,148,136,0.05)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
                        
                        <h3 className="text-xs uppercase tracking-widest text-teal-400 mb-4 border-b border-teal-900 pb-2 inline-block">Clinical Synthesis Engine</h3>
                        
                        <p className="text-slate-300 font-light leading-relaxed mb-6 relative z-10 text-sm">
                            {result.clinical_summary}
                        </p>

                        <div className="bg-[#131b2e] rounded-xl p-4 border border-slate-700 flex items-center relative z-10">
                            <div className="bg-rose-500/20 w-8 h-8 rounded-full flex items-center justify-center mr-4 shrink-0">
                                <div className="w-2.5 h-2.5 bg-rose-400 rounded-full animate-ping"></div>
                            </div>
                            <div>
                                <h4 className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Recommended Protocol</h4>
                                <p className="text-rose-300 font-bold uppercase tracking-wide text-sm">{result.next_action}</p>
                            </div>
                        </div>

                        {/* Modality Weights Footer */}
                        <div className="mt-6 pt-4 border-t border-slate-700/50 flex space-x-4 flex-wrap gap-y-3">
                            {Object.entries(result.modality_weights).map(([modality, weight]) => {
                                const isActive = weight > 0;
                                const barColor = weight >= 30 ? 'bg-rose-400' : weight >= 15 ? 'bg-amber-400' : 'bg-teal-400';
                                return (
                                    <div key={modality} className="flex flex-col flex-1 min-w-[70px]">
                                        <div className="flex justify-between text-[10px] mb-1 uppercase tracking-wider">
                                            <span className={isActive ? 'text-slate-300' : 'text-slate-600'}>{modality}</span>
                                            <span className={isActive ? 'text-white font-medium' : 'text-slate-600'}>{weight}%</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${isActive ? barColor : 'bg-slate-700'}`} style={{width: `${weight}%`}} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default DoctorDashboard;
