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

  it('validates menu options structure and non-empty names', () => {
    const isValidOption = (opt: { name: string; priceAdjustment: number }) =>
      opt.name.trim().length > 0 &&
      Number.isInteger(opt.priceAdjustment) &&
      opt.priceAdjustment >= 0

    expect(isValidOption({ name: 'Level 1 (Sedang)', priceAdjustment: 0 })).toBe(true)
    expect(isValidOption({ name: 'Ekstra Telur', priceAdjustment: 4000 })).toBe(true)
    expect(isValidOption({ name: '', priceAdjustment: 2000 })).toBe(false)
    expect(isValidOption({ name: '   ', priceAdjustment: 0 })).toBe(false)
    expect(isValidOption({ name: 'Diskon', priceAdjustment: -1000 })).toBe(false)
  })

  it('calculates total price with multiple menu options and quantity', () => {
    const calculateItemTotal = (
      basePrice: number,
      options: Array<{ priceAdjustment: number }>,
      quantity: number
    ) => {
      const optionsTotal = options.reduce((sum, opt) => sum + opt.priceAdjustment, 0)
      return (basePrice + optionsTotal) * quantity
    }

    // Base Rp 25.000 + Level 2 (+Rp 2.000) + Ekstra Telur (+Rp 4.000) = Rp 31.000 x 2 = Rp 62.000
    const itemTotal = calculateItemTotal(
      25000,
      [{ priceAdjustment: 2000 }, { priceAdjustment: 4000 }],
      2
    )
    expect(itemTotal).toBe(62000)

    // Base Rp 15.000 + Free option (0) = Rp 15.000 x 1 = Rp 15.000
    expect(calculateItemTotal(15000, [{ priceAdjustment: 0 }], 1)).toBe(15000)
  })

  it('differentiates composite cart items by menuId, sorted option IDs, and notes', () => {
    const getCartKey = (item: {
      menuId: string
      notes?: string
      selectedOptions?: Array<{ id: string }>
    }) => {
      const sortedOptIds = (item.selectedOptions || [])
        .map((o) => o.id)
        .sort()
        .join(',')
      return `${item.menuId}|${item.notes || ''}|${sortedOptIds}`
    }

    const itemA = {
      menuId: 'menu-1',
      notes: 'tanpa sambal',
      selectedOptions: [{ id: 'opt-2' }, { id: 'opt-1' }],
    }
    const itemASame = {
      menuId: 'menu-1',
      notes: 'tanpa sambal',
      selectedOptions: [{ id: 'opt-1' }, { id: 'opt-2' }],
    }
    const itemBDifferentNote = {
      menuId: 'menu-1',
      notes: 'ekstra sambal',
      selectedOptions: [{ id: 'opt-1' }, { id: 'opt-2' }],
    }
    const itemCDifferentOptions = {
      menuId: 'menu-1',
      notes: 'tanpa sambal',
      selectedOptions: [{ id: 'opt-1' }],
    }

    expect(getCartKey(itemA)).toBe(getCartKey(itemASame))
    expect(getCartKey(itemA)).not.toBe(getCartKey(itemBDifferentNote))
    expect(getCartKey(itemA)).not.toBe(getCartKey(itemCDifferentOptions))
  })

  it('correctly splits cart item portions into individual independent items', () => {
    const initialCart = [
      { menuId: 'menu-1', name: 'Nasi Goreng', quantity: 2, notes: '' },
      { menuId: 'menu-2', name: 'Es Teh', quantity: 1, notes: 'Manis' },
    ]

    // Split initialCart[0] into 2 portions
    const splitIndex = 0
    const target = initialCart[splitIndex]
    const expanded: typeof initialCart = []

    initialCart.forEach((it, idx) => {
      if (idx === splitIndex) {
        for (let i = 0; i < it.quantity; i++) {
          expanded.push({ ...it, quantity: 1, notes: it.notes || '' })
        }
      } else {
        expanded.push(it)
      }
    })

    expect(expanded.length).toBe(3)
    expect(expanded[0].quantity).toBe(1)
    expect(expanded[1].quantity).toBe(1)

    // Updating note on portion 1 must not alter portion 0
    expanded[1].notes = 'pedas sedang'
    expect(expanded[0].notes).toBe('')
    expect(expanded[1].notes).toBe('pedas sedang')

    // Deleting portion 1 by index must preserve portion 0
    const afterDelete = expanded.filter((_, idx) => idx !== 1)
    expect(afterDelete.length).toBe(2)
    expect(afterDelete[0].menuId).toBe('menu-1')
    expect(afterDelete[0].notes).toBe('')
    expect(afterDelete[1].menuId).toBe('menu-2')
  })

  it('determines whether quick add should intercept to open option selector modal', () => {
    const shouldOpenModal = (menu: { options?: Array<{ id: string }> }) =>
      !!(menu.options && menu.options.length > 0)

    expect(shouldOpenModal({ options: [{ id: 'opt-1' }] })).toBe(true)
    expect(shouldOpenModal({ options: [] })).toBe(false)
    expect(shouldOpenModal({})).toBe(false)
  })
})
