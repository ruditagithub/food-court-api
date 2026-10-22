import { describe, expect, it } from 'bun:test'

describe('Table Status & QR Logic', () => {
  it('validates table capacity and number', () => {
    const isValidTable = (tableNumber: string, capacity: number) =>
      tableNumber.trim().length >= 1 && Number.isInteger(capacity) && capacity >= 1

    expect(isValidTable('T-01', 4)).toBe(true)
    expect(isValidTable('VIP-1', 10)).toBe(true)
    expect(isValidTable('', 4)).toBe(false)
    expect(isValidTable('T-01', 0)).toBe(false)
  })

  it('determines table access based on status', () => {
    const canCustomerAccess = (status: 'available' | 'occupied' | 'disabled') =>
      status !== 'disabled'

    expect(canCustomerAccess('available')).toBe(true)
    expect(canCustomerAccess('occupied')).toBe(true)
    expect(canCustomerAccess('disabled')).toBe(false)
  })
})
