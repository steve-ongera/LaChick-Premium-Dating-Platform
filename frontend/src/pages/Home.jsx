import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProfiles } from '../utils/api'
import ProfileCard from '../components/ProfileCard'
import { useAuth } from '../App'

export default function Home() {
  const { user }                 = useAuth()
  const [profiles, setProfiles]  = useState([])
  const [loading, setLoading]    = useState(true)
  const [filters, setFilters]    = useState({ city: '', age_min: '', age_max: '', q: '' })

  const fetchProfiles = async (f = filters) => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''))
      const data   = await getProfiles(params)
      setProfiles(data.results || data)
    } catch (_) {
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProfiles() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchProfiles()
  }

  return (
    <>
      {/* Hero */}
      {!user && (
        <section className="lc-hero">
          <div className="lc-container lc-hero__content">
            <h1>Where <em>she</em> chooses,<br />where <em>he</em> shines.</h1>
            <p>
              LaChick is Kenya's most thoughtful dating platform. Men present their authentic selves.
              Women browse, connect, and choose. No games — just genuine people.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/register" className="lc-btn lc-btn-primary" style={{ padding: '.8rem 2rem', fontSize: '1rem' }}>
                <i className="bi bi-person-plus" /> Join Free
              </Link>
              <Link to="/packages" className="lc-btn" style={{ background: 'rgba(255,255,255,.12)', color: 'white', padding: '.8rem 2rem', fontSize: '1rem' }}>
                <i className="bi bi-gem" /> See Packages
              </Link>
            </div>

            {/* Trust badges */}
            <div style={{ marginTop: '3rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', opacity: .7, fontSize: '.82rem' }}>
              <span><i className="bi bi-shield-check" /> Verified profiles</span>
              <span><i className="bi bi-lock" /> M-Pesa secured</span>
              <span><i className="bi bi-people" /> Growing community</span>
            </div>
          </div>
        </section>
      )}

      {/* Search & Browse */}
      <section className="lc-section">
        <div className="lc-container">
          <h2 style={{ marginBottom: '1.5rem' }}>
            {user ? 'Browse Profiles' : 'Meet Our Members'}
          </h2>

          {/* Filters */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <input
              className="lc-input"
              style={{ maxWidth: 200 }}
              placeholder="🔍 Search name, bio…"
              value={filters.q}
              onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            />
            <input
              className="lc-input"
              style={{ maxWidth: 150 }}
              placeholder="City"
              value={filters.city}
              onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
            />
            <input
              className="lc-input"
              style={{ maxWidth: 90 }}
              type="number"
              placeholder="Age min"
              value={filters.age_min}
              onChange={e => setFilters(f => ({ ...f, age_min: e.target.value }))}
            />
            <input
              className="lc-input"
              style={{ maxWidth: 90 }}
              type="number"
              placeholder="Age max"
              value={filters.age_max}
              onChange={e => setFilters(f => ({ ...f, age_max: e.target.value }))}
            />
            <button type="submit" className="lc-btn lc-btn-primary">
              <i className="bi bi-search" /> Search
            </button>
          </form>

          {loading ? (
            <div className="lc-loading"><span className="lc-spinner" /></div>
          ) : profiles.length > 0 ? (
            <div className="lc-grid-profiles">
              {profiles.map(p => <ProfileCard key={p.id} profile={p} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#887F8A' }}>
              <i className="bi bi-search" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }} />
              <p>No profiles found. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA section for non-users */}
      {!user && (
        <section style={{ background: '#1C1A1E', color: 'white', padding: '5rem 0', textAlign: 'center' }}>
          <div className="lc-container">
            <h2 style={{ color: 'white', marginBottom: '1rem' }}>Ready to find your match?</h2>
            <p style={{ opacity: .75, marginBottom: '2rem', maxWidth: 500, margin: '0 auto 2rem' }}>
              Join thousands of genuine Kenyan singles. Create your profile free, upgrade to be seen.
            </p>
            <Link to="/register" className="lc-btn lc-btn-primary" style={{ padding: '.9rem 2.5rem', fontSize: '1rem' }}>
              <i className="bi bi-heart" /> Start for Free
            </Link>
          </div>
        </section>
      )}
    </>
  )
}