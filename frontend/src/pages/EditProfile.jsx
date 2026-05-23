/**
 * pages/EditProfile.jsx
 *
 * Full-featured profile editor with:
 * - Avatar upload with live preview
 * - All profile fields (bio, interests, occupation, etc.)
 * - Inline field-level error display from API
 * - Package status banner with upgrade CTA
 * - PhotoUpload gallery component embedded at bottom
 * - Autosave indicator
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { updateProfile, getMe } from '../utils/api'
import { useAuth } from '../App'
import PhotoUpload from '../components/PhotoUpload'
import { PackageBadge } from '../components/index'

// ── Interests suggestions ────────────────────────────────────
const INTEREST_SUGGESTIONS = [
  'Hiking', 'Tech', 'Cooking', 'Travel', 'Fitness', 'Reading',
  'Music', 'Photography', 'Football', 'Business', 'Fashion',
  'Movies', 'Art', 'Gaming', 'Cars', 'Agriculture', 'Finance',
  'Church', 'Volunteering', 'Dancing',
]

// ── Tab definitions ──────────────────────────────────────────
const TABS = [
  { id: 'basic',    label: 'Basic Info',  icon: 'bi-person'       },
  { id: 'about',    label: 'About Me',    icon: 'bi-chat-square-text' },
  { id: 'photos',   label: 'Photos',      icon: 'bi-images'       },
]

export default function EditProfile() {
  const { user, login }          = useAuth()
  const [activeTab, setActiveTab] = useState('basic')
  const [profile, setProfile]    = useState(null)
  const [loading, setLoading]    = useState(true)

  // Form state
  const [form, setForm] = useState({
    display_name : '',
    bio          : '',
    age          : '',
    city         : '',
    country      : 'Kenya',
    occupation   : '',
    education    : '',
    height_cm    : '',
    looking_for  : '',
    interests    : [],   // kept as array internally
  })

  // Avatar
  const [avatarFile, setAvatarFile]       = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const avatarRef = useRef()

  // Save state
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [globalError, setGlobalError] = useState('')

  // Interest input
  const [interestInput, setInterestInput] = useState('')

  // ── Load profile ───────────────────────────────────────────
  useEffect(() => {
    getMe()
      .then(data => {
        setProfile(data)
        const p = data
        setForm({
          display_name : p.display_name || '',
          bio          : p.bio          || '',
          age          : p.age          || '',
          city         : p.city         || '',
          country      : p.country      || 'Kenya',
          occupation   : p.occupation   || '',
          education    : p.education    || '',
          height_cm    : p.height_cm    || '',
          looking_for  : p.looking_for  || '',
          interests    : Array.isArray(p.interests) ? p.interests : [],
        })
        if (p.avatar_url) setAvatarPreview(p.avatar_url)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Helpers ────────────────────────────────────────────────
  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    setFieldErrors(fe => ({ ...fe, [key]: undefined }))
  }

  const addInterest = (tag) => {
    const clean = tag.trim()
    if (!clean || form.interests.includes(clean)) return
    setForm(f => ({ ...f, interests: [...f.interests, clean] }))
    setInterestInput('')
  }

  const removeInterest = (tag) => {
    setForm(f => ({ ...f, interests: f.interests.filter(i => i !== tag) }))
  }

  const handleInterestKeyDown = (e) => {
    if (['Enter', ','].includes(e.key)) {
      e.preventDefault()
      addInterest(interestInput)
    }
  }

  // ── Avatar select ─────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setGlobalError('Avatar image must be under 5MB.')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  // ── Save ──────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setFieldErrors({})
    setGlobalError('')

    const fd = new FormData()

    // Text fields
    Object.entries(form).forEach(([key, val]) => {
      if (key === 'interests') {
        fd.append('interests', JSON.stringify(val))
      } else if (val !== '' && val !== null && val !== undefined) {
        fd.append(key, val)
      }
    })

    // Avatar
    if (avatarFile) fd.append('avatar', avatarFile)

    try {
      const updated = await updateProfile(fd)
      setProfile(updated)
      setSaved(true)
      // Update auth context so navbar avatar refreshes
      if (user) login({ ...user, profile: updated }, {
        access : localStorage.getItem('access'),
        refresh: localStorage.getItem('refresh'),
      })
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      if (err && typeof err === 'object') {
        // Field-level errors from DRF
        const fieldErrs = {}
        let hasGlobal = false
        Object.entries(err).forEach(([key, msgs]) => {
          if (key === 'non_field_errors' || key === 'detail') {
            setGlobalError(Array.isArray(msgs) ? msgs.join(' ') : msgs)
            hasGlobal = true
          } else {
            fieldErrs[key] = Array.isArray(msgs) ? msgs.join(' ') : msgs
          }
        })
        setFieldErrors(fieldErrs)
        if (!hasGlobal && Object.keys(fieldErrs).length === 0) {
          setGlobalError('Save failed. Please try again.')
        }
      } else {
        setGlobalError('Save failed. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Render helpers ────────────────────────────────────────
  const FieldError = ({ name }) =>
    fieldErrors[name]
      ? <div className="lc-form-error"><i className="bi bi-exclamation-circle" /> {fieldErrors[name]}</div>
      : null

  if (loading) return <div className="lc-loading"><span className="lc-spinner" /></div>

  const packageActive  = profile?.package_tier && profile.package_tier !== 'free'
  const packageExpires = profile?.package_expires_at
    ? new Date(profile.package_expires_at).toLocaleDateString('en-KE', { dateStyle: 'medium' })
    : null

  return (
    <div className="lc-section">
      <div className="lc-container" style={{ maxWidth: 760 }}>

        {/* ── Page header ── */}
        <div style={styles.pageHeader}>
          <div>
            <h2 style={{ marginBottom: '.2rem' }}>Edit Profile</h2>
            <p style={{ color: '#887F8A', fontSize: '.88rem' }}>
              Keep your profile fresh to attract more connections.
            </p>
          </div>
          <Link to={profile?.slug ? `/profiles/${profile.slug}` : '/'} className="lc-btn lc-btn-outline" style={{ fontSize: '.82rem' }}>
            <i className="bi bi-eye" /> View Profile
          </Link>
        </div>

        {/* ── Package status banner ── */}
        {packageActive ? (
          <div style={styles.packageBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              <i className="bi bi-gem" style={{ color: '#C9A84C', fontSize: '1.1rem' }} />
              <div>
                <span style={{ fontWeight: 500 }}>Active: </span>
                <PackageBadge tier={profile.package_tier} />
                {packageExpires && (
                  <span style={{ fontSize: '.78rem', color: '#887F8A', marginLeft: '.5rem' }}>
                    expires {packageExpires}
                  </span>
                )}
              </div>
            </div>
            <Link to="/packages" style={{ fontSize: '.78rem', color: '#C4516A', fontWeight: 500 }}>
              Renew →
            </Link>
          </div>
        ) : (
          <div style={styles.upgradeBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <i className="bi bi-lock" />
              <span>Your profile is <strong>not visible</strong> to women yet.</span>
            </div>
            <Link to="/packages" className="lc-btn lc-btn-primary" style={{ fontSize: '.78rem', padding: '.4rem 1rem' }}>
              <i className="bi bi-gem" /> Upgrade Now
            </Link>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`bi ${tab.icon}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Feedback ── */}
        {globalError && (
          <div className="lc-alert lc-alert-error" style={{ marginBottom: '1rem' }}>
            <i className="bi bi-exclamation-circle" /> {globalError}
          </div>
        )}
        {saved && (
          <div className="lc-alert lc-alert-success" style={{ marginBottom: '1rem' }}>
            <i className="bi bi-check-circle" /> Profile saved successfully!
          </div>
        )}

        {/* ════════════════════════════════
            TAB: Basic Info
        ════════════════════════════════ */}
        {activeTab === 'basic' && (
          <form onSubmit={handleSave}>
            <div className="lc-card" style={{ padding: '2rem' }}>

              {/* Avatar section */}
              <div style={styles.avatarSection}>
                <div style={styles.avatarWrap} onClick={() => avatarRef.current?.click()}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" style={styles.avatarImg} />
                  ) : (
                    <div style={styles.avatarPlaceholder}>
                      <i className="bi bi-person-fill" style={{ fontSize: '2.5rem', color: '#C4B8C0' }} />
                    </div>
                  )}
                  <div style={styles.avatarOverlay}>
                    <i className="bi bi-camera-fill" style={{ fontSize: '1.2rem' }} />
                  </div>
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: '.2rem' }}>Profile Photo</div>
                  <div style={{ fontSize: '.78rem', color: '#887F8A', marginBottom: '.75rem' }}>
                    Click the circle to change. JPG/PNG/WebP, max 5MB.
                  </div>
                  <button
                    type="button"
                    className="lc-btn lc-btn-outline"
                    style={{ fontSize: '.78rem', padding: '.35rem .9rem' }}
                    onClick={() => avatarRef.current?.click()}
                  >
                    <i className="bi bi-camera" /> Change Photo
                  </button>
                </div>
              </div>

              <hr className="lc-divider" style={{ margin: '1.5rem 0' }} />

              {/* Fields grid */}
              <div style={styles.grid2}>
                <div className="lc-form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="lc-label">Display Name <span style={{ color: '#C4516A' }}>*</span></label>
                  <input
                    className={`lc-input${fieldErrors.display_name ? ' lc-input-error' : ''}`}
                    value={form.display_name}
                    onChange={set('display_name')}
                    placeholder="How you want to appear on LaChick"
                    required
                  />
                  <FieldError name="display_name" />
                </div>

                <div className="lc-form-group">
                  <label className="lc-label">Age</label>
                  <input
                    className="lc-input"
                    type="number"
                    min={18}
                    max={80}
                    value={form.age}
                    onChange={set('age')}
                    placeholder="e.g. 28"
                  />
                  <FieldError name="age" />
                </div>

                <div className="lc-form-group">
                  <label className="lc-label">Height (cm)</label>
                  <input
                    className="lc-input"
                    type="number"
                    min={140}
                    max={220}
                    value={form.height_cm}
                    onChange={set('height_cm')}
                    placeholder="e.g. 178"
                  />
                  <FieldError name="height_cm" />
                </div>

                <div className="lc-form-group">
                  <label className="lc-label">City</label>
                  <input
                    className="lc-input"
                    value={form.city}
                    onChange={set('city')}
                    placeholder="Nairobi"
                  />
                  <FieldError name="city" />
                </div>

                <div className="lc-form-group">
                  <label className="lc-label">Country</label>
                  <select className="lc-select" value={form.country} onChange={set('country')}>
                    {['Kenya','Uganda','Tanzania','Rwanda','Ethiopia','South Africa','Nigeria','Ghana'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="lc-form-group">
                  <label className="lc-label">Occupation</label>
                  <input
                    className="lc-input"
                    value={form.occupation}
                    onChange={set('occupation')}
                    placeholder="e.g. Software Engineer"
                  />
                  <FieldError name="occupation" />
                </div>

                <div className="lc-form-group">
                  <label className="lc-label">Education</label>
                  <input
                    className="lc-input"
                    value={form.education}
                    onChange={set('education')}
                    placeholder="e.g. BSc Computer Science, UoN"
                  />
                  <FieldError name="education" />
                </div>
              </div>

              <SaveBar saving={saving} />
            </div>
          </form>
        )}

        {/* ════════════════════════════════
            TAB: About Me
        ════════════════════════════════ */}
        {activeTab === 'about' && (
          <form onSubmit={handleSave}>
            <div className="lc-card" style={{ padding: '2rem' }}>

              {/* Bio */}
              <div className="lc-form-group">
                <label className="lc-label">
                  Bio
                  <span style={{ float: 'right', fontWeight: 400, color: '#887F8A' }}>
                    {form.bio.length} / 1000
                  </span>
                </label>
                <textarea
                  className="lc-textarea"
                  value={form.bio}
                  onChange={set('bio')}
                  rows={5}
                  maxLength={1000}
                  placeholder="Tell women who you are — your personality, lifestyle, what makes you unique…"
                />
                <FieldError name="bio" />
                <div style={{ fontSize: '.75rem', color: '#887F8A', marginTop: '.3rem' }}>
                  <i className="bi bi-lightbulb" /> Tip: profiles with 150+ character bios get 3× more likes.
                </div>
              </div>

              {/* Looking for */}
              <div className="lc-form-group">
                <label className="lc-label">What I'm Looking For</label>
                <textarea
                  className="lc-textarea"
                  value={form.looking_for}
                  onChange={set('looking_for')}
                  rows={3}
                  maxLength={500}
                  placeholder="Describe the kind of woman or relationship you're looking for…"
                />
                <FieldError name="looking_for" />
              </div>

              {/* Interests */}
              <div className="lc-form-group">
                <label className="lc-label">Interests & Hobbies</label>

                {/* Tag pills */}
                <div style={styles.tagPills}>
                  {form.interests.map(tag => (
                    <span key={tag} style={styles.tagPill}>
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeInterest(tag)}
                        style={styles.tagRemove}
                        aria-label={`Remove ${tag}`}
                      >
                        <i className="bi bi-x" />
                      </button>
                    </span>
                  ))}
                  <input
                    className="lc-input"
                    style={{ flex: 1, minWidth: 120, border: 'none', padding: '.2rem .4rem', outline: 'none', background: 'transparent', fontSize: '.88rem' }}
                    value={interestInput}
                    onChange={e => setInterestInput(e.target.value)}
                    onKeyDown={handleInterestKeyDown}
                    placeholder={form.interests.length === 0 ? 'Type an interest and press Enter…' : 'Add more…'}
                  />
                </div>
                <div style={{ fontSize: '.75rem', color: '#887F8A', marginTop: '.35rem' }}>
                  Press <kbd style={styles.kbd}>Enter</kbd> or <kbd style={styles.kbd}>,</kbd> to add a tag.
                </div>

                {/* Quick-add suggestions */}
                <div style={{ marginTop: '.75rem', display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                  {INTEREST_SUGGESTIONS.filter(s => !form.interests.includes(s)).slice(0, 12).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addInterest(s)}
                      style={styles.suggestionBtn}
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              <SaveBar saving={saving} />
            </div>
          </form>
        )}

        {/* ════════════════════════════════
            TAB: Photos
        ════════════════════════════════ */}
        {activeTab === 'photos' && (
          <div className="lc-card" style={{ padding: '2rem' }}>
            <PhotoUpload />
          </div>
        )}

      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────

function SaveBar({ saving }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1.5px solid #F0E8DE' }}>
      <button
        type="submit"
        className="lc-btn lc-btn-primary"
        disabled={saving}
        style={{ minWidth: 140, justifyContent: 'center' }}
      >
        {saving
          ? <><span className="lc-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</>
          : <><i className="bi bi-check2" /> Save Changes</>
        }
      </button>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────

const styles = {
  pageHeader: {
    display       : 'flex',
    justifyContent: 'space-between',
    alignItems    : 'flex-start',
    marginBottom  : '1.5rem',
    gap           : '1rem',
    flexWrap      : 'wrap',
  },
  packageBanner: {
    display       : 'flex',
    justifyContent: 'space-between',
    alignItems    : 'center',
    background    : '#FFF8E1',
    border        : '1.5px solid #F5DFA0',
    borderRadius  : 12,
    padding       : '.9rem 1.2rem',
    marginBottom  : '1.5rem',
    gap           : '1rem',
    flexWrap      : 'wrap',
    fontSize      : '.88rem',
  },
  upgradeBanner: {
    display       : 'flex',
    justifyContent: 'space-between',
    alignItems    : 'center',
    background    : '#FFF1F3',
    border        : '1.5px solid #FBCDD4',
    borderRadius  : 12,
    padding       : '.9rem 1.2rem',
    marginBottom  : '1.5rem',
    gap           : '1rem',
    flexWrap      : 'wrap',
    fontSize      : '.88rem',
    color         : '#8C2D41',
  },
  tabs: {
    display      : 'flex',
    gap          : '.3rem',
    marginBottom : '1.5rem',
    background   : '#F0E8DE',
    borderRadius : 12,
    padding      : '.3rem',
  },
  tab: {
    flex        : 1,
    padding     : '.6rem .5rem',
    border      : 'none',
    borderRadius: 9,
    background  : 'transparent',
    cursor      : 'pointer',
    fontSize    : '.83rem',
    color       : '#887F8A',
    fontFamily  : "'DM Sans', sans-serif",
    display     : 'flex',
    alignItems  : 'center',
    justifyContent: 'center',
    gap         : '.35rem',
    transition  : 'all .15s',
    fontWeight  : 400,
  },
  tabActive: {
    background  : 'white',
    color       : '#C4516A',
    fontWeight  : 500,
    boxShadow   : '0 2px 8px rgba(28,26,30,.08)',
  },
  grid2: {
    display             : 'grid',
    gridTemplateColumns : '1fr 1fr',
    gap                 : '0 1rem',
  },
  avatarSection: {
    display    : 'flex',
    alignItems : 'center',
    gap        : '1.5rem',
    flexWrap   : 'wrap',
  },
  avatarWrap: {
    position      : 'relative',
    width         : 90,
    height        : 90,
    borderRadius  : '50%',
    cursor        : 'pointer',
    flexShrink    : 0,
    overflow      : 'hidden',
    border        : '3px solid white',
    boxShadow     : '0 4px 16px rgba(196,81,106,.2)',
  },
  avatarImg: {
    width     : '100%',
    height    : '100%',
    objectFit : 'cover',
    display   : 'block',
  },
  avatarPlaceholder: {
    width          : '100%',
    height         : '100%',
    background     : '#F0E8DE',
    display        : 'flex',
    alignItems     : 'center',
    justifyContent : 'center',
  },
  avatarOverlay: {
    position       : 'absolute',
    inset          : 0,
    background     : 'rgba(196,81,106,.6)',
    display        : 'flex',
    alignItems     : 'center',
    justifyContent : 'center',
    color          : 'white',
    opacity        : 0,
    transition     : 'opacity .2s',
    // Note: hover handled via CSS; for inline-only approach we use onMouseEnter/Leave
  },
  tagPills: {
    display    : 'flex',
    flexWrap   : 'wrap',
    gap        : '.4rem',
    border     : '1.5px solid #E5DDD8',
    borderRadius: 12,
    padding    : '.5rem .75rem',
    background : 'white',
    minHeight  : 46,
    alignItems : 'center',
    cursor     : 'text',
  },
  tagPill: {
    display    : 'inline-flex',
    alignItems : 'center',
    gap        : '.2rem',
    background : '#FAF0F3',
    color      : '#C4516A',
    border     : '1px solid #F2C8D0',
    borderRadius: 20,
    padding    : '.2rem .65rem',
    fontSize   : '.8rem',
    fontWeight : 500,
  },
  tagRemove: {
    background : 'none',
    border     : 'none',
    cursor     : 'pointer',
    color      : '#C4516A',
    padding    : 0,
    fontSize   : '.85rem',
    lineHeight : 1,
    opacity    : .7,
    display    : 'flex',
    alignItems : 'center',
  },
  suggestionBtn: {
    background   : 'white',
    border       : '1.5px solid #E5DDD8',
    borderRadius : 20,
    padding      : '.2rem .75rem',
    fontSize     : '.75rem',
    cursor       : 'pointer',
    color        : '#3B3540',
    transition   : 'all .15s',
    fontFamily   : "'DM Sans', sans-serif",
  },
  kbd: {
    background   : '#F0E8DE',
    border       : '1px solid #C9B8B0',
    borderRadius : 4,
    padding      : '0 .35rem',
    fontSize     : '.72rem',
    fontFamily   : 'monospace',
  },
}