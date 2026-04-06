import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CreditCard, FileText, Settings,
  LogOut, Menu, X, Clock, Download, TrendingUp,
  CheckCircle, IndianRupee, Calendar,
} from 'lucide-react'
import LoanBotLogo from '../components/LoanBotLogo'
import { apiUrl } from '../lib/api'

interface User {
  name: string
  email: string
  phone?: string
}

interface LoanData {
  loan_amount?: number
  emi?: number
  tenure?: number
  cibil_score?: number
  loan_status?: string
  pdf_filename?: string
  session_id?: string
  approved_at?: string
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')
}

function formatINR(n: number) {
  return n.toLocaleString('en-IN')
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getNextFifth() {
  const now = new Date()
  let target = new Date(now.getFullYear(), now.getMonth(), 5, 0, 0, 0, 0)
  if (now >= target) {
    target = new Date(now.getFullYear(), now.getMonth() + 1, 5, 0, 0, 0, 0)
  }
  return target
}

function getCountdown(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now())
  const days = Math.floor(diff / (86400 * 1000))
  const hours = Math.floor((diff % (86400 * 1000)) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  return { days, hours, mins }
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function addMonths(d: Date, n: number) {
  const result = new Date(d)
  result.setMonth(result.getMonth() + n)
  return result
}

const NAV_ITEMS = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { icon: <CreditCard size={18} />, label: 'My Loans' },
  { icon: <FileText size={18} />, label: 'Documents' },
  { icon: <Settings size={18} />, label: 'Settings' },
]

export default function Profile() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [countdown, setCountdown] = useState(() => getCountdown(getNextFifth()))
  const [settingsSaved, setSettingsSaved] = useState('')

  const user: User = JSON.parse(localStorage.getItem('loanbot_user') || '{"name":"User","email":""}')
  const [profileForm, setProfileForm] = useState<User>(() => ({
    name: user.name || 'User',
    email: user.email || '',
    phone: user.phone || '',
  }))
  const loanRaw: LoanData = JSON.parse(localStorage.getItem('loanbot_loan_data') || '{}')
  const pdfFilename = loanRaw.pdf_filename || ''

  // Defaults
  const loanAmount = loanRaw.loan_amount ?? 300000
  const emi = loanRaw.emi ?? 13913
  const tenure = loanRaw.tenure ?? 24
  const cibil = loanRaw.cibil_score ?? 718
  const approvedAt = loanRaw.approved_at ? new Date(loanRaw.approved_at) : new Date()
  const maturityDate = addMonths(approvedAt, tenure)
  const nextFifth = getNextFifth()

  // Countdown tick
  useEffect(() => {
    const id = setInterval(() => setCountdown(getCountdown(getNextFifth())), 60000)
    return () => clearInterval(id)
  }, [])

  function logout() {
    localStorage.removeItem('loanbot_user')
    localStorage.removeItem('loanbot_loan_data')
    localStorage.removeItem('loanbot_session_id')
    navigate('/login')
  }

  function handleDownload() {
    if (!pdfFilename) return
    window.open(apiUrl(`/download/${encodeURIComponent(pdfFilename)}`), '_blank')
  }

  function saveProfile() {
    const existing = JSON.parse(localStorage.getItem('loanbot_user') || '{}')
    const nextUser = {
      ...existing,
      name: profileForm.name.trim() || 'User',
      email: profileForm.email.trim(),
      phone: (profileForm.phone || '').trim(),
    }
    localStorage.setItem('loanbot_user', JSON.stringify(nextUser))
    setSettingsSaved('Profile updated successfully.')
  }

  function activeTabLabel() {
    return NAV_ITEMS[activeNav]?.label || 'Dashboard'
  }

  function tabSubtitle() {
    const label = activeTabLabel()
    if (label === 'Dashboard') return 'Overview of your loan health'
    if (label === 'My Loans') return 'Track your active loan and repayments'
    if (label === 'Documents') return 'Download and manage your loan documents'
    return 'Manage your profile and account settings'
  }

  const initials = getInitials(user.name).toUpperCase()

  const sidebar = (
    <div
      className="flex flex-col h-full"
      style={{
        width: '280px',
        background: '#141B2D',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        padding: '32px 24px',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <LoanBotLogo iconSize={32} wordmarkSize={18} onClick={() => navigate('/')} />

      <div style={{ marginTop: '32px' }}>
        {/* Avatar */}
        <div
          className="flex items-center justify-center mx-auto"
          style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6d5ce7, #b8ff4f)',
            fontSize: '24px', fontWeight: 700, color: '#fff',
          }}
        >
          {initials}
        </div>

        <p className="font-bold text-white text-center" style={{ fontSize: '18px', marginTop: '16px' }}>
          {user.name}
        </p>
        <p className="text-center" style={{ color: '#8892a4', fontSize: '13px', marginTop: '4px' }}>
          {user.email}
        </p>
        {user.phone && (
          <p className="text-center" style={{ color: '#8892a4', fontSize: '13px', marginTop: '4px' }}>
            +91 {user.phone}
          </p>
        )}

        <button
          className="w-full transition-colors"
          style={{
            marginTop: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            borderRadius: '10px',
            padding: '10px',
            color: '#8892a4',
            fontSize: '13px',
            cursor: 'pointer',
          }}
          onClick={() => {
            setActiveNav(3)
            setDrawerOpen(false)
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Edit Profile
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '24px 0' }} />

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item, i) => (
          <button
            key={item.label}
            onClick={() => { setActiveNav(i); setDrawerOpen(false) }}
            className="flex items-center gap-3 w-full text-left transition-all"
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: activeNav === i ? 'rgba(184,255,79,0.1)' : 'transparent',
              border: activeNav === i ? '1px solid rgba(184,255,79,0.2)' : '1px solid transparent',
              color: activeNav === i ? '#b8ff4f' : '#8892a4',
              fontSize: '14px',
              fontWeight: activeNav === i ? 500 : 400,
              cursor: 'pointer',
            }}
            onMouseEnter={e => { if (activeNav !== i) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if (activeNav !== i) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ color: activeNav === i ? '#b8ff4f' : '#4a5568' }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ marginTop: 'auto' }}>
        <p style={{ color: '#4a5568', fontSize: '11px' }}>Logged in as</p>
        <p style={{ color: '#8892a4', fontSize: '12px', marginTop: '4px' }}>{user.email}</p>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 transition-colors"
          style={{
            marginTop: '16px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444',
            borderRadius: '10px',
            padding: '10px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B1120' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full overflow-y-auto">
        {sidebar}
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className="fixed top-0 left-0 h-full z-50 lg:hidden overflow-y-auto transition-transform"
        style={{
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          width: '280px',
        }}
      >
        <div className="relative h-full">
          {sidebar}
          <button
            onClick={() => setDrawerOpen(false)}
            className="absolute top-4 right-4"
            style={{ color: '#8892a4', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto" style={{ background: '#0B1120' }}>
        {/* Mobile header */}
        <div
          className="flex items-center gap-4 px-4 py-4 lg:hidden"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#141B2D' }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            style={{ color: '#8892a4', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Menu size={22} />
          </button>
          <LoanBotLogo iconSize={28} wordmarkSize={16} onClick={() => navigate('/')} />
        </div>

        <div style={{ padding: 'clamp(20px, 4vw, 40px)' }}>
          {/* Greeting */}
          <div style={{ marginBottom: '32px' }}>
            <h1 className="font-bold text-white" style={{ fontSize: 'clamp(22px, 4vw, 28px)' }}>
              {getGreeting()}, {user.name.split(' ')[0]}! 👋
            </h1>
            <p style={{ color: '#8892a4', fontSize: '14px', marginTop: '4px' }}>
              {tabSubtitle()}
            </p>
          </div>

          {(activeNav === 0 || activeNav === 1) && (
            <>
              {/* Stat cards 2x2 grid */}
              <div
                className="grid"
                style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}
              >
                {/* Loan Amount */}
                <StatCard
                  iconBg="rgba(184,255,79,0.1)"
                  icon={<IndianRupee size={18} color="#b8ff4f" />}
                  label="SANCTIONED AMOUNT"
                  value={`₹${formatINR(loanAmount)}`}
                  valueColor="#b8ff4f"
                  sub="Personal Loan"
                />
                {/* Monthly EMI */}
                <StatCard
                  iconBg="rgba(109,92,231,0.1)"
                  icon={<Calendar size={18} color="#6d5ce7" />}
                  label="MONTHLY EMI"
                  value={`₹${formatINR(emi)}`}
                  valueColor="#fff"
                  sub="Due on 5th every month"
                />
                {/* CIBIL Score */}
                <StatCard
                  iconBg="rgba(34,197,94,0.1)"
                  icon={<TrendingUp size={18} color="#22c55e" />}
                  label="CIBIL SCORE"
                  value={String(cibil)}
                  valueColor="#22c55e"
                  sub="Good Standing ↑"
                  subColor="#22c55e"
                />
                {/* Loan Status */}
                <StatCard
                  iconBg="rgba(34,197,94,0.1)"
                  icon={<CheckCircle size={18} color="#22c55e" />}
                  label="LOAN STATUS"
                  value="APPROVED"
                  valueColor="#22c55e"
                  sub={<StatusBadge />}
                />
              </div>
            </>
          )}

          {(activeNav === 0 || activeNav === 1) && (
            <>
              {/* Active Loan Card */}
              <div
                style={{
                  background: '#141B2D',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  padding: '32px',
                  marginBottom: '32px',
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
                  <h2 className="font-bold text-white" style={{ fontSize: '18px' }}>Active Loan</h2>
                  <span
                    style={{
                      background: 'rgba(34,197,94,0.1)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      color: '#22c55e',
                      borderRadius: '50px',
                      padding: '4px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    APPROVED
                  </span>
                </div>

                <div
                  className="grid"
                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0' }}
                >
                  {[
                    ['Loan Amount', `₹${formatINR(loanAmount)}`],
                    ['Interest Rate', '10.5% p.a.'],
                    ['Tenure', `${tenure} Months`],
                    ['EMI Amount', `₹${formatINR(emi)}/mo`],
                    ['Disbursement', formatDate(approvedAt)],
                    ['Maturity Date', formatDate(maturityDate)],
                  ].map(([label, val]) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <span style={{ color: '#8892a4', fontSize: '12px' }}>{label}</span>
                      <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{val}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleDownload}
                  disabled={!pdfFilename}
                  className="w-full flex items-center justify-center gap-2 font-bold transition-all"
                  style={{
                    marginTop: '24px',
                    background: pdfFilename ? '#b8ff4f' : '#1a2235',
                    color: pdfFilename ? '#0B1120' : '#4a5568',
                    borderRadius: '12px',
                    padding: '16px',
                    fontSize: '15px',
                    border: 'none',
                    cursor: pdfFilename ? 'pointer' : 'not-allowed',
                  }}
                  onMouseEnter={e => { if (pdfFilename) e.currentTarget.style.filter = 'brightness(1.05)' }}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                >
                  <Download size={18} />
                  {pdfFilename ? '⬇ Download Sanction Letter PDF' : 'Sanction letter will appear here after approval'}
                </button>
              </div>
            </>
          )}

          {activeNav === 0 && (
            <>
              {/* Loan Journey */}
              <div
                style={{
                  background: '#141B2D',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  padding: '32px',
                  marginBottom: '32px',
                }}
              >
                <h2 className="font-bold text-white" style={{ fontSize: '18px', marginBottom: '32px' }}>
                  Loan Journey
                </h2>
                <LoanJourney approvedAt={approvedAt} />
              </div>
            </>
          )}

          {(activeNav === 0 || activeNav === 1) && (
            <>
              {/* Next EMI Countdown */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(109,92,231,0.15), rgba(184,255,79,0.05))',
                  border: '1px solid rgba(109,92,231,0.3)',
                  borderRadius: '20px',
                  padding: '32px',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <p style={{ color: '#8892a4', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Next EMI Due
                    </p>
                    <p className="font-bold text-white" style={{ fontSize: '24px', marginTop: '8px' }}>
                      {formatDate(nextFifth)}
                    </p>
                    <p className="font-bold" style={{ color: '#b8ff4f', fontSize: '18px', marginTop: '4px' }}>
                      ₹{formatINR(emi)}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    {[
                      { val: String(countdown.days).padStart(2, '0'), label: 'DAYS' },
                      { val: String(countdown.hours).padStart(2, '0'), label: 'HRS' },
                      { val: String(countdown.mins).padStart(2, '0'), label: 'MINS' },
                    ].map(({ val, label }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center"
                        style={{
                          background: 'rgba(11,17,32,0.6)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          minWidth: '64px',
                        }}
                      >
                        <span className="font-bold text-white" style={{ fontSize: '28px', lineHeight: 1 }}>{val}</span>
                        <span style={{ color: '#8892a4', fontSize: '9px', marginTop: '6px', letterSpacing: '0.08em' }}>
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeNav === 2 && (
            <div
              style={{
                background: '#141B2D',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '32px',
              }}
            >
              <h2 className="font-bold text-white" style={{ fontSize: '18px', marginBottom: '20px' }}>
                Documents
              </h2>
              <div className="grid" style={{ gap: '12px' }}>
                <DocumentRow
                  title="Loan Sanction Letter"
                  subtitle={pdfFilename || 'Not generated yet'}
                  canDownload={Boolean(pdfFilename)}
                  onDownload={handleDownload}
                />
                <DocumentRow
                  title="KYC Summary"
                  subtitle="Available after full video KYC completion"
                  canDownload={false}
                  onDownload={() => {}}
                />
                <DocumentRow
                  title="Repayment Schedule"
                  subtitle="Will be available after first EMI cycle"
                  canDownload={false}
                  onDownload={() => {}}
                />
              </div>
            </div>
          )}

          {activeNav === 3 && (
            <div
              style={{
                background: '#141B2D',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '32px',
              }}
            >
              <h2 className="font-bold text-white" style={{ fontSize: '18px', marginBottom: '20px' }}>
                Profile Settings
              </h2>

              <div className="grid" style={{ gap: '14px', maxWidth: '560px' }}>
                <SettingsField
                  label="Full Name"
                  value={profileForm.name}
                  onChange={(value) => {
                    setProfileForm((prev) => ({ ...prev, name: value }))
                    setSettingsSaved('')
                  }}
                />
                <SettingsField
                  label="Email"
                  value={profileForm.email}
                  onChange={(value) => {
                    setProfileForm((prev) => ({ ...prev, email: value }))
                    setSettingsSaved('')
                  }}
                />
                <SettingsField
                  label="Phone"
                  value={profileForm.phone || ''}
                  onChange={(value) => {
                    setProfileForm((prev) => ({ ...prev, phone: value }))
                    setSettingsSaved('')
                  }}
                />

                <button
                  onClick={saveProfile}
                  style={{
                    marginTop: '8px',
                    background: '#b8ff4f',
                    color: '#0B1120',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    width: 'fit-content',
                  }}
                >
                  Save Changes
                </button>

                {settingsSaved && (
                  <p style={{ color: '#22c55e', fontSize: '13px' }}>{settingsSaved}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Subcomponents ── */

function StatCard({
  iconBg, icon, label, value, valueColor, sub, subColor,
}: {
  iconBg: string
  icon: React.ReactNode
  label: string
  value: string
  valueColor: string
  sub: React.ReactNode
  subColor?: string
}) {
  return (
    <div
      style={{
        background: '#141B2D',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '24px',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{ width: '40px', height: '40px', borderRadius: '50%', background: iconBg }}
      >
        {icon}
      </div>
      <p style={{ color: '#8892a4', fontSize: '10px', letterSpacing: '0.08em', marginTop: '12px' }}>
        {label}
      </p>
      <p className="font-bold" style={{ color: valueColor, fontSize: 'clamp(20px, 3vw, 28px)', marginTop: '8px', lineHeight: 1.2 }}>
        {value}
      </p>
      <div style={{ color: subColor ?? '#8892a4', fontSize: '12px', marginTop: '6px' }}>
        {sub}
      </div>
    </div>
  )
}

function StatusBadge() {
  return (
    <span
      style={{
        background: 'rgba(34,197,94,0.1)',
        border: '1px solid rgba(34,197,94,0.3)',
        color: '#22c55e',
        borderRadius: '50px',
        padding: '2px 10px',
        fontSize: '11px',
        fontWeight: 600,
        display: 'inline-block',
      }}
    >
      Active
    </span>
  )
}

function DocumentRow({
  title,
  subtitle,
  canDownload,
  onDownload,
}: {
  title: string
  subtitle: string
  canDownload: boolean
  onDownload: () => void
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '14px 16px',
        background: 'rgba(11,17,32,0.45)',
      }}
    >
      <div>
        <p className="font-medium text-white" style={{ fontSize: '14px' }}>{title}</p>
        <p style={{ color: '#8892a4', fontSize: '12px', marginTop: '3px' }}>{subtitle}</p>
      </div>
      <button
        onClick={onDownload}
        disabled={!canDownload}
        style={{
          borderRadius: '8px',
          border: 'none',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 600,
          background: canDownload ? '#b8ff4f' : '#1a2235',
          color: canDownload ? '#0B1120' : '#4a5568',
          cursor: canDownload ? 'pointer' : 'not-allowed',
        }}
      >
        Download
      </button>
    </div>
  )
}

function SettingsField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col" style={{ gap: '6px' }}>
      <span style={{ color: '#8892a4', fontSize: '12px' }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: '#0B1120',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px',
          padding: '10px 12px',
          fontSize: '14px',
          outline: 'none',
        }}
      />
    </label>
  )
}

const STEPS = [
  { label: 'Applied', sub: (d: Date) => formatDateShort(d) },
  { label: 'KYC Verified', sub: () => 'Identity confirmed' },
  { label: 'Credit Approved', sub: () => 'CIBIL 718' },
  { label: 'Sanctioned', sub: () => 'Letter generated' },
  { label: 'Disbursement', sub: () => 'Processing...' },
]

function formatDateShort(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function LoanJourney({ approvedAt }: { approvedAt: Date }) {
  return (
    <>
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-start">
        {STEPS.map((step, i) => {
          const completed = i < 4
          const isLast = i === STEPS.length - 1
          return (
            <div key={step.label} className="flex items-start flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Circle */}
                <div
                  style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: completed ? '#22c55e' : 'rgba(255,255,255,0.05)',
                    border: completed ? 'none' : '2px dashed rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: !completed ? 'glow-pulse 2s ease-in-out infinite' : 'none',
                    flexShrink: 0,
                  }}
                >
                  {completed
                    ? <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>✓</span>
                    : <Clock size={18} color="#8892a4" />}
                </div>
                <p className="font-medium text-center" style={{ color: completed ? '#fff' : '#8892a4', fontSize: '12px', marginTop: '8px' }}>
                  {step.label}
                </p>
                <p className="text-center" style={{ color: '#4a5568', fontSize: '10px', marginTop: '2px' }}>
                  {step.sub(approvedAt)}
                </p>
              </div>
              {/* Connector */}
              {!isLast && (
                <div
                  style={{
                    height: '2px',
                    flex: 1,
                    background: completed && i < 3 ? '#22c55e' : 'rgba(255,255,255,0.1)',
                    borderStyle: completed && i < 3 ? 'solid' : 'dashed',
                    marginTop: '22px',
                    alignSelf: 'flex-start',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="flex flex-col gap-0 md:hidden">
        {STEPS.map((step, i) => {
          const completed = i < 4
          const isLast = i === STEPS.length - 1
          return (
            <div key={step.label} className="flex items-start gap-4">
              <div className="flex flex-col items-center" style={{ flexShrink: 0 }}>
                <div
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: completed ? '#22c55e' : 'rgba(255,255,255,0.05)',
                    border: completed ? 'none' : '2px dashed rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: !completed ? 'glow-pulse 2s ease-in-out infinite' : 'none',
                  }}
                >
                  {completed
                    ? <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>✓</span>
                    : <Clock size={14} color="#8892a4" />}
                </div>
                {!isLast && (
                  <div
                    style={{
                      width: '2px',
                      height: '32px',
                      background: completed && i < 3 ? '#22c55e' : 'rgba(255,255,255,0.1)',
                    }}
                  />
                )}
              </div>
              <div style={{ paddingTop: '6px', paddingBottom: isLast ? 0 : '24px' }}>
                <p className="font-medium" style={{ color: completed ? '#fff' : '#8892a4', fontSize: '13px' }}>
                  {step.label}
                </p>
                <p style={{ color: '#4a5568', fontSize: '11px', marginTop: '2px' }}>
                  {step.sub(approvedAt)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
