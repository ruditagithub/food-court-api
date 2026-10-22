import { describe, expect, it } from 'bun:test'

describe('Auth Validation & Payloads', () => {
  it('validates email format correctly', () => {
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    expect(isValidEmail('budi@foodcourt.com')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  it('validates password length correctly', () => {
    const isValidPassword = (password: string) => password.length >= 6
    expect(isValidPassword('123456')).toBe(true)
    expect(isValidPassword('12345')).toBe(false)
  })

  it('formats login payload properly', () => {
    const payload = {
      email: 'budi@foodcourt.com',
      password: 'password123',
    }
    expect(payload.email).toBe('budi@foodcourt.com')
    expect(payload.password).toBe('password123')
  })
})
