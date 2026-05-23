import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../App'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const location         = useLocation()
  const [open, setOpen]  = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <Link to="/" style={styles.logo}>
          <i className="bi bi-heart-fill" style={{ color: '#C4516A' }} />
          {' '}LaChick
        </Link>

        {/* Desktop links */}
        <div style={styles.links}>
          <Link to="/" style={isActive('/') ? styles.linkActive : styles.link}>
            <i className="bi bi-search" /> Browse
          </Link>
          <Link to="/feed" style={isActive('/feed') ? styles.linkActive : styles.link}>
            <i className="bi bi-grid" /> Feed
          </Link>

          {user ? (
            <>
              <Link to="/chat" style={isActive('/chat') ? styles.linkActive : styles.link}>
                <i className="bi bi-chat-dots" /> Chat
              </Link>
              <Link to="/dashboard" style={isActive('/dashboard') ? styles.linkActive : styles.link}>
                <i className="bi bi-bar-chart" /> Dashboard
              </Link>
              <Link to="/packages" className="lc-btn lc-btn-outline" style={{ fontSize: '.82rem', padding: '.45rem 1rem' }}>
                <i className="bi bi-gem" /> Upgrade
              </Link>
              <div style={styles.avatarMenu} onClick={() => setOpen(!open)}>
                <div className="lc-avatar" style={{ width: 34, height: 34, fontSize: '.9rem', cursor: 'pointer', background: '#C4516A', color: 'white' }}>
                  {user.username?.[0]?.toUpperCase() || '?'}
                </div>
                {open && (
                  <div style={styles.dropdown}>
                    <Link to="/profile/edit" style={styles.dropItem} onClick={() => setOpen(false)}>
                      <i className="bi bi-person" /> My Profile
                    </Link>
                    <Link to="/dashboard" style={styles.dropItem} onClick={() => setOpen(false)}>
                      <i className="bi bi-speedometer2" /> Dashboard
                    </Link>
                    <hr style={{ margin: '.4rem 0', border: 'none', borderTop: '1px solid #E5DDD8' }} />
                    <button onClick={handleLogout} style={{ ...styles.dropItem, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#C4516A' }}>
                      <i className="bi bi-box-arrow-right" /> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.link}>Log in</Link>
              <Link to="/register" className="lc-btn lc-btn-primary" style={{ fontSize: '.85rem', padding: '.5rem 1.2rem' }}>
                Join Free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    position  : 'fixed',
    top       : 0,
    left      : 0,
    right     : 0,
    zIndex    : 1000,
    height    : 72,
    background: 'rgba(250,246,241,0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom  : '1.5px solid #E5DDD8',
    display   : 'flex',
    alignItems: 'center',
  },
  inner: {
    maxWidth : 1200,
    margin   : '0 auto',
    padding  : '0 1.5rem',
    width    : '100%',
    display  : 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize  : '1.5rem',
    fontWeight: 600,
    color     : '#1C1A1E',
    textDecoration: 'none',
    display   : 'flex',
    alignItems: 'center',
    gap       : '.4rem',
  },
  links: {
    display   : 'flex',
    alignItems: 'center',
    gap       : '1.2rem',
  },
  link: {
    fontSize      : '.88rem',
    color         : '#3B3540',
    textDecoration: 'none',
    display       : 'flex',
    alignItems    : 'center',
    gap           : '.3rem',
    transition    : 'color .15s',
  },
  linkActive: {
    fontSize      : '.88rem',
    color         : '#C4516A',
    textDecoration: 'none',
    display       : 'flex',
    alignItems    : 'center',
    gap           : '.3rem',
    fontWeight    : 500,
  },
  avatarMenu: { position: 'relative' },
  dropdown: {
    position     : 'absolute',
    top          : 42,
    right        : 0,
    background   : 'white',
    border       : '1.5px solid #E5DDD8',
    borderRadius : 12,
    padding      : '.5rem',
    minWidth     : 180,
    boxShadow    : '0 8px 32px rgba(28,26,30,.12)',
    zIndex       : 999,
  },
  dropItem: {
    display       : 'flex',
    alignItems    : 'center',
    gap           : '.5rem',
    padding       : '.5rem .75rem',
    borderRadius  : 8,
    fontSize      : '.85rem',
    color         : '#3B3540',
    textDecoration: 'none',
    transition    : 'background .15s',
  },
}