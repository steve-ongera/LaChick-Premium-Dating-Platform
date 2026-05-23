/**
 * components/NotificationBell.jsx
 * Shows unread notification count and dropdown list.
 * Drop into Navbar or wherever needed.
 */

import { useState, useEffect, useRef } from 'react'
import { getNotifications, markNotificationsRead } from '../utils/api'
import { useAuth } from '../App'

export default function NotificationBell() {
  const { user }               = useAuth()
  const [notifs, setNotifs]    = useState([])
  const [open, setOpen]        = useState(false)
  const ref                    = useRef()

  useEffect(() => {
    if (!user) return
    const load = () =>
      getNotifications()
        .then(d => setNotifs(d.results || d))
        .catch(() => {})
    load()
    // Poll every 30s
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [user])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = notifs.filter(n => !n.is_read).length

  const handleOpen = async () => {
    setOpen(o => !o)
    if (!open && unread > 0) {
      await markNotificationsRead().catch(() => {})
      setNotifs(ns => ns.map(n => ({ ...n, is_read: true })))
    }
  }

  const ICONS = {
    like        : 'bi-heart-fill',
    super_like  : 'bi-star-fill',
    message     : 'bi-chat-dots-fill',
    payment_ok  : 'bi-check-circle-fill',
    payment_fail: 'bi-x-circle-fill',
    boost_expire: 'bi-lightning-fill',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{ background:'none', border:'none', cursor:'pointer', position:'relative', padding:'.3rem', fontSize:'1.2rem', color:'#3B3540' }}
      >
        <i className="bi bi-bell" />
        {unread > 0 && (
          <span style={{
            position   : 'absolute',
            top        : 0,
            right      : 0,
            background : '#C4516A',
            color      : 'white',
            borderRadius: '50%',
            width      : 16,
            height     : 16,
            fontSize   : '.6rem',
            fontWeight : 700,
            display    : 'flex',
            alignItems : 'center',
            justifyContent: 'center',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position  : 'absolute',
          top       : 40,
          right     : 0,
          background: 'white',
          border    : '1.5px solid #E5DDD8',
          borderRadius: 14,
          width     : 300,
          maxHeight : 360,
          overflowY : 'auto',
          boxShadow : '0 8px 32px rgba(28,26,30,.14)',
          zIndex    : 999,
        }}>
          <div style={{ padding:'.75rem 1rem', borderBottom:'1px solid #E5DDD8', fontWeight:500, fontSize:'.85rem', display:'flex', justifyContent:'space-between' }}>
            Notifications
            <span style={{ fontSize:'.75rem', color:'#887F8A' }}>{notifs.length} total</span>
          </div>

          {notifs.length === 0 && (
            <div style={{ padding:'2rem', textAlign:'center', color:'#887F8A', fontSize:'.85rem' }}>
              No notifications yet.
            </div>
          )}

          {notifs.slice(0, 20).map(n => (
            <div key={n.id} style={{
              display   : 'flex',
              gap       : '.65rem',
              padding   : '.75rem 1rem',
              borderBottom: '1px solid #F5F2F0',
              background: n.is_read ? 'white' : '#FFF8F9',
              fontSize  : '.82rem',
            }}>
              <i
                className={`bi ${ICONS[n.notif_type] || 'bi-bell'}`}
                style={{ color: '#C4516A', fontSize: '1rem', marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <div>{n.message}</div>
                <div style={{ color:'#887F8A', fontSize:'.72rem', marginTop:'.2rem' }}>
                  {new Date(n.created_at).toLocaleString('en-KE', { dateStyle:'short', timeStyle:'short' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}