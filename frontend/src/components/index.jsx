
// components/PostCard.jsx
import { useState } from 'react'
import { likePost, deletePost } from '../utils/api'
import { useAuth } from '../App'

export function PostCard({ post, onDelete }) {
  const { user }           = useAuth()
  const [liked, setLiked]  = useState(post.is_liked)
  const [count, setCount]  = useState(post.likes_count)
  const isOwn = user?.id === post.author?.id

  const handleLike = async () => {
    try {
      const res = await likePost(post.id)
      setLiked(res.liked)
      setCount(c => res.liked ? c + 1 : c - 1)
    } catch (_) {}
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return
    try {
      await deletePost(post.id)
      onDelete?.(post.id)
    } catch (_) {}
  }

  return (
    <div className="lc-post-card">
      <div className="lc-post-card__header">
        <div className="lc-avatar" style={{ background: '#C4516A', color: 'white' }}>
          {post.author?.username?.[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: '.9rem' }}>{post.author?.username}</div>
          <div style={{ fontSize: '.75rem', color: '#887F8A' }}>
            {new Date(post.created_at).toLocaleDateString('en-KE', { day:'numeric', month:'short' })}
          </div>
        </div>
        {isOwn && (
          <button onClick={handleDelete} style={{ background:'none', border:'none', cursor:'pointer', color:'#887F8A', fontSize:'1rem' }}>
            <i className="bi bi-trash" />
          </button>
        )}
      </div>

      {post.image_url && (
        <img src={post.image_url} alt="post" className="lc-post-card__image" loading="lazy" />
      )}

      {post.caption && (
        <div style={{ padding: '.75rem 1.2rem', fontSize: '.9rem' }}>{post.caption}</div>
      )}

      <div className="lc-post-card__actions">
        <button
          onClick={handleLike}
          style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'.3rem', color: liked ? '#C4516A' : '#887F8A', fontSize:'.88rem' }}
        >
          <i className={`bi bi-heart${liked ? '-fill' : ''}`} /> {count}
        </button>
      </div>
    </div>
  )
}

// components/ChatWindow.jsx — thin wrapper used in Chat page
export function ChatWindowEmpty() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#887F8A' }}>
      <i className="bi bi-chat-heart" style={{ fontSize:'3rem', marginBottom:'.75rem' }} />
      <p>Select a conversation to start chatting</p>
    </div>
  )
}