/**
 * API Client for Food Court Backend
 * Base URL from environment variable
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface ApiError {
  success: false
  error: string
  message: string
}

export interface ApiResponse<T> {
  data?: T
  message?: string
}

/**
 * Generic fetch wrapper with auth token support
 */
export async function apiFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: unknown
    token?: string
  } = {}
): Promise<T> {
  const { method = 'GET', body, token } = options

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${API_BASE_URL}${path}`

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    // Backend error response: { success: false, error, message }
    const error = data as ApiError
    throw new Error(error.message || 'Request failed')
  }

  return data as T
}

/**
 * Get auth token from localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem('token')
}

/**
 * Save auth token to localStorage
 */
export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

/**
 * Remove auth token from localStorage
 */
export function clearToken(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}
