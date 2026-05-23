

// components/ChatWindow.jsx — thin wrapper used in Chat page
export function ChatWindowEmpty() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#887F8A' }}>
      <i className="bi bi-chat-heart" style={{ fontSize:'3rem', marginBottom:'.75rem' }} />
      <p>Select a conversation to start chatting</p>
    </div>
  )
}