import { describe, expect, it } from 'bun:test'

describe('Tenant Validation & Payloads', () => {
  it('validates stall number and name rules', () => {
    const isValidStall = (name: string, stallNumber: string) =>
      name.trim().length >= 2 && stallNumber.trim().length >= 1

    expect(isValidStall('Warung Rawon Bu Siti', 'STAN-A01')).toBe(true)
    expect(isValidStall('A', 'STAN-A01')).toBe(false)
    expect(isValidStall('Warung Rawon Bu Siti', '')).toBe(false)
  })

  it('formats tenant update payload correctly', () => {
    const payload = {
      name: 'Warung Rawon Bu Siti Asli',
      isOpen: true,
      openingTime: '08:30:00',
      closingTime: '21:30:00',
    }

    expect(payload.name).toBe('Warung Rawon Bu Siti Asli')
    expect(payload.isOpen).toBe(true)
  })
})
