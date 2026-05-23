import { useNavigate } from 'react-router-dom'

const TIER_BADGE = {
  gold   : { label: '✦ Gold',    cls: 'badge-gold' },
  monthly: { label: '★ Monthly', cls: 'badge-monthly' },
  weekly : { label: 'Weekly',    cls: 'badge-weekly' },
}

export default function ProfileCard({ profile }) {
  const navigate = useNavigate()
  const badge = TIER_BADGE[profile.package_tier]

  return (
    <div
      className="lc-profile-card"
      onClick={() => navigate(`/profiles/${profile.slug}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/profiles/${profile.slug}`)}
    >
      {/* Photo */}
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={profile.display_name}
          className="lc-profile-card__image"
          loading="lazy"
        />
      ) : (
        <div className="lc-profile-card__placeholder">
          <i className="bi bi-person-fill" />
        </div>
      )}

      {/* Badges */}
      {badge && (
        <span className={`lc-profile-card__badge ${badge.cls}`}>
          {badge.label}
        </span>
      )}
      {profile.is_boosted && (
        <span className="lc-profile-card__badge badge-boosted" style={{ top: badge ? '2.4rem' : '.8rem' }}>
          🚀 Boosted
        </span>
      )}

      {/* Info */}
      <div className="lc-profile-card__info">
        <div className="lc-profile-card__name">{profile.display_name}</div>
        <div className="lc-profile-card__meta">
          {[profile.age && `${profile.age} yrs`, profile.city, profile.occupation]
            .filter(Boolean)
            .join(' · ')}
        </div>

        {/* Interests */}
        {profile.interests?.slice(0, 3).map(tag => (
          <span key={tag} className="lc-tag">{tag}</span>
        ))}

        {/* Stats */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '.75rem', fontSize: '.78rem', color: '#887F8A' }}>
          <span><i className="bi bi-eye" /> {profile.profile_views}</span>
          <span><i className="bi bi-heart" /> {profile.likes_count}</span>
        </div>
      </div>
    </div>
  )
}