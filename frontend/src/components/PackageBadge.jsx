// components/PackageBadge.jsx
export function PackageBadge({ tier }) {
  const map = {
    gold   : { label: '✦ Gold',    color: '#C9A84C', bg: '#FFF8E1' },
    monthly: { label: '★ Monthly', color: '#C4516A', bg: '#FFF1F3' },
    weekly : { label: 'Weekly',    color: '#2E2B31', bg: '#F0EBF5' },
    basic  : { label: 'Basic',     color: '#887F8A', bg: '#F5F2F0' },
    free   : { label: 'Free',      color: '#887F8A', bg: '#F5F2F0' },
  }
  const b = map[tier] || map.free
  return (
    <span style={{
      display     : 'inline-flex',
      alignItems  : 'center',
      padding     : '.2rem .7rem',
      borderRadius: 20,
      fontSize    : '.72rem',
      fontWeight  : 600,
      letterSpacing: '.06em',
      background  : b.bg,
      color       : b.color,
      textTransform: 'uppercase',
    }}>
      {b.label}
    </span>
  )
}
