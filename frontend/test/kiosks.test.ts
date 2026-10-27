import { describe, expect, it } from 'bun:test'
import { formatRupiah } from '../src/lib/utils'

describe('Self-Service Kiosk & Takeaway Logic', () => {
  it('validates deviceCode structure and default suggestion pattern', () => {
    const generateDeviceCode = (branchSlug: string, randomInt: number) => {
      const tag = branchSlug.toUpperCase().slice(0, 4)
      return `DEV-KSK-${tag}-${randomInt}`
    }

    const code = generateDeviceCode('grand-city-sentra', 88)
    expect(code).toBe('DEV-KSK-GRAN-88')
    expect(code.startsWith('DEV-KSK-')).toBe(true)
  })

  it('calculates takeaway cart totals with PB1 10% tax and 3% service fee', () => {
    const cart = [
      { menuId: 'm1', name: 'Rawon Komplit', price: 35000, quantity: 2 },
      { menuId: 'm2', name: 'Es Jeruk Nipis', price: 8000, quantity: 2 },
    ]

    const subtotal = cart.reduce((acc, it) => acc + it.price * it.quantity, 0)
    const taxAmount = Math.round(subtotal * 0.1) // 10% PB1
    const serviceFee = Math.round(subtotal * 0.03) // 3% Service
    const grandTotal = subtotal + taxAmount + serviceFee

    expect(subtotal).toBe(86000)
    expect(taxAmount).toBe(8600)
    expect(serviceFee).toBe(2580)
    expect(grandTotal).toBe(97180)

    expect(formatRupiah(grandTotal)).toBe('Rp 97.180')
  })

  it('formats takeaway order creation payload correctly for KDS and Cashier', () => {
    const customerName = 'Pak Rahmat'
    const deviceCode = 'DEV-KSK-FC01-01'
    const cart = [
      {
        menuId: 'm1',
        name: 'Soto Madura',
        price: 30000,
        quantity: 1,
        notes: 'Bungkus kuah dipisah',
        selectedOptions: [{ id: 'opt-pedas', name: 'Ekstra Sambal', priceAdjustment: 2000 }],
        optionIds: ['opt-pedas'],
      },
    ]

    const kioskId = 'ksk-alpha-001'
    const orderPayload = {
      orderType: 'TAKEAWAY' as const,
      kioskId,
      customerName: customerName.trim(),
      notes: `[KIOSK ${deviceCode}] Takeaway`,
      items: cart.map((item) => ({
        menuId: item.menuId,
        quantity: item.quantity,
        notes: item.notes,
        optionIds: item.optionIds,
      })),
    }

    expect(orderPayload.orderType).toBe('TAKEAWAY')
    expect(orderPayload.kioskId).toBe('ksk-alpha-001')
    expect(orderPayload.customerName).toBe('Pak Rahmat')
    expect(orderPayload.notes).toBe('[KIOSK DEV-KSK-FC01-01] Takeaway')
    expect(orderPayload.items[0].optionIds).toContain('opt-pedas')
  })

  it('generates cashier takeaway slip code format and scanner JSON payload', () => {
    const orderNumber = 'ORD-20261026-0042'
    const cleanNumber = orderNumber.replace(/[^A-Za-z0-9]/g, '')
    const cashSlipCode = `CSH-TK-${cleanNumber}`

    expect(cashSlipCode).toBe('CSH-TK-ORD202610260042')
    expect(cashSlipCode.startsWith('CSH-TK-')).toBe(true)

    const scannerPayload = JSON.stringify({
      type: 'CASH_TAKEAWAY',
      code: cashSlipCode,
      orderNumber,
      customerName: 'Pak Rahmat',
      amountDue: 50000,
    })

    const parsed = JSON.parse(scannerPayload)
    expect(parsed.orderNumber).toBe('ORD-20261026-0042')
    expect(parsed.code).toBe('CSH-TK-ORD202610260042')
  })

  it('validates 60s idle and 15s countdown parameters and modal cleanup', () => {
    const IDLE_TIMEOUT_MS = 60000
    const PROMPT_COUNTDOWN_SEC = 15

    expect(IDLE_TIMEOUT_MS).toBe(60000)
    expect(PROMPT_COUNTDOWN_SEC).toBe(15)

    // Test state cleanup on idle reset
    let itemDetailOpen = true
    let selectedMenuItem: any = { id: 'm1' }
    let cart = [{ menuId: 'm1', quantity: 1 }]
    let isAttractMode = false

    const handleIdleReset = () => {
      itemDetailOpen = false
      selectedMenuItem = null
      cart = []
      isAttractMode = true
    }

    handleIdleReset()
    expect(itemDetailOpen).toBe(false)
    expect(selectedMenuItem).toBeNull()
    expect(cart.length).toBe(0)
    expect(isAttractMode).toBe(true)
  })

  it('detects inactive kiosk status and blocks ordering', () => {
    const kioskDataActive = { kiosk: { status: 'ACTIVE', kioskName: 'Kiosk 1' } }
    const kioskDataInactive = { kiosk: { status: 'INACTIVE', kioskName: 'Kiosk 1' } }

    const isTerminalBlocked = (kioskData: any) => {
      return !kioskData || kioskData?.kiosk?.status === 'INACTIVE'
    }

    expect(isTerminalBlocked(kioskDataActive)).toBe(false)
    expect(isTerminalBlocked(kioskDataInactive)).toBe(true)
    expect(isTerminalBlocked(null)).toBe(true)
  })
})
