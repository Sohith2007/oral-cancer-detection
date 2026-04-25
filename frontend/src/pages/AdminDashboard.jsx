import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../supabaseClient';
import '../styles/Dashboard.css';

/* ── SVG Icons ── */
const Ic = ({ d, size=16, sw=1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p,i) => <path key={i} d={p} />)}
  </svg>
);
const IcLogout   = () => <Ic size={15} d={["M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4","M16 17l5-5-5-5","M21 12H9"]} />;
const IcServer   = () => <Ic size={15} d={["M4 4h16v6H4z", "M4 14h16v6H4z", "M8 7v.01", "M8 17v.01"]} />;
const IcShield   = () => <Ic size={15} d={["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"]} />;

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="dashboard-root">
      <div className="app">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon" style={{ background: 'var(--coral)' }}>OS</div>
            <div>
              <div className="logo-name">OralScan AI Admin</div>
              <div className="logo-sub">System Management</div>
            </div>
          </div>
          <div className="sidebar-nav">
            <div className="nav-label">Navigation</div>
            <div className="nav-item active" style={{ color: 'var(--coral)', background: 'var(--coral-dim)', borderColor: 'oklch(0.68 0.14 28 / 0.2)' }}>
              <IcShield />Backend-Aligned View
            </div>
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
            <div className="topbar-title">Admin Dashboard</div>
            <div className="topbar-sub">Frontend aligned to currently available backend endpoints</div>
          </div>

          <div className="content" style={{ padding: '24px', overflowY: 'auto', display: 'block' }}>
            <div className="card" style={{ maxWidth: '800px' }}>
              <div className="card-header"><IcServer /> System Status</div>
              <div className="card-body">
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>No dedicated admin metrics endpoint in backend</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
                  The previous UI called a mock service at localhost:5000, which is not part of the FastAPI backend.
                  This page is now backend-aligned and intentionally avoids unsupported API calls.
                </p>
                <button 
                  className="run-btn" 
                  style={{ width: 'auto', marginTop: '20px', padding: '10px 20px', background: 'var(--text-primary)', color: 'var(--bg)' }}
                  onClick={() => navigate('/doctor/dashboard')}
                >
                  Go to Prediction Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
