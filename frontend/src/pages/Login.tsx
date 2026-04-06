import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Check, Shield, Zap } from 'lucide-react'
import LoanBotLogo from '../components/LoanBotLogo'

const FEATURES = [
  {
    iconBg: 'rgba(184,255,79,0.1)',
    icon: <Check size={18} color="#b8ff4f" />,
    title: 'Zero Human Intervention',
    sub: 'AI handles the entire process',
  },
  {
    iconBg: 'rgba(109,92,231,0.1)',
    icon: <Shield size={18} color="#6d5ce7" />,
    title: 'KYC in 2 Minutes',
    sub: 'Aadhaar + PAN verified instantly',
  },
  {
    iconBg: 'rgba(34,197,94,0.1)',
    icon: <Zap size={18} color="#22c55e" />,
    title: 'Instant Sanction Letter',
    sub: 'Official PDF in under 10 minutes',
  },
]

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const errs: Record<string, string> = {}
    if (!email.includes('@') || !email.includes('.')) {
      errs.email = 'Please enter a valid email address'
    }
    if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }
    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    await new Promise(r => setTimeout(r, 500))

    const rawName = email.split('@')[0]
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1)

    localStorage.setItem('loanbot_user', JSON.stringify({ name, email, loggedIn: true }))
    navigate('/chat')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0B1120' }}>
      {/* ── LEFT COLUMN ── */}
      <div
        className="hidden lg:flex flex-col w-1/2 relative"
        style={{ background: 'linear-gradient(180deg, #0d1424 0%, #0B1120 100%)', padding: '60px' }}
      >
        <LoanBotLogo iconSize={40} wordmarkSize={22} onClick={() => navigate('/')} />

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="font-bold text-white" style={{ fontSize: '48px', lineHeight: 1.15 }}>
            India's Fastest
          </h1>
          <h1 className="font-bold" style={{ fontSize: '48px', color: '#b8ff4f', lineHeight: 1.15 }}>
            Loan Approval
          </h1>
          <p className="mt-4" style={{ color: '#8892a4', fontSize: '18px', maxWidth: '380px', lineHeight: 1.6 }}>
            From first message to sanction letter in under 10 minutes. No forms. No humans.
          </p>

          <div className="flex flex-col gap-3" style={{ marginTop: '48px' }}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3"
                style={{
                  background: '#141B2D',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                }}
              >
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{ width: '40px', height: '40px', borderRadius: '50%', background: f.iconBg }}
                >
                  {f.icon}
                </div>
                <div>
                  <p className="font-bold text-white" style={{ fontSize: '14px' }}>{f.title}</p>
                  <p style={{ fontSize: '12px', color: '#8892a4', marginTop: '2px' }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: '11px', color: '#4a5568' }}>
          © 2026 LoanBot AI — Matrix 3.0 Hackathon
        </p>
      </div>

      {/* ── RIGHT COLUMN ── */}
      <div
        className="flex flex-1 items-center justify-center"
        style={{ background: '#0B1120', padding: '40px 24px' }}
      >
        <div
          className="w-full"
          style={{
            maxWidth: '420px',
            background: '#141B2D',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: 'clamp(32px, 5vw, 48px)',
          }}
        >
          <h2 className="font-bold text-white" style={{ fontSize: '28px' }}>Welcome back</h2>
          <p style={{ color: '#8892a4', fontSize: '14px', marginTop: '8px' }}>
            Sign in to continue your loan journey
          </p>

          {/* Email */}
          <div style={{ marginTop: '32px' }}>
            <label style={{ display: 'block', color: '#8892a4', fontSize: '13px', marginBottom: '8px' }}>
              Email address
            </label>
            <InputWrapper focused={emailFocused}>
              <Mail size={18} color="#4a5568" className="shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="Enter your email"
                className="flex-1 bg-transparent border-none outline-none"
                style={{ color: '#fff', fontSize: '16px' }}
              />
            </InputWrapper>
            <FieldError msg={errors.email} />
          </div>

          {/* Password */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', color: '#8892a4', fontSize: '13px', marginBottom: '8px' }}>
              Password
            </label>
            <InputWrapper focused={passFocused}>
              <Lock size={18} color="#4a5568" className="shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                placeholder="Enter your password"
                className="flex-1 bg-transparent border-none outline-none"
                style={{ color: '#fff', fontSize: '16px' }}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="shrink-0">
                {showPassword
                  ? <EyeOff size={18} color="#4a5568" />
                  : <Eye size={18} color="#4a5568" />}
              </button>
            </InputWrapper>
            <FieldError msg={errors.password} />
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: 'right', marginTop: '8px' }}>
            <a href="#" style={{ color: '#6d5ce7', fontSize: '12px' }}>Forgot password?</a>
          </div>

          {/* Sign in button */}
          <button
            onClick={() => handleSubmit()}
            disabled={loading}
            className="w-full font-bold transition-all"
            style={{
              marginTop: '24px',
              background: '#b8ff4f',
              color: '#0B1120',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '15px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              height: '52px',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.05) scale(1.01)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
          >
            {loading ? <Spinner /> : 'Sign In →'}
          </button>

          {/* Sign up link */}
          <p className="text-center" style={{ color: '#8892a4', fontSize: '13px', marginTop: '24px' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#b8ff4f', fontWeight: 600 }}>Create one</Link>
          </p>

          {/* Security note */}
          <p className="text-center" style={{ color: '#4a5568', fontSize: '11px', marginTop: '32px' }}>
            🔒 256-bit AES encrypted • RBI compliant
          </p>
        </div>
      </div>
    </div>
  )
}

function InputWrapper({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${focused ? '#6d5ce7' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '12px',
        padding: '14px 16px',
        boxShadow: focused ? '0 0 0 3px rgba(109,92,231,0.15)' : 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {children}
    </div>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="flex items-center gap-1.5" style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
      ⚠ {msg}
    </p>
  )
}

function Spinner() {
  return (
    <span className="flex items-center justify-center gap-2">
      <span
        className="inline-block rounded-full"
        style={{
          width: '16px', height: '16px',
          border: '2px solid transparent',
          borderTopColor: '#0B1120',
          borderRightColor: '#0B1120',
          animation: 'spin-gauge 0.6s linear infinite',
        }}
      />
      Signing in...
    </span>
  )
}
