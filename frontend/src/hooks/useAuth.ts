import { useState } from 'react'

interface User {
  name: string
  email: string
  phone?: string
  loggedIn: boolean
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('loanbot_user')
    if (!stored) return null

    try {
      return JSON.parse(stored) as User
    } catch {
      localStorage.removeItem('loanbot_user')
      return null
    }
  })
  const loading = false

  const logout = () => {
    localStorage.removeItem('loanbot_user')
    localStorage.removeItem('loanbot_loan_data')
    localStorage.removeItem('loanbot_session_id')
    setUser(null)
    window.location.href = '/login'
  }

  const isLoggedIn = !!user?.loggedIn

  return { user, loading, logout, isLoggedIn }
}
