import { describe, expect, it } from 'bun:test'

describe('Menu Validation & Rupiah Calculation', () => {
  it('validates menu item price integer and stock', () => {
    const isValidMenu = (name: string, price: number, stock: number) =>
      name.trim().length >= 2 && Number.isInteger(price) && price >= 0 && stock >= 0

    expect(isValidMenu('Rawon Komplit Empal', 32000, 25)).toBe(true)
    expect(isValidMenu('Es Teh', 5000, 0)).toBe(true)
    expect(isValidMenu('A', 32000, 10)).toBe(false)
    expect(isValidMenu('Rawon', -100, 10)).toBe(false)
  })

  it('calculates item subtotal correctly with quantity', () => {
    const calculateSubtotal = (price: number, quantity: number) => price * quantity
    expect(calculateSubtotal(32000, 3)).toBe(96000)
    expect(calculateSubtotal(15000, 1)).toBe(15000)
  })
})
