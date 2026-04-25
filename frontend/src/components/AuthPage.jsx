import { BriefcaseBusiness, Check, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'

function getStrength(password) {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

const strengthMap = [
  { label: '', color: 'var(--border)' },
  { label: 'Weak', color: 'var(--error)' },
  { label: 'Fair', color: 'var(--coral)' },
  { label: 'Good', color: 'oklch(0.70 0.14 80)' },
  { label: 'Strong', color: 'var(--success)' },
]

function PasswordStrength({ password }) {
  const score = getStrength(password)
  const info = strengthMap[score]
  return (
    <div className="pw-strength">
      <div className="pw-bars">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="pw-bar" style={{ background: index <= score ? info.color : 'var(--border)' }} />
        ))}
      </div>
      {password ? <div className="pw-text" style={{ color: info.color }}>{info.label}</div> : null}
    </div>
  )
}

function ScanIllustration() {
  return (
    <div className="scan-illustration">
      <div className="scan-box">
        <div className="scan-inner">
          <div className="scan-label">AI Analysis</div>
          <div className="scan-dots">
            {Array.from({ length: 15 }).map((_, index) => (
              <div key={index} className={`dot ${index === 1 || index === 6 || index === 10 ? 'active' : ''}`} />
            ))}
          </div>
          <div className="confidence-bar" style={{ marginTop: 14 }}>
            <div className="conf-label"><span>Confidence</span><span style={{ color: 'var(--teal)' }}>94.2%</span></div>
            <div className="conf-track"><div className="conf-fill" /></div>
          </div>
          <div className="confidence-bar" style={{ marginTop: 8 }}>
            <div className="conf-label"><span>Risk Score</span><span style={{ color: 'var(--success)' }}>Low</span></div>
            <div className="conf-track"><div className="conf-fill" style={{ background: 'var(--success)', width: '18%' }} /></div>
          </div>
        </div>
        <div className="scan-line" />
      </div>
    </div>
  )
}

function BrandPanel() {
  return (
    <div className="brand-panel">
      <div className="grid-bg" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="logo-mark">
        <div className="logo-icon">OS</div>
        <div>
          <div className="logo-text">OralScan AI</div>
          <div className="logo-sub">Diagnostic Platform</div>
        </div>
      </div>

      <div className="brand-center">
        <div className="brand-headline">
          Detect <em>early.</em><br />Treat <em>faster.</em><br />Save lives.
        </div>
        <div className="brand-desc">
          AI-powered oral cancer detection that gives clinicians more confidence with structured screening, explainable outputs, and case-ready summaries.
        </div>
        <ScanIllustration />
        <div className="stats-row">
          <div className="stat"><div className="stat-val">94.2%</div><div className="stat-label">Accuracy</div></div>
          <div className="stat"><div className="stat-val">2M+</div><div className="stat-label">Images</div></div>
          <div className="stat"><div className="stat-val">340ms</div><div className="stat-label">Per scan</div></div>
        </div>
      </div>

      <div className="brand-footer">
        <div className="trust-badges">
          <div className="badge">HIPAA</div>
          <div className="badge">Research</div>
          <div className="badge">Explainable AI</div>
          <div className="badge">Clinical Flow</div>
        </div>
      </div>
    </div>
  )
}

function IconField({ label, icon, error, children }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="field-wrap">
        <span className="field-icon">{icon}</span>
        {children}
      </div>
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  )
}

