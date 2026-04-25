import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthPage from '../components/AuthPage'
import { isDemoAuthMode, signIn, supabaseConfigError } from '../supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('demo@doctor.com')
  const [password, setPassword] = useState('password')
  const [showPassword, setShowPassword] = useState(false)
  const [agree, setAgree] = useState(true)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    setError('')

    if (!email) nextErrors.email = 'Email is required'
    if (!password) nextErrors.password = 'Password is required'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setLoading(true)
    try {
      const { error: authError } = await signIn({ email, password })
      if (authError) {
        setError(authError.message)
        return
      }
      navigate('/doctor/dashboard', { replace: true })
    } catch (loginError) {
      setError(loginError.message || 'Unexpected login error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPage
      mode="login"
      title="Welcome back"
      subtitle="Sign in to your OralScan AI account"
      successMessage={location.state?.signupSuccess || ''}
      warningMessage={isDemoAuthMode ? `${supabaseConfigError} Use demo@doctor.com / password.` : ''}
      onModeChange={(mode) => navigate(mode === 'login' ? '/login' : '/signup')}
      onSubmit={handleSubmit}
      submitLabel="Continue to Workspace"
      loadingLabel="Opening workspace..."
      bottomPrompt="Need a new account?"
      bottomAction="Create one"
      onBottomAction={() => navigate('/signup')}
      state={{
        email,
        setEmail,
        password,
        setPassword,
        showPassword,
        setShowPassword,
        agree,
        setAgree,
        loading,
        error,
        errors,
      }}
    />
  )
}
