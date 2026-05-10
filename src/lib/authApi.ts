import { apiFetch, setToken, clearToken } from './api'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  role: string
}

export type LoginResponse = {
  token: string
  user: AuthUser
  permissions: string[]
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data
}

export async function logoutApi(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {/* silent */})
  clearToken()
}

export async function fetchMe(): Promise<{ user: AuthUser; permissions: string[] }> {
  return apiFetch('/api/auth/me')
}

export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch('/api/users/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}
