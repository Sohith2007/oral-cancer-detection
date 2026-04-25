import { Sparkles } from 'lucide-react'

function MetricCard({ value, label, copy }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/6 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur">
      <div className="font-['Sora'] text-2xl font-bold tracking-[-0.05em] text-cyan-300">{value}</div>
      <div className="mt-2 text-sm font-semibold text-white">{label}</div>
      <div className="mt-1 text-xs leading-5 text-slate-400">{copy}</div>
    </div>
  )
}

function AnalysisPreview() {
  return (
    <div className="mt-8 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,31,54,0.92),rgba(12,18,34,0.98))] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-['Sora'] text-sm font-semibold text-white">Live review workspace</div>
          <div className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
            Structured lesion review, explainable outputs, and quick handoff into the care pathway.
          </div>
        </div>
        <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
          Screening Active
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_45%_35%,rgba(34,211,238,0.16),transparent_28%),linear-gradient(180deg,rgba(10,16,30,0.95),rgba(8,12,24,0.98))] p-5">
          <div className="absolute left-4 right-4 top-5 h-px bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.85),transparent)] shadow-[0_0_18px_rgba(34,211,238,0.45)] animate-[scanline_2.8s_ease-in-out_infinite]" />
          <div className="mx-auto mt-2 grid h-40 w-40 place-items-center rounded-full border border-cyan-300/25">
            <div className="grid h-28 w-28 place-items-center rounded-full border border-dashed border-cyan-300/20">
              <div className="h-14 w-14 rounded-full bg-cyan-300/70 shadow-[0_0_32px_rgba(34,211,238,0.45)]" />
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[18px] border border-white/10 bg-white/6 p-4">
            <div className="text-sm font-semibold text-white">Risk tiering</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              Highlight suspicious regions, urgency, and model confidence in one glance.
            </div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/6 p-4">
            <div className="text-sm font-semibold text-white">Case routing</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              Move findings into biopsy, referral, or discussion workflows with less friction.
            </div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/6 p-4">
            <div className="text-sm font-semibold text-white">Explainability</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              Keep structured evidence next to every recommendation and summary.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthShell({
  mode = 'login',
  title,
  subtitle,
  kicker,
  children,
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.14),transparent_24%),linear-gradient(180deg,#111827,#0b1020)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(180deg,black,transparent_80%)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[minmax(320px,1.05fr)_minmax(380px,560px)]">
        <section className="flex flex-col justify-between gap-10 px-6 py-8 lg:px-12 lg:py-10">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300 font-['Sora'] text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.45)]">
              OS
            </div>
            <div>
              <div className="font-['Sora'] text-base font-semibold">OralScan AI</div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Clinical Access Network</div>
            </div>
          </div>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
              Intelligent triage and review
            </div>
            <h1 className="mt-6 max-w-3xl font-['Sora'] text-4xl font-bold leading-[1.05] tracking-[-0.06em] text-white lg:text-6xl">
              Sign in for <span className="text-cyan-300">faster decisions</span> and safer oral cancer screening.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 lg:text-[15px]">
              A unified portal for clinicians, researchers, and coordinators to review lesions, manage
              patient submissions, and move from scan to action with more clarity.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <MetricCard
                value="94.2%"
                label="AI confidence alignment"
                copy="High-consistency review support across imaging and structured inputs."
              />
              <MetricCard
                value="340ms"
                label="Average scan response"
                copy="Fast enough for live triage discussions during intake and review."
              />
              <MetricCard
                value="3 modes"
                label="Care team access"
                copy="Clinician, research, and patient-friendly onboarding in one flow."
              />
            </div>

            <AnalysisPreview />
          </div>

          <div className="flex flex-wrap gap-3">
            {['HIPAA aware', 'Research ready', 'Team based access', 'Explainable AI'].map((item) => (
              <div
                key={item}
                className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-6 lg:px-8">
          <div className="relative w-full max-w-[480px] overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,35,58,0.9),rgba(12,18,34,0.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.38)] backdrop-blur lg:p-7">
            <div className="absolute left-[-40px] top-[-60px] h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
            <div className="relative">
              <div className="mb-6 flex rounded-2xl border border-white/10 bg-slate-950/35 p-1.5">
                <div
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    mode === 'login' ? 'bg-white/10 text-white' : 'text-slate-400'
                  }`}
                >
                  Sign In
                </div>
                <div
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    mode === 'signup' ? 'bg-white/10 text-white' : 'text-slate-400'
                  }`}
                >
                  Create Account
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                <Sparkles size={12} className="text-cyan-300" />
                {kicker}
              </div>
              <h2 className="mt-4 font-['Sora'] text-3xl font-bold tracking-[-0.05em] text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>

              <div className="mt-6 rounded-[20px] border border-white/10 bg-white/6 p-4">
                <div className="text-sm font-semibold text-white">
                  {mode === 'login' ? 'This portal is built for clinical flow' : 'What access includes'}
                </div>
                <div className="mt-2 text-xs leading-6 text-slate-400">
                  {mode === 'login'
                    ? 'Access scan review, referral notes, and explainable AI results from one controlled workspace.'
                    : 'Role-aware onboarding, secure case access, and a shared workspace for screening and follow-up.'}
                </div>
              </div>

              <div className="mt-6">{children}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
