// ═══════════════════════════════════════════
// pages/ProfileDetail.jsx
// ═══════════════════════════════════════════
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getProfile, likeProfile, startChat } from '../utils/api'
import { useAuth } from '../App'
import { PackageBadge } from '../components/index'

export function ProfileDetail() {
  const { slug }        = useParams()
  const { user }        = useAuth()
  const navigate        = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked]     = useState(false)
  const [chatting, setChatting] = useState(false)

  useEffect(() => {
    getProfile(slug)
      .then(setProfile)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [slug])

  const handleLike = async () => {
    if (!user) { navigate('/login'); return }
    try {
      const res = await likeProfile(slug)
      setLiked(res.liked)
    } catch (_) {}
  }

  const handleChat = async () => {
    if (!user) { navigate('/login'); return }
    setChatting(true)
    try {
      const room = await startChat(profile.user.id)
      navigate(`/chat/${room.id}`)
    } catch (err) {
      alert(err?.error || 'Could not start chat.')
    } finally {
      setChatting(false)
    }
  }

  if (loading) return <div className="lc-loading"><span className="lc-spinner" /></div>
  if (!profile) return null

  return (
    <div className="lc-section">
      <div className="lc-container" style={{ maxWidth: 800 }}>
        <div className="lc-card">
          {/* Cover / Avatar */}
          <div style={{ background: 'linear-gradient(135deg,#1C1A1E,#3B1F28)', height: 180 }} />
          <div style={{ padding: '0 2rem 2rem', marginTop: -60 }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name}
                  style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 4px 16px rgba(0,0,0,.15)', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 110, height: 110, borderRadius: '50%', background: '#C4516A', border: '4px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'white', flexShrink: 0 }}>
                  {profile.display_name?.[0]}
                </div>
              )}
              <div style={{ flex: 1, paddingBottom: '.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                  <h2 style={{ marginBottom: 0 }}>{profile.display_name}</h2>
                  <PackageBadge tier={profile.package_tier} />
                </div>
                <p style={{ color: '#887F8A', fontSize: '.88rem', marginTop: '.25rem' }}>
                  {[profile.age && `${profile.age} yrs`, profile.city, profile.occupation].filter(Boolean).join(' · ')}
                </p>
              </div>

              {/* Actions (only women can interact) */}
              {user && user.gender === 'female' && (
                <div style={{ display: 'flex', gap: '.75rem' }}>
                  <button className={`lc-btn ${liked ? 'lc-btn-primary' : 'lc-btn-outline'}`} onClick={handleLike}>
                    <i className={`bi bi-heart${liked ? '-fill' : ''}`} /> {liked ? 'Liked' : 'Like'}
                  </button>
                  <button className="lc-btn lc-btn-primary" onClick={handleChat} disabled={chatting}>
                    <i className="bi bi-chat-dots" /> Message
                  </button>
                </div>
              )}
            </div>

            <hr className="lc-divider" />

            {/* Bio */}
            {profile.bio && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '.5rem', fontSize: '1.1rem' }}>About</h3>
                <p style={{ color: '#3B3540', lineHeight: 1.7 }}>{profile.bio}</p>
              </div>
            )}

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {profile.education && <Detail icon="bi-mortarboard" label="Education" value={profile.education} />}
              {profile.height_cm && <Detail icon="bi-arrows-vertical" label="Height" value={`${profile.height_cm} cm`} />}
              {profile.country   && <Detail icon="bi-geo-alt" label="Location" value={`${profile.city || ''}, ${profile.country}`} />}
              {profile.looking_for && <Detail icon="bi-search-heart" label="Looking for" value={profile.looking_for} />}
            </div>

            {/* Interests */}
            {profile.interests?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '.5rem', fontSize: '1.1rem' }}>Interests</h3>
                {profile.interests.map(i => <span key={i} className="lc-tag">{i}</span>)}
              </div>
            )}

            {/* Gallery */}
            {profile.photos?.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '.75rem', fontSize: '1.1rem' }}>Photos</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '.75rem' }}>
                  {profile.photos.map(p => (
                    <img key={p.id} src={p.image_url} alt={p.caption || 'photo'}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12 }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', color: '#887F8A', fontSize: '.82rem' }}>
              <span><i className="bi bi-eye" /> {profile.profile_views} views</span>
              <span><i className="bi bi-heart" /> {profile.likes_count} likes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Detail({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem' }}>
      <i className={`bi ${icon}`} style={{ color: '#C4516A', marginTop: 2 }} />
      <div>
        <div style={{ fontSize: '.72rem', color: '#887F8A', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
        <div style={{ fontSize: '.88rem' }}>{value}</div>
      </div>
    </div>
  )
}

export default ProfileDetail


// ═══════════════════════════════════════════
// pages/EditProfile.jsx
// ═══════════════════════════════════════════
import { useEffect, useRef } from 'react'
import { updateProfile, uploadPhoto } from '../utils/api'

export function EditProfile() {
  const { user }           = useAuth()
  const [form, setForm]    = useState({ display_name:'', bio:'', age:'', city:'', country:'Kenya', occupation:'', education:'', height_cm:'', looking_for:'', interests:'' })
  const [saving, setSaving]    = useState(false)
  const [success, setSuccess]  = useState(false)
  const [error, setError]      = useState('')
  const fileRef                = useRef()

  useEffect(() => {
    if (user?.profile) {
      const p = user.profile
      setForm({
        display_name: p.display_name || '',
        bio         : p.bio || '',
        age         : p.age || '',
        city        : p.city || '',
        country     : p.country || 'Kenya',
        occupation  : p.occupation || '',
        education   : p.education || '',
        height_cm   : p.height_cm || '',
        looking_for : p.looking_for || '',
        interests   : (p.interests || []).join(', '),
      })
    }
  }, [user])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'interests') {
          const arr = v.split(',').map(s => s.trim()).filter(Boolean)
          fd.append('interests', JSON.stringify(arr))
        } else if (v !== '') {
          fd.append(k, v)
        }
      })
      await updateProfile(fd)
      setSuccess(true)
    } catch (err) {
      setError(Object.values(err || {}).flat().join(' ') || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    try {
      await uploadPhoto(fd)
      alert('Photo uploaded!')
    } catch (_) { alert('Upload failed.') }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="lc-section">
      <div className="lc-container" style={{ maxWidth: 680 }}>
        <h2 style={{ marginBottom: '2rem' }}>Edit Profile</h2>

        {success && <div className="lc-alert lc-alert-success"><i className="bi bi-check-circle" /> Profile saved!</div>}
        {error   && <div className="lc-alert lc-alert-error">{error}</div>}

        <div className="lc-card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="lc-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="lc-label">Display Name</label>
                <input className="lc-input" value={form.display_name} onChange={set('display_name')} required />
              </div>
              <div className="lc-form-group">
                <label className="lc-label">Age</label>
                <input className="lc-input" type="number" min={18} max={80} value={form.age} onChange={set('age')} />
              </div>
              <div className="lc-form-group">
                <label className="lc-label">Height (cm)</label>
                <input className="lc-input" type="number" value={form.height_cm} onChange={set('height_cm')} />
              </div>
              <div className="lc-form-group">
                <label className="lc-label">City</label>
                <input className="lc-input" value={form.city} onChange={set('city')} placeholder="Nairobi" />
              </div>
              <div className="lc-form-group">
                <label className="lc-label">Country</label>
                <input className="lc-input" value={form.country} onChange={set('country')} />
              </div>
              <div className="lc-form-group">
                <label className="lc-label">Occupation</label>
                <input className="lc-input" value={form.occupation} onChange={set('occupation')} />
              </div>
              <div className="lc-form-group">
                <label className="lc-label">Education</label>
                <input className="lc-input" value={form.education} onChange={set('education')} />
              </div>
              <div className="lc-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="lc-label">Bio</label>
                <textarea className="lc-textarea" value={form.bio} onChange={set('bio')} rows={4} placeholder="Tell women about yourself…" />
              </div>
              <div className="lc-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="lc-label">What I'm looking for</label>
                <textarea className="lc-textarea" value={form.looking_for} onChange={set('looking_for')} rows={2} />
              </div>
              <div className="lc-form-group" style={{ gridColumn: '1/-1' }}>
                <label className="lc-label">Interests (comma-separated)</label>
                <input className="lc-input" value={form.interests} onChange={set('interests')} placeholder="hiking, tech, cooking, travel" />
              </div>
            </div>

            <button type="submit" className="lc-btn lc-btn-primary" disabled={saving} style={{ marginRight: '.75rem' }}>
              {saving ? <span className="lc-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><i className="bi bi-check2" /> Save Changes</>}
            </button>
          </form>

          <hr className="lc-divider" />

          {/* Photo upload */}
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Add Photo</h3>
          <input type="file" ref={fileRef} style={{ display: 'none' }} accept="image/*" onChange={handlePhotoUpload} />
          <button className="lc-btn lc-btn-outline" onClick={() => fileRef.current?.click()}>
            <i className="bi bi-camera" /> Upload Photo
          </button>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════
// pages/Chat.jsx
// ═══════════════════════════════════════════
import { getChatRooms, getMessages, sendMessage } from '../utils/api'
import { ChatWindowEmpty } from '../components/index'

export function Chat() {
  const { user }               = useAuth()
  const { roomId }             = useParams()
  const [rooms, setRooms]      = useState([])
  const [msgs, setMsgs]        = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [text, setText]        = useState('')
  const [sending, setSending]  = useState(false)
  const bottomRef              = useRef()
  const fileRef                = useRef()

  useEffect(() => {
    getChatRooms().then(data => {
      setRooms(data.results || data)
      if (roomId) {
        const r = (data.results || data).find(r => r.id === roomId)
        if (r) openRoom(r)
      }
    }).catch(() => {})
  }, [])

  const openRoom = async (room) => {
    setActiveRoom(room)
    const data = await getMessages(room.id).catch(() => ({ results: [] }))
    setMsgs(data.results || data)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim() || !activeRoom) return
    setSending(true)
    const fd = new FormData()
    fd.append('body', text)
    fd.append('message_type', 'text')
    try {
      const msg = await sendMessage(activeRoom.id, fd)
      setMsgs(m => [...m, msg])
      setText('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (err) {
      alert(err?.message || err?.non_field_errors?.[0] || 'Could not send message.')
    } finally {
      setSending(false)
    }
  }

  const handleImageSend = async (e) => {
    const file = e.target.files[0]
    if (!file || !activeRoom) return
    const fd = new FormData()
    fd.append('image', file)
    fd.append('message_type', 'image')
    try {
      const msg = await sendMessage(activeRoom.id, fd)
      setMsgs(m => [...m, msg])
    } catch (err) {
      alert(err?.image?.[0] || 'Could not send image.')
    }
  }

  const getPartner = (room) => {
    if (!user) return null
    return user.gender === 'male' ? room.woman : room.man
  }

  return (
    <div className="lc-chat-layout">
      {/* Sidebar */}
      <div className="lc-chat-sidebar">
        <div style={{ padding: '1rem 1rem .5rem', borderBottom: '1px solid #E5DDD8', fontWeight: 500, fontSize: '.88rem' }}>
          <i className="bi bi-chat-dots" /> Messages
        </div>
        {rooms.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#887F8A', fontSize: '.85rem' }}>
            No conversations yet.
          </div>
        )}
        {rooms.map(room => {
          const partner = getPartner(room)
          return (
            <div
              key={room.id}
              className={`lc-chat-room-item${activeRoom?.id === room.id ? ' active' : ''}`}
              onClick={() => openRoom(room)}
            >
              <div className="lc-avatar" style={{ background: '#C4516A', color: 'white', fontSize: '.9rem' }}>
                {partner?.username?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '.88rem' }}>{partner?.username}</div>
                <div style={{ fontSize: '.75rem', color: '#887F8A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {room.last_message?.body || '…'}
                </div>
              </div>
              {room.unread_count > 0 && (
                <span style={{ background: '#C4516A', color: 'white', borderRadius: 20, padding: '.1rem .45rem', fontSize: '.7rem', fontWeight: 700 }}>
                  {room.unread_count}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Main */}
      <div className="lc-chat-main">
        {!activeRoom ? (
          <ChatWindowEmpty />
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1.5px solid #E5DDD8', background: 'white', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
              <div className="lc-avatar" style={{ background: '#C4516A', color: 'white' }}>
                {getPartner(activeRoom)?.username?.[0]?.toUpperCase()}
              </div>
              <strong>{getPartner(activeRoom)?.username}</strong>
            </div>

            {/* Messages */}
            <div className="lc-chat-messages">
              {msgs.map(msg => (
                <div key={msg.id} className={`lc-message ${msg.sender?.id === user?.id ? 'mine' : 'theirs'}`}>
                  {msg.image_url
                    ? <img src={msg.image_url} alt="img" style={{ maxWidth: 200, borderRadius: 8 }} />
                    : msg.body
                  }
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form className="lc-chat-input-bar" onSubmit={handleSend}>
              <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageSend} />
              <button type="button" onClick={() => fileRef.current?.click()} className="lc-btn lc-btn-ghost" style={{ padding: '.5rem .75rem' }}>
                <i className="bi bi-image" />
              </button>
              <input
                className="lc-input"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type a message…"
                style={{ flex: 1 }}
              />
              <button type="submit" className="lc-btn lc-btn-primary" disabled={sending || !text.trim()}>
                <i className="bi bi-send" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════
// pages/Feed.jsx
// ═══════════════════════════════════════════
import { getPosts, createPost } from '../utils/api'
import { PostCard } from '../components/index'

export function Feed() {
  const { user }            = useAuth()
  const [posts, setPosts]   = useState([])
  const [caption, setCaption] = useState('')
  const [img, setImg]       = useState(null)
  const [posting, setPosting] = useState(false)
  const fileRef              = useRef()

  useEffect(() => {
    getPosts().then(d => setPosts(d.results || d)).catch(() => {})
  }, [])

  const handlePost = async (e) => {
    e.preventDefault()
    setPosting(true)
    const fd = new FormData()
    if (caption) fd.append('caption', caption)
    if (img) fd.append('image', img)
    try {
      const post = await createPost(fd)
      setPosts(p => [post, ...p])
      setCaption(''); setImg(null)
    } catch (err) {
      alert(err?.non_field_errors?.[0] || 'Could not post. Gold package required.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="lc-section">
      <div className="lc-container" style={{ maxWidth: 600 }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Feed</h2>

        {/* Create post (Gold only) */}
        {user && (
          <div className="lc-card" style={{ padding: '1.2rem', marginBottom: '1.5rem' }}>
            <form onSubmit={handlePost}>
              <textarea
                className="lc-textarea"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Share something… (Gold members only)"
                rows={2}
                style={{ marginBottom: '.75rem' }}
              />
              <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
                <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={e => setImg(e.target.files[0])} />
                <button type="button" className="lc-btn lc-btn-ghost" onClick={() => fileRef.current?.click()}>
                  <i className="bi bi-image" /> {img ? img.name : 'Photo'}
                </button>
                <button type="submit" className="lc-btn lc-btn-primary" disabled={posting || (!caption && !img)}>
                  <i className="bi bi-send" /> Post
                </button>
              </div>
            </form>
          </div>
        )}

        {posts.map(p => (
          <PostCard key={p.id} post={p} onDelete={id => setPosts(ps => ps.filter(p => p.id !== id))} />
        ))}

        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#887F8A' }}>
            <i className="bi bi-grid" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }} />
            No posts yet. Gold members can start posting!
          </div>
        )}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════
// pages/Dashboard.jsx
// ═══════════════════════════════════════════
import { getDashboard, getPayments } from '../utils/api'
import { Link } from 'react-router-dom'
import { PackageBadge } from '../components/index'

export function Dashboard() {
  const { user }             = useAuth()
  const [stats, setStats]    = useState(null)
  const [payments, setPayments] = useState([])

  useEffect(() => {
    getDashboard().then(setStats).catch(() => {})
    getPayments().then(d => setPayments(d.results || d)).catch(() => {})
  }, [])

  if (!stats) return <div className="lc-loading"><span className="lc-spinner" /></div>

  const statItems = [
    { icon: 'bi-eye',        label: 'Profile Views', value: stats.profile_views },
    { icon: 'bi-heart',      label: 'Likes Received', value: stats.likes_count },
    { icon: 'bi-chat-dots',  label: 'Messages Sent',  value: stats.messages_sent },
    { icon: 'bi-envelope',   label: 'Unread Messages',value: stats.unread_messages },
  ]

  return (
    <div className="lc-section">
      <div className="lc-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>Dashboard</h2>
            <p style={{ color: '#887F8A', fontSize: '.88rem' }}>Your profile performance at a glance.</p>
          </div>
          <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
            <PackageBadge tier={stats.package_tier} />
            <Link to="/packages" className="lc-btn lc-btn-primary">
              <i className="bi bi-gem" /> Upgrade
            </Link>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {statItems.map(s => (
            <div key={s.label} className="lc-stat-card">
              <div className="lc-stat-icon"><i className={`bi ${s.icon}`} /></div>
              <div>
                <div className="lc-stat-value">{s.value}</div>
                <div className="lc-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Package status */}
        {stats.package_expires && (
          <div className="lc-alert lc-alert-info" style={{ marginBottom: '2rem' }}>
            <i className="bi bi-info-circle" /> Package expires: {new Date(stats.package_expires).toLocaleDateString('en-KE', { dateStyle: 'medium' })}
          </div>
        )}
        {stats.is_boosted && (
          <div className="lc-alert lc-alert-success" style={{ marginBottom: '2rem' }}>
            🚀 Profile is boosted until {new Date(stats.boost_expires).toLocaleString('en-KE')}
          </div>
        )}

        {/* Payment history */}
        <h3 style={{ marginBottom: '1rem' }}>Payment History</h3>
        {payments.length === 0 ? (
          <p style={{ color: '#887F8A' }}>No payments yet. <Link to="/packages">Get a package</Link></p>
        ) : (
          <div className="lc-card">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #E5DDD8' }}>
                  {['Package', 'Amount', 'Status', 'Receipt', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '.75rem 1rem', color: '#887F8A', fontWeight: 500, fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F0E8DE' }}>
                    <td style={{ padding: '.75rem 1rem' }}>{p.package_name || 'Boost'}</td>
                    <td style={{ padding: '.75rem 1rem' }}>KES {Number(p.amount).toLocaleString()}</td>
                    <td style={{ padding: '.75rem 1rem' }}>
                      <span style={{ color: p.status === 'completed' ? '#276749' : p.status === 'pending' ? '#1e429f' : '#C4516A' }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '.75rem 1rem', fontSize: '.78rem', fontFamily: 'monospace' }}>{p.mpesa_receipt_number || '—'}</td>
                    <td style={{ padding: '.75rem 1rem', color: '#887F8A' }}>
                      {new Date(p.created_at).toLocaleDateString('en-KE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Default exports for lazy routing
export { ProfileDetail as default }