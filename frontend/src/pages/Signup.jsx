import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthPage from '../components/AuthPage'
import { isDemoAuthMode, signUp, supabaseConfigError } from '../supabaseClient'

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    role: '',
    persona: 'Clinician',
    password: '',
    confirm: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    setError('')

    if (!form.firstName.trim()) nextErrors.firstName = 'Required'
    if (!form.lastName.trim()) nextErrors.lastName = 'Required'
    if (!form.email.trim()) nextErrors.email = 'Email is required'
    if (!form.organization.trim()) nextErrors.organization = 'Organization is required'
    if (!form.role) nextErrors.role = 'Select your role'
    if (!form.password) nextErrors.password = 'Password is required'
    else if (form.password.length < 8) nextErrors.password = 'Minimum 8 characters'
    if (form.confirm !== form.password) nextErrors.confirm = 'Passwords do not match'
    if (!agree) nextErrors.agree = 'Please accept the terms'

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setLoading(true)
    try {
      const { error: authError } = await signUp({
        email: form.email,
        password: form.password,
        profile: {
          first_name: form.firstName,
          last_name: form.lastName,
          organization: form.organization,
          role: form.role,
          persona: form.persona,
        },
      })
      if (authError) {
        setError(authError.message)
        return
      }
      navigate('/login', {
        replace: true,
        state: {
          signupSuccess: isDemoAuthMode
            ? 'Demo account created. You can sign in right away.'
            : 'Account created. Check your email to verify before signing in.',
        },
      })
    } catch (signupError) {
      setError(signupError.message || 'Unexpected signup error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthPage
      mode="signup"
      title="Create account"
      subtitle="Join the OralScan AI diagnostic platform"
      warningMessage={isDemoAuthMode ? `${supabaseConfigError} Signup still works locally for UI review.` : ''}
      onModeChange={(mode) => navigate(mode === 'login' ? '/login' : '/signup')}
      onSubmit={handleSubmit}
      submitLabel="Create Secure Account"
      loadingLabel="Preparing account..."
      bottomPrompt="Already have access?"
      bottomAction="Sign in instead"
      onBottomAction={() => navigate('/login')}
      state={{
        form,
        setForm,
        updateField,
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
