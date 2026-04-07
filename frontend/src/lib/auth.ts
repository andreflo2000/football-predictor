const API = process.env.NEXT_PUBLIC_API_URL || 'https://football-predictor-api.onrender.com'

export interface AuthUser {
  id: string
  email: string
  tier: 'free' | 'vip'
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('flopi_token')
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('flopi_user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function isVip(): boolean {
  return getUser()?.tier === 'vip'
}

export function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function register(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Eroare la înregistrare')
  _saveSession(data)
  return getUser()!
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Email sau parolă incorecte')
  _saveSession(data)
  return getUser()!
}

export function logout() {
  localStorage.removeItem('flopi_token')
  localStorage.removeItem('flopi_user')
  window.location.reload()
}

function _saveSession(data: { access_token: string; tier: string }) {
  localStorage.setItem('flopi_token', data.access_token)
  // Decode payload din JWT (fara librarie)
  try {
    const payload = JSON.parse(atob(data.access_token.split('.')[1]))
    localStorage.setItem('flopi_user', JSON.stringify({
      id:    payload.sub,
      email: payload.email,
      tier:  data.tier,
    }))
  } catch {
    localStorage.setItem('flopi_user', JSON.stringify({ tier: data.tier }))
  }
}
