const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

// ─── Base fetch wrapper ───────────────────────────────────────

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('access')

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })

  // Auto-refresh token on 401
  if (res.status === 401) {
    const refreshed = await refreshToken()
    if (refreshed) {
      headers.Authorization = `Bearer ${localStorage.getItem('access')}`
      const retry = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })
      if (!retry.ok) throw await retry.json()
      return retry.status === 204 ? null : retry.json()
    } else {
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
      window.location.href = '/login'
      return
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network error' }))
    throw err
  }

  return res.status === 204 ? null : res.json()
}

async function refreshToken() {
  const refresh = localStorage.getItem('refresh')
  if (!refresh) return false
  const res = await fetch(`${BASE_URL}/auth/refresh/`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ refresh }),
  })
  if (!res.ok) return false
  const data = await res.json()
  localStorage.setItem('access', data.access)
  return true
}

// ─── Auth ─────────────────────────────────────────────────────

export const register = (data) =>
  request('/auth/register/', { method: 'POST', body: JSON.stringify(data) })

export const login = (email, password) =>
  request('/auth/login/', { method: 'POST', body: JSON.stringify({ email, password }) })

export const getMe = () =>
  request('/profiles/me/')

// ─── Profiles ─────────────────────────────────────────────────

export const getProfiles = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return request(`/profiles/${qs ? '?' + qs : ''}`)
}

export const getProfile = (slug) =>
  request(`/profiles/${slug}/`)

export const updateProfile = (formData) =>
  request('/profiles/me/', { method: 'PATCH', body: formData })

export const uploadPhoto = (formData) =>
  request('/profiles/me/photos/', { method: 'POST', body: formData })

export const deletePhoto = (id) =>
  request(`/profiles/me/photos/${id}/`, { method: 'DELETE' })

export const likeProfile = (slug, isSuper = false) =>
  request(`/profiles/${slug}/like/`, {
    method: 'POST',
    body  : JSON.stringify({ super: isSuper }),
  })

// ─── Packages ─────────────────────────────────────────────────

export const getPackages = () =>
  request('/packages/')

export const subscribe = (packageId, phone) =>
  request('/packages/subscribe/', {
    method: 'POST',
    body  : JSON.stringify({ package_id: packageId, phone }),
  })

export const boostProfile = (phone) =>
  request('/boost/', { method: 'POST', body: JSON.stringify({ phone }) })

export const getPayments = () =>
  request('/payments/')

// ─── Chat ─────────────────────────────────────────────────────

export const getChatRooms = () =>
  request('/chat/rooms/')

export const startChat = (manId) =>
  request('/chat/start/', { method: 'POST', body: JSON.stringify({ man_id: manId }) })

export const getMessages = (roomId) =>
  request(`/chat/rooms/${roomId}/messages/`)

export const sendMessage = (roomId, formData) =>
  request(`/chat/rooms/${roomId}/messages/`, { method: 'POST', body: formData })

// ─── Feed / Posts ─────────────────────────────────────────────

export const getPosts = () =>
  request('/feed/posts/')

export const createPost = (formData) =>
  request('/feed/posts/', { method: 'POST', body: formData })

export const likePost = (postId) =>
  request(`/feed/posts/${postId}/like/`, { method: 'POST' })

export const deletePost = (postId) =>
  request(`/feed/posts/${postId}/`, { method: 'DELETE' })

// ─── Notifications ────────────────────────────────────────────

export const getNotifications = () =>
  request('/notifications/')

export const markNotificationsRead = () =>
  request('/notifications/read-all/', { method: 'POST' })

// ─── Dashboard ────────────────────────────────────────────────

export const getDashboard = () =>
  request('/dashboard/')