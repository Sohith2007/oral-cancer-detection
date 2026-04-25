import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken, isDemoAuthMode, signOut, supabaseConfigError } from '../supabaseClient';
import '../styles/Dashboard.css';

/* ── SVG Icons ── */
const Ic = ({ d, size=16, sw=1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p,i) => <path key={i} d={p} />)}
  </svg>
);
const IcHub      = () => <Ic size={15} d={["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z","M9 22V12h6v10"]} />;
const IcLogout   = () => <Ic size={15} d={["M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4","M16 17l5-5-5-5","M21 12H9"]} />;
const IcUpload   = () => <Ic size={22} d={["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4","M17 8l-5-5-5 5","M12 3v12"]} />;
const IcFile     = () => <Ic size={14} d={["M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z","M13 2v7h7"]} />;
const IcData     = () => <Ic size={13} d={["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6"]} />;
const IcPlay     = () => <Ic size={16} d="M5 3l14 9-14 9V3z" />;
const IcCheck    = () => <Ic size={14} sw={2.5} d="M20 6L9 17l-5-5" />;
const IcAlert    = () => <Ic size={14} d={["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z","M12 9v4","M12 17h.01"]} />;
const IcActivity = () => <Ic size={24} d="M22 12h-4l-3 9L9 3l-3 9H2" />;
const IcDna      = () => <Ic size={13} d={["M2 15c6.667-6 13.333 0 20-6","M2 9c6.667 6 13.333 0 20 6"]} />;
const IcEye      = () => <Ic size={13} d={["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 100 6 3 3 0 000-6z"]} />;

/* ── Upload Zone ── */
function UploadZone({ label, hint, optional, onFile, file }) {
  const [drag, setDrag] = useState(false);
  return (
    <div style={{ marginBottom: '16px' }}>
      <div className={`upload-zone ${drag ? 'drag' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if(f) onFile(f); }}
      >
        <input type="file" accept="image/*" onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
        <div className="upload-icon"><IcUpload /></div>
        <div className="upload-title">{label}{optional && <span style={{color:'var(--text-muted)',fontWeight:400}}> (Optional)</span>}</div>
        <div className="upload-hint">{hint}</div>
        {file && <div className="upload-file"><IcFile /> {file.name}</div>}
      </div>
      {file && file.type && file.type.startsWith('image/') && (
        <div className="upload-preview" style={{marginTop:8}}>
          <img src={URL.createObjectURL(file)} alt="preview" />
        </div>
      )}
    </div>
  );
}

/* ── Analysis Steps ── */
const STEPS = [
  { id:'img',  label:'Image preprocessing',    sub:'Normalising intra-oral image',         icon: <IcEye /> },
  { id:'hist', label:'Histopathology analysis', sub:'Segmentation & feature extraction',    icon: <IcFile /> },
  { id:'clin', label:'Clinical correlation',    sub:'Age, gender, tobacco risk weighting',  icon: <IcData /> },
  { id:'gen',  label:'Genomic integration',     sub:'Gene expression cross-referencing',    icon: <IcDna /> },
  { id:'inf',  label:'AI inference',            sub:'Ensemble model prediction',            icon: <IcActivity /> },
];

function AnalysisSteps({ step }) {
  return (
    <div className="running-state">
      {STEPS.map((s, i) => {
        const status = i < step ? 'complete' : i === step ? 'active' : 'pending';
        return (
          <div className="analysis-step" key={s.id} style={{animationDelay: i * 0.08 + 's'}}>
            <div className={`step-icon ${status}`}>{s.icon}</div>
            <div>
              <div className="step-name">{s.label}</div>
              <div className="step-sub">{s.sub}</div>
            </div>
            {status === 'active'    && <div className="step-spinner" />}
            {status === 'complete'  && <div style={{marginLeft:'auto',color:'var(--success)'}}><IcCheck /></div>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Result View ── */
function ResultView({ result }) {
  const riskScore = result.final_risk_score || 0;
  const risk = riskScore > 0.65 ? 'high' : riskScore > 0.35 ? 'medium' : 'low';
  const riskMap = {
    low:    { label:'Low Risk',    color:'var(--success)', bar:'var(--success)', pct: (riskScore*100).toFixed(1) },
    medium: { label:'Medium Risk', color:'var(--warn)',    bar:'var(--warn)',    pct: (riskScore*100).toFixed(1) },
    high:   { label:'High Risk',   color:'var(--error)',   bar:'var(--error)',   pct: (riskScore*100).toFixed(1) },
  };
  const r = riskMap[risk];

  return (
    <div className="result-section">
      <div>
        <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'1.2px',color:'var(--text-muted)',marginBottom:6}}>Prediction Outcome</div>
        <div className={`result-headline ${risk}`}>{r.label}</div>
        <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>AI Fusion Score</div>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">Risk Score</div>
          <div className="metric-val" style={{color: r.color}}>{r.pct}%</div>
          <div className="bar-track"><div className="bar-fill" style={{width: r.pct+'%', background: r.color}} /></div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Dependencies</div>
          <div className="metric-val" style={{color:'var(--teal)', fontSize: 18}}>{Object.keys(result.feature_dependencies || {}).length} Models</div>
          <div className="metric-sub">Multi-modal ensemble</div>
        </div>
      </div>

      <div style={{marginTop: 12}}>
        <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'1.2px',color:'var(--text-muted)',marginBottom:8}}>Gemini AI Clinical Insight</div>
        <div className="finding-list">
          <div className="finding-item" style={{whiteSpace: 'pre-wrap'}}>
            <div className="finding-dot" style={{background: r.color}} />
            <div>{result.clinical_insight}</div>
          </div>
        </div>
      </div>

      <div style={{marginTop: 12}}>
        <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'1.2px',color:'var(--text-muted)',marginBottom:8}}>Base Model Explainability</div>
        <div className="finding-list">
          {Object.entries(result.feature_dependencies || {}).map(([model, deps], i) => (
            <div className="finding-item" key={model}>
              <div className="finding-dot" style={{background: 'var(--teal)'}} />
              <div>
                <strong style={{color:'var(--text-primary)'}}>{model.replace('.pkl', '').replace('.joblib', '')}</strong>
                <p style={{marginTop: 4}}>{deps}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('hub');
  
  const [oralImg, setOralImg] = useState(null);
  const [histImg, setHistImg] = useState(null);
  const [clinReport, setClinReport] = useState(null);
  const [geneReport, setGeneReport] = useState(null);
  
  const [status, setStatus] = useState('idle'); // idle | running | done
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  
  const [schema, setSchema] = useState(null);

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
        setError('Could not load prediction schema from backend.');
      }
    };

    loadSchema();
  }, [apiUrl, navigate]);

  // Removed clinical fields and update logic as we are using OCR

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const runAnalysis = async (e) => {
    e.preventDefault();
    if (!oralImg && !clinReport && !histImg && !geneReport) {
      setError('Please upload at least one piece of patient data (Image, Clinical Report, or Gene Report) to run the analysis.');
      return;
    }
    setError(''); 
    setStatus('running'); 
    setStep(0);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Session not found. Please login again.');
      }

      // Fake animation progress while fetch is running
      const stepInterval = setInterval(() => {
        setStep(s => (s < STEPS.length - 1 ? s + 1 : s));
      }, 800);

      const formData = new FormData();
      if (histImg) formData.append('histopathology_image', histImg);
      if (oralImg) formData.append('intra_oral_image', oralImg);
      if (clinReport) formData.append('clinical_report', clinReport);
      if (geneReport) formData.append('gene_report', geneReport);
      
      const response = await fetch(`${apiUrl}/predict/multimodal`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      });
      
      clearInterval(stepInterval);
      setStep(STEPS.length);

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`API Error ${response.status}: ${detail}`);
      }
      
      const data = await response.json();
      setResult(data);
      setStatus('done');
    } catch (err) {
      console.error(err);
      setError(`Failed to run prediction: ${err.message}`);
      setStatus('idle');
    }
  };

  const badgeEl = status === 'idle' ? <span className="results-badge badge-waiting">Awaiting input</span>
                : status === 'running' ? <span className="results-badge badge-running">Analysing...</span>
                : <span className="results-badge badge-done">Complete</span>;

  return (
    <div className="dashboard-root">
      <div className="app">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">OS</div>
            <div>
              <div className="logo-name">OralScan AI</div>
              <div className="logo-sub">Diagnostic</div>
            </div>
          </div>
          <div className="sidebar-nav">
            <div className="nav-label">Navigation</div>
            {[
              { id:'hub', label:'Diagnosis Hub', icon:<IcHub /> },
            ].map(n => (
              <div key={n.id} className={`nav-item ${activeNav===n.id?'active':''}`} onClick={()=>setActiveNav(n.id)}>
                {n.icon}{n.label}
              </div>
            ))}
          </div>
          <div className="sidebar-footer">
            <div className="nav-item" style={{color:'var(--error)',opacity:0.8}} onClick={handleLogout}>
              <IcLogout />Logout
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div className="topbar-title">Clinical Decision Support</div>
            <div className="topbar-sub">Submit patient data for multi-modal AI analysis</div>
            {isDemoAuthMode && <div style={{color:'var(--warn)', fontSize:'12px', marginTop:'4px'}}>{supabaseConfigError}</div>}
          </div>

          <div className="content">
            {/* Form */}
            <div className="form-col">
              <div className="card">
                <div className="card-header"><IcData />Patient Data Input</div>
                <div className="card-body">
                  <UploadZone label="Upload Intra-Oral Image" hint="JPG, PNG up to 10 MB" file={oralImg} onFile={setOralImg} />
                  <UploadZone label="Upload Histopathology" hint="JPG, PNG up to 10 MB" optional file={histImg} onFile={setHistImg} />

                  <UploadZone label="Upload Clinical Report" hint="JPG, PNG up to 10 MB" file={clinReport} onFile={setClinReport} />
                  <UploadZone label="Upload Gene Report" hint="JPG, PNG up to 10 MB" file={geneReport} onFile={setGeneReport} />

                  {error && (
                    <div className="error-banner"><IcAlert />{error}</div>
                  )}

                  <button className={`run-btn ${status==='running'?'loading':''}`}
                    disabled={status==='running'}
                    onClick={runAnalysis}>
                    {status==='running' ? <>Analysing patient data...</> : <><IcPlay />Run AI Analysis</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="results-col">
              <div className="results-header">
                <div className="results-title">Analysis Results</div>
                {badgeEl}
              </div>
              <div className="results-body">
                {status === 'idle' && (
                  <div className="waiting-state">
                    <div className="pulse-ring">
                      <IcActivity />
                    </div>
                    <div className="waiting-title">Awaiting patient data</div>
                    <div className="waiting-sub">Fill in the patient form and run AI analysis to see diagnostic results here.</div>
                  </div>
                )}
                {status === 'running' && <AnalysisSteps step={step} />}
                {status === 'done' && result && <ResultView result={result} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
