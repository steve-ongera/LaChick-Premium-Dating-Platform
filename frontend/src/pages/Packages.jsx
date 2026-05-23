import { useState, useEffect } from 'react'
import { getPackages, subscribe, boostProfile } from '../utils/api'
import { useAuth } from '../App'

const FEATURE_MAP = {
  basic  : ['Profile visible in search', 'Receive messages from women', 'Basic profile badge'],
  weekly : ['Everything in Basic', 'Send messages to women', 'Appear in Top Picks section', 'Weekly member badge'],
  monthly: ['Everything in Weekly', 'Share photos in chat', 'Post on the public feed', 'Monthly member badge'],
  gold   : ['Everything in Monthly', 'Top of search results always', '✦ Gold verified badge', 'Profile analytics dashboard', 'Priority support'],
}

export default function Packages() {
  const { user }                     = useAuth()
  const [packages, setPackages]      = useState([])
  const [loading, setLoading]        = useState(true)
  const [modal, setModal]            = useState(null)    // { pkg } | null
  const [phone, setPhone]            = useState(user?.phone || '')
  const [paying, setPaying]          = useState(false)
  const [result, setResult]          = useState(null)    // { ok, msg }

  useEffect(() => {
    getPackages()
      .then(setPackages)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    setPaying(true)
    setResult(null)
    try {
      const res = await subscribe(modal.pkg.id, phone)
      setResult({ ok: true, msg: res.message || 'STK Push sent! Check your phone.' })
    } catch (err) {
      setResult({ ok: false, msg: err?.error || 'Payment failed. Please try again.' })
    } finally {
      setPaying(false)
    }
  }

  const handleBoost = async () => {
    if (!phone) { alert('Enter your M-Pesa phone number first.'); return }
    setPaying(true)
    try {
      const res = await boostProfile(phone)
      alert(res.message || 'Boost initiated!')
    } catch (_) {
      alert('Boost payment failed.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <div className="lc-loading"><span className="lc-spinner" /></div>

  return (
    <div className="lc-section">
      <div className="lc-container">

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2>Choose Your Package</h2>
          <p style={{ color: '#887F8A', marginTop: '.5rem', maxWidth: 500, margin: '.5rem auto 0' }}>
            Upgrade your visibility and unlock powerful features. Pay securely via M-Pesa.
          </p>
        </div>

        {/* Package grid */}
        <div className="lc-grid-packages" style={{ maxWidth: 900, margin: '0 auto' }}>
          {packages.map(pkg => {
            const featured = pkg.tier === 'monthly'
            const features = FEATURE_MAP[pkg.tier] || pkg.features

            return (
              <div key={pkg.id} className={`lc-package-card${featured ? ' featured' : ''}`}>
                {featured && (
                  <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: '#C4516A', color: 'white', fontSize: '.7rem', fontWeight: 700, padding: '.25rem 1rem', borderRadius: '0 0 8px 8px', letterSpacing: '.06em' }}>
                    MOST POPULAR
                  </div>
                )}

                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', marginBottom: '.5rem', marginTop: featured ? '1rem' : 0 }}>
                  {pkg.name}
                </h3>
                <div className="lc-package-card__price">KES {Number(pkg.price_kes).toLocaleString()}</div>
                <div className="lc-package-card__duration">{pkg.duration_days} days</div>

                <ul className="lc-package-card__features">
                  {features.map((f, i) => (
                    <li key={i}>
                      <i className="bi bi-check-circle-fill" style={{ color: '#C4516A' }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`lc-btn ${featured ? 'lc-btn-primary' : 'lc-btn-outline'}`}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => { setModal({ pkg }); setResult(null) }}
                >
                  <i className="bi bi-phone" /> Pay via M-Pesa
                </button>
              </div>
            )
          })}
        </div>

        {/* Boost section */}
        <div className="lc-card" style={{ maxWidth: 540, margin: '3rem auto 0', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🚀</div>
          <h3>Profile Boost</h3>
          <p style={{ color: '#887F8A', fontSize: '.88rem', margin: '.5rem 0 1.5rem' }}>
            Appear at the top of search results for 24 hours. One-time KES 50.
          </p>
          <div style={{ display: 'flex', gap: '.75rem', maxWidth: 320, margin: '0 auto' }}>
            <input
              className="lc-input"
              placeholder="Your M-Pesa number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <button className="lc-btn lc-btn-primary" onClick={handleBoost} disabled={paying}>
              Boost
            </button>
          </div>
        </div>
      </div>

      {/* M-Pesa Payment Modal */}
      {modal && (
        <div style={modalStyles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={modalStyles.box}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ marginBottom: '.2rem' }}>{modal.pkg.name}</h3>
                <p style={{ color: '#887F8A', fontSize: '.85rem' }}>KES {Number(modal.pkg.price_kes).toLocaleString()} · {modal.pkg.duration_days} days</p>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#887F8A' }}>
                <i className="bi bi-x" />
              </button>
            </div>

            {result ? (
              <div className={`lc-alert ${result.ok ? 'lc-alert-success' : 'lc-alert-error'}`}>
                <i className={`bi ${result.ok ? 'bi-check-circle' : 'bi-exclamation-circle'}`} />
                {' '}{result.msg}
              </div>
            ) : null}

            <form onSubmit={handleSubscribe}>
              <div className="lc-form-group">
                <label className="lc-label">M-Pesa Phone Number</label>
                <input
                  className="lc-input"
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                />
                <div style={{ fontSize: '.75rem', color: '#887F8A', marginTop: '.3rem' }}>
                  You will receive an STK Push on this number.
                </div>
              </div>

              <div style={{ background: '#FAF6F1', borderRadius: 10, padding: '1rem', fontSize: '.82rem', color: '#887F8A', marginBottom: '1.2rem' }}>
                <i className="bi bi-lock-fill" /> Secured by Safaricom M-Pesa. LaChick never stores your PIN.
              </div>

              <button type="submit" className="lc-btn lc-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '.85rem' }} disabled={paying}>
                {paying
                  ? <><span className="lc-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Sending STK Push…</>
                  : <><i className="bi bi-phone-vibrate" /> Pay KES {Number(modal.pkg.price_kes).toLocaleString()}</>
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const modalStyles = {
  overlay: {
    position      : 'fixed',
    inset         : 0,
    background    : 'rgba(28,26,30,.55)',
    backdropFilter: 'blur(4px)',
    display       : 'flex',
    alignItems    : 'center',
    justifyContent: 'center',
    zIndex        : 2000,
    padding       : '1rem',
  },
  box: {
    background  : 'white',
    borderRadius: 20,
    padding     : '2rem',
    width       : '100%',
    maxWidth    : 440,
    boxShadow   : '0 20px 60px rgba(28,26,30,.2)',
  },
}