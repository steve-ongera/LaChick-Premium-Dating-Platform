import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from './utils/api'

import Navbar      from './components/Navbar'
import Home        from './pages/Home'
import Login       from './pages/Login'
import Register    from './pages/Register'
import ProfileDetail from './pages/ProfileDetail'
import EditProfile from './pages/EditProfile'
import Packages    from './pages/Packages'
import Chat        from './pages/Chat'
import Feed        from './pages/Feed'
import Dashboard   from './pages/Dashboard'

// ─── Auth Context ─────────────────────────────────────────────
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="lc-loading"><span className="lc-spinner" /></div>
  return user ? children : <Navigate to="/login" replace />
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access')
    if (token) {
      getMe()
        .then(data => setUser(data))
        .catch(() => {
          localStorage.removeItem('access')
          localStorage.removeItem('refresh')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login  = (userData, tokens) => {
    localStorage.setItem('access',  tokens.access)
    localStorage.setItem('refresh', tokens.refresh)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      <BrowserRouter>
        <Navbar />
        <main className="lc-main">
          <Routes>
            <Route path="/"                  element={<Home />} />
            <Route path="/login"             element={<Login />} />
            <Route path="/register"          element={<Register />} />
            <Route path="/profiles/:slug"    element={<ProfileDetail />} />
            <Route path="/feed"              element={<Feed />} />

            {/* Protected */}
            <Route path="/profile/edit"  element={<PrivateRoute><EditProfile /></PrivateRoute>} />
            <Route path="/packages"      element={<PrivateRoute><Packages /></PrivateRoute>} />
            <Route path="/chat"          element={<PrivateRoute><Chat /></PrivateRoute>} />
            <Route path="/chat/:roomId"  element={<PrivateRoute><Chat /></PrivateRoute>} />
            <Route path="/dashboard"     element={<PrivateRoute><Dashboard /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}