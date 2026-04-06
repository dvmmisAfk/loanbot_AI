import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import ChatPage from './components/ChatPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = JSON.parse(localStorage.getItem('loanbot_user') || '{}')
  if (!user?.loggedIn) return <Navigate to="/login" replace />
  return <>{children}</>
}

function LandingWrapper() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('loanbot_user') || '{}')
  return <LandingPage onApply={() => navigate(user?.loggedIn ? '/chat' : '/login')} />
}

function ChatWrapper() {
  const navigate = useNavigate()
  return <ChatPage onBack={() => navigate('/')} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingWrapper />} />
        <Route path="/chat" element={<ChatWrapper />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