export default function AuthPage({
  mode,
  title,
  subtitle,
  state,
  successMessage,
  warningMessage,
  onModeChange,
  onSubmit,
  submitLabel,
  loadingLabel,
  bottomPrompt,
  bottomAction,
  onBottomAction,
}) {
  const isSignup = mode === 'signup'

  return (
    <div className="auth-page-root">
      <div className="page">
        <BrandPanel />
        <div className="form-panel">
          <div className="form-container">
            <div className="auth-tabs">
              <div className={`tab-slider ${mode}`} />
              <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`} type="button" onClick={() => onModeChange('login')}>
                Sign In
              </button>
              <button className={`tab-btn ${mode === 'signup' ? 'active' : ''}`} type="button" onClick={() => onModeChange('signup')}>
                Create Account
              </button>
            </div>

            <form onSubmit={onSubmit} className="form-slide" noValidate>
              <div className="form-title">{title}</div>
              <div className="form-subtitle">{subtitle}</div>

              {successMessage ? <div className="status-message success">{successMessage}</div> : null}
              {warningMessage ? <div className="status-message">{warningMessage}</div> : null}
              {state.error ? <div className="status-message error">{state.error}</div> : null}

              <div className="portal-note">
                {isSignup
                  ? 'Set up secure access for screening, collaboration, and research-ready review.'
                  : 'Continue into your review workspace, patient queue, and reporting tools.'}
              </div>

              {isSignup ? (
                <>
                  <div className="persona-row">
                    {['Clinician', 'Research', 'Patient'].map((persona) => (
                      <button
                        key={persona}
                        type="button"
                        className={`persona-chip ${state.form.persona === persona ? 'active' : ''}`}
                        onClick={() => state.setForm((prev) => ({ ...prev, persona }))}
                      >
                        {persona}
                      </button>
                    ))}
                  </div>

                  <div className="field-row">
                    <IconField label="First name" icon={<User size={15} />} error={state.errors.firstName}>
                      <input className={`field-input ${state.errors.firstName ? 'error' : ''}`} value={state.form.firstName} onChange={state.updateField('firstName')} placeholder="Jane" />
                    </IconField>
                    <div className="field-group">
                      <label className="field-label">Last name</label>
                      <div className="field-wrap">
                        <input className={`field-input ${state.errors.lastName ? 'error' : ''}`} value={state.form.lastName} onChange={state.updateField('lastName')} placeholder="Smith" style={{ paddingLeft: 14 }} />
                      </div>
                      {state.errors.lastName ? <span className="field-error">{state.errors.lastName}</span> : null}
                    </div>
                  </div>
                </>
              ) : null}

              <IconField label="Email address" icon={<Mail size={15} />} error={isSignup ? state.errors.email : state.errors.email}>
                <input
                  className={`field-input ${(isSignup ? state.errors.email : state.errors.email) ? 'error' : ''}`}
                  type="email"
                  value={isSignup ? state.form.email : state.email}
                  onChange={isSignup ? state.updateField('email') : (event) => state.setEmail(event.target.value)}
                  placeholder={isSignup && state.form.persona === 'Patient' ? 'you@example.com' : 'you@hospital.org'}
                />
              </IconField>

              {isSignup ? (
                <IconField label="Organization" icon={<BriefcaseBusiness size={15} />} error={state.errors.organization}>
                  <input className={`field-input ${state.errors.organization ? 'error' : ''}`} value={state.form.organization} onChange={state.updateField('organization')} placeholder="City Cancer Center" />
                </IconField>
              ) : null}

              {isSignup ? (
                <IconField label="Clinical role" icon={<BriefcaseBusiness size={15} />} error={state.errors.role}>
                  <select className={`field-select ${state.errors.role ? 'error' : ''}`} value={state.form.role} onChange={state.updateField('role')}>
                    <option value="">Select your role</option>
                    {[
                      'Patient',
                      'Oral and Maxillofacial Surgeon',
                      'Dentist',
                      'Oncologist',
                      'Radiologist',
                      'Research Lead',
                      'Nurse or Allied Health',
                      'Hospital Administrator',
                    ].map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </IconField>
              ) : null}

              <IconField label="Password" icon={<Lock size={15} />} error={isSignup ? state.errors.password : state.errors.password}>
                <>
                  <input
                    className={`field-input ${(isSignup ? state.errors.password : state.errors.password) ? 'error' : ''}`}
                    type={state.showPassword ? 'text' : 'password'}
                    value={isSignup ? state.form.password : state.password}
                    onChange={isSignup ? state.updateField('password') : (event) => state.setPassword(event.target.value)}
                    placeholder={isSignup ? 'Minimum 8 characters' : 'Enter your password'}
                    style={{ paddingRight: 38 }}
                  />
                  <button type="button" className="eye-btn" onClick={() => state.setShowPassword((prev) => !prev)}>
                    {state.showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </>
              </IconField>

              {isSignup ? <PasswordStrength password={state.form.password} /> : null}

              {isSignup ? (
                <IconField label="Confirm password" icon={<Lock size={15} />} error={state.errors.confirm}>
                  <input className={`field-input ${state.errors.confirm ? 'error' : ''}`} type={state.showPassword ? 'text' : 'password'} value={state.form.confirm} onChange={state.updateField('confirm')} placeholder="Re-enter password" />
                </IconField>
              ) : (
                <div className="forgot-row">
                  <button type="button" className="forgot-link">Forgot password?</button>
                </div>
              )}

              <div className="check-row" style={{ cursor: 'pointer' }} onClick={() => state.setAgree((prev) => !prev)}>
                <div className={`check-box ${state.agree ? 'checked' : ''}`}>{state.agree ? <Check size={10} /> : null}</div>
                <span className="check-label">
                  {isSignup
                    ? <>I agree to the <a href="#" onClick={(event) => event.stopPropagation()}>Terms</a> and <a href="#" onClick={(event) => event.stopPropagation()}>Privacy Policy</a>. Patient information must be handled responsibly.</>
                    : 'Keep this device trusted for faster sign-in during active case review.'}
                </span>
              </div>
              {isSignup && state.errors.agree ? <div className="field-error" style={{ marginTop: -8, marginBottom: 12 }}>{state.errors.agree}</div> : null}

              <button type="submit" className={`submit-btn ${state.loading ? 'loading' : ''}`} disabled={state.loading}>
                {state.loading ? loadingLabel : submitLabel}
              </button>

              {isSignup ? (
                <div className="portal-note" style={{ marginTop: 16, marginBottom: 0 }}>
                  <div className="helper-list">
                    {[
                      'Verify your email and complete role-based setup.',
                      'Join your clinic, research team, or patient program workspace.',
                      'Start screening, reviewing, and documenting cases in one place.',
                    ].map((item, index) => (
                      <div key={item} className="helper-item">
                        <span className="helper-bullet">{index + 1}</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="foot-switch">
                {bottomPrompt} <button type="button" onClick={onBottomAction}>{bottomAction}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
