// pages/Login.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login as apiLogin, getMe } from '../utils/api'
import { useAuth } from '../App'

export function Login() {
  const { login }          = useAuth()
  const navigate           = useNavigate()
  const [form, setForm]    = useState({ email: '', password: '' })
  const [error, setError]  = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const tokens = await apiLogin(form.email, form.password)
      // tokens = { access, refresh }
      localStorage.setItem('access',  tokens.access)
      localStorage.setItem('refresh', tokens.refresh)
      const me = await getMe()
      login(me, tokens)
      navigate('/')
    } catch (err) {
      setError(err?.detail || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={authStyles.page}>
      <div style={authStyles.card}>
        <div style={authStyles.logo}>
          <i className="bi bi-heart-fill" style={{ color: '#C4516A' }} /> LaChick
        </div>
        <h2 style={authStyles.title}>Welcome back</h2>
        <p style={authStyles.sub}>Log in to your account</p>

        {error && <div className="lc-alert lc-alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="lc-form-group">
            <label className="lc-label">Email</label>
            <input
              className="lc-input"
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="hello@email.com"
            />
          </div>
          <div className="lc-form-group">
            <label className="lc-label">Password</label>
            <input
              className="lc-input"
              type="password"
              required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="lc-btn lc-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '.8rem' }} disabled={loading}>
            {loading ? <span className="lc-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : 'Log In'}
          </button>
        </form>

        <p style={authStyles.footer}>
          Don't have an account? <Link to="/register">Join free</Link>
        </p>
      </div>
    </div>
  )
}

// pages/Register.jsx
export function Register() {
  const navigate           = useNavigate()
  const [form, setForm]    = useState({ email: '', username: '', gender: '', phone: '', password: '', password2: '' })
  const [error, setError]  = useState('')
  const [loading, setLoading] = useState(false)
  const { login }          = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.password2) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const { register, login: apiLogin, getMe } = await import('../utils/api')
      await register(form)
      const tokens = await apiLogin(form.email, form.password)
      localStorage.setItem('access',  tokens.access)
      localStorage.setItem('refresh', tokens.refresh)
      const me = await getMe()
      login(me, tokens)
      navigate('/profile/edit')
    } catch (err) {
      const msg = Object.values(err || {}).flat().join(' ') || 'Registration failed.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div style={authStyles.page}>
      <div style={{ ...authStyles.card, maxWidth: 460 }}>
        <div style={authStyles.logo}>
          <i className="bi bi-heart-fill" style={{ color: '#C4516A' }} /> LaChick
        </div>
        <h2 style={authStyles.title}>Create account</h2>
        <p style={authStyles.sub}>Free to join, real connections await</p>

        {error && <div className="lc-alert lc-alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <div className="lc-form-group">
              <label className="lc-label">Username</label>
              <input className="lc-input" required value={form.username} onChange={set('username')} placeholder="johndoe" />
            </div>
            <div className="lc-form-group">
              <label className="lc-label">I am a</label>
              <select className="lc-select" required value={form.gender} onChange={set('gender')}>
                <option value="">Select…</option>
                <option value="male">Man</option>
                <option value="female">Woman</option>
              </select>
            </div>
          </div>

          <div className="lc-form-group">
            <label className="lc-label">Email</label>
            <input className="lc-input" type="email" required value={form.email} onChange={set('email')} placeholder="hello@email.com" />
          </div>
          <div className="lc-form-group">
            <label className="lc-label">Phone (for M-Pesa)</label>
            <input className="lc-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="0712 345 678" />
          </div>
          <div className="lc-form-group">
            <label className="lc-label">Password</label>
            <input className="lc-input" type="password" required minLength={8} value={form.password} onChange={set('password')} placeholder="Min 8 characters" />
          </div>
          <div className="lc-form-group">
            <label className="lc-label">Confirm Password</label>
            <input className="lc-input" type="password" required value={form.password2} onChange={set('password2')} placeholder="Repeat password" />
          </div>

          <button type="submit" className="lc-btn lc-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '.8rem' }} disabled={loading}>
            {loading ? <span className="lc-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <><i className="bi bi-person-plus" /> Create Account</>}
          </button>
        </form>

        <p style={authStyles.footer}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}

const authStyles = {
  page : { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', background: 'var(--lc-ivory)' },
  card : { background: 'white', borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(28,26,30,0.08)' },
  logo : { fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '.4rem', color: '#1C1A1E' },
  title: { marginBottom: '.3rem' },
  sub  : { color: '#887F8A', fontSize: '.88rem', marginBottom: '1.5rem' },
  footer: { textAlign: 'center', marginTop: '1.5rem', fontSize: '.85rem', color: '#887F8A' },
}

export default Login