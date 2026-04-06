import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Phone, Lock, Eye, EyeOff, Shield, Check, Zap } from 'lucide-react'
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

export default function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Focus states
  const [focused, setFocused] = useState<Record<string, boolean>>({})

  function focus(field: string) {
    setFocused(p => ({ ...p, [field]: true }))
  }
  function blur(field: string) {
    setFocused(p => ({ ...p, [field]: false }))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (fullName.trim().split(/\s+/).length < 2) {
      errs.fullName = 'Please enter your full name (at least 2 words)'
    }
    if (!email.includes('@') || !email.includes('.')) {
      errs.email = 'Please enter a valid email address'
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number'
    }
    if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }
    if (confirmPassword !== password) {
      errs.confirmPassword = 'Passwords do not match'
    }
    if (!terms) {
      errs.terms = 'You must agree to the terms'
    }
    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    await new Promise(r => setTimeout(r, 500))

    localStorage.setItem('loanbot_user', JSON.stringify({
      name: fullName.trim(),
      email,
      phone,
      loggedIn: true,
    }))
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
        <p style={{ fontSize: '11px', color: '#4a5568' }}>© 2026 LoanBot AI — Matrix 3.0 Hackathon</p>
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
          <h2 className="font-bold text-white" style={{ fontSize: '28px' }}>Create your account</h2>
          <p style={{ color: '#8892a4', fontSize: '14px', marginTop: '8px' }}>
            Get your first loan approved in 10 minutes
          </p>

          {/* Full Name */}
          <div style={{ marginTop: '32px' }}>
            <FieldLabel>Full name</FieldLabel>
            <InputWrapper focused={!!focused.name}>
              <User size={18} color="#4a5568" className="shrink-0" />
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onFocus={() => focus('name')}
                onBlur={() => blur('name')}
                placeholder="Enter your full name"
                className="flex-1 bg-transparent border-none outline-none"
                style={{ color: '#fff', fontSize: '16px' }}
              />
            </InputWrapper>
            <FieldError msg={errors.fullName} />
          </div>

          {/* Email */}
          <div style={{ marginTop: '16px' }}>
            <FieldLabel>Email address</FieldLabel>
            <InputWrapper focused={!!focused.email}>
              <Mail size={18} color="#4a5568" className="shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => focus('email')}
                onBlur={() => blur('email')}
                placeholder="Enter your email"
                className="flex-1 bg-transparent border-none outline-none"
                style={{ color: '#fff', fontSize: '16px' }}
              />
            </InputWrapper>
            <FieldError msg={errors.email} />
          </div>

          {/* Phone */}
          <div style={{ marginTop: '16px' }}>
            <FieldLabel>Mobile number</FieldLabel>
            <InputWrapper focused={!!focused.phone}>
              <Phone size={18} color="#4a5568" className="shrink-0" />
              <span
                className="shrink-0 font-medium"
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  paddingRight: '12px',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onFocus={() => focus('phone')}
                onBlur={() => blur('phone')}
                placeholder="9876543210"
                className="flex-1 bg-transparent border-none outline-none"
                style={{ color: '#fff', fontSize: '16px' }}
              />
            </InputWrapper>
            <FieldError msg={errors.phone} />
          </div>

          {/* Password */}
          <div style={{ marginTop: '16px' }}>
            <FieldLabel>Password</FieldLabel>
            <InputWrapper focused={!!focused.pass}>
              <Lock size={18} color="#4a5568" className="shrink-0" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => focus('pass')}
                onBlur={() => blur('pass')}
                placeholder="Create a password"
                className="flex-1 bg-transparent border-none outline-none"
                style={{ color: '#fff', fontSize: '16px' }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="shrink-0">
                {showPass ? <EyeOff size={18} color="#4a5568" /> : <Eye size={18} color="#4a5568" />}
              </button>
            </InputWrapper>
            <FieldError msg={errors.password} />
          </div>

          {/* Confirm Password */}
          <div style={{ marginTop: '16px' }}>
            <FieldLabel>Confirm password</FieldLabel>
            <InputWrapper focused={!!focused.confirm}>
              <Shield size={18} color="#4a5568" className="shrink-0" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onFocus={() => focus('confirm')}
                onBlur={() => blur('confirm')}
                placeholder="Re-enter your password"
                className="flex-1 bg-transparent border-none outline-none"
                style={{ color: '#fff', fontSize: '16px' }}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="shrink-0">
                {showConfirm ? <EyeOff size={18} color="#4a5568" /> : <Eye size={18} color="#4a5568" />}
              </button>
            </InputWrapper>
            <FieldError msg={errors.confirmPassword} />
          </div>

          {/* Terms checkbox */}
          <div className="flex items-start gap-3" style={{ marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => setTerms(v => !v)}
              className="shrink-0 flex items-center justify-center transition-all"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                border: terms ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                background: terms ? '#b8ff4f' : 'transparent',
                marginTop: '1px',
                cursor: 'pointer',
              }}
            >
              {terms && <Check size={12} color="#0B1120" strokeWidth={3} />}
            </button>
            <p style={{ color: '#8892a4', fontSize: '13px', lineHeight: 1.5 }}>
              I agree to the{' '}
              <a href="#" style={{ color: '#b8ff4f' }}>Terms of Service</a>
              {' '}and{' '}
              <a href="#" style={{ color: '#b8ff4f' }}>Privacy Policy</a>
            </p>
          </div>
          <FieldError msg={errors.terms} />

          {/* Create Account button */}
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
            onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.05)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
          >
            {loading ? <Spinner /> : 'Create Account →'}
          </button>

          {/* Sign in link */}
          <p className="text-center" style={{ color: '#8892a4', fontSize: '13px', marginTop: '24px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#b8ff4f', fontWeight: 600 }}>Sign in</Link>
          </p>

          {/* Pre-approved preview */}
          <div
            style={{
              marginTop: '32px',
              background: 'rgba(184,255,79,0.05)',
              border: '1px solid rgba(184,255,79,0.15)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <p style={{ color: '#8892a4', fontSize: '11px' }}>💡 Pre-approved up to</p>
            <p className="font-bold" style={{ color: '#b8ff4f', fontSize: '22px', marginTop: '4px' }}>₹5,00,000</p>
            <p style={{ color: '#8892a4', fontSize: '11px', marginTop: '4px' }}>
              Based on your profile — check eligibility
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', color: '#8892a4', fontSize: '13px', marginBottom: '8px' }}>
      {children}
    </label>
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
      Creating account...
    </span>
  )
}
