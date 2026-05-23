/**
 * utils/useChat.js
 * React hook that wraps the Django Channels WebSocket.
 *
 * Usage:
 *   const { messages, sendMessage, status } = useChat(roomId)
 */

import { useState, useEffect, useRef, useCallback } from 'react'

const WS_BASE = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws'

export function useChat(roomId) {
  const [messages, setMessages] = useState([])
  const [status, setStatus]     = useState('idle')  // idle | connecting | open | closed | error
  const wsRef = useRef(null)

  useEffect(() => {
    if (!roomId) return

    const token = localStorage.getItem('access')
    if (!token) return

    const url = `${WS_BASE}/chat/${roomId}/?token=${token}`
    setStatus('connecting')

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('open')
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'message') {
          setMessages(prev => [...prev, data])
        }
      } catch (_) {}
    }

    ws.onerror = () => setStatus('error')

    ws.onclose = () => {
      setStatus('closed')
      wsRef.current = null
    }

    return () => {
      ws.close()
    }
  }, [roomId])

  const sendMessage = useCallback((body) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ body }))
    }
  }, [])

  return { messages, sendMessage, status }
}