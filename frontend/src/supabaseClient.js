import { createClient } from '@supabase/supabase-js'

const DEMO_EMAIL = 'demo@doctor.com'
const DEMO_PASSWORD = 'password'
const DEMO_TOKEN = 'demo-local-token'
const DEMO_STORAGE_KEY = 'oraldetect-demo-session'

const stripWrappingQuotes = (value) => {
  if (!value) return ''
  return value.replace(/^['"]|['"]$/g, '')
}

const supabaseUrl = stripWrappingQuotes(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = stripWrappingQuotes(import.meta.env.VITE_SUPABASE_ANON_KEY)

const looksLikePlaceholder =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('your-project-id') ||
  supabaseAnonKey.includes('your-anon-or-service-role')

export const isDemoAuthMode = looksLikePlaceholder
export const supabaseConfigError = isDemoAuthMode
  ? 'Supabase is not configured, so the app is running in local demo mode.'
  : ''

export const supabase = isDemoAuthMode
  ? null
  : createClient(supabaseUrl, supabaseAnonKey)

export const getDemoSession = () => {
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const setDemoSession = (email = DEMO_EMAIL) => {
  const session = {
    access_token: DEMO_TOKEN,
    user: { id: 'demo-user', email },
  }
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(session))
  return session
}

export const clearDemoSession = () => {
  window.localStorage.removeItem(DEMO_STORAGE_KEY)
}

export const signIn = async ({ email, password }) => {
  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    setDemoSession(email)
    return { error: null }
  }

  return {
    error: new Error('Use demo@doctor.com / password while running in local demo mode.'),
  }
}

export const signUp = async ({ email, password, profile = {} }) => {
  if (supabase) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: profile,
      },
    })
    return { error }
  }

  return { error: null }
}

export const signOut = async () => {
  if (supabase) {
    await supabase.auth.signOut()
    return
  }

  clearDemoSession()
}

export const getAccessToken = async () => {
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  return getDemoSession()?.access_token || null
}

export const hasActiveSession = async () => {
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    return Boolean(session)
  }

  return Boolean(getDemoSession())
}
