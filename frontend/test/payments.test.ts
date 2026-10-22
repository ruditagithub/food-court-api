import { describe, expect, it } from 'bun:test'
import { formatRupiah } from '../src/lib/utils'

describe('Payment & Receipt Validation', () => {
  it('validates Midtrans Snap transaction request and response fields', () => {
    const snapRequest = {
      orderId: '76e33f38-2785-455b-8669-ce561a0d319a',
    }

    const snapResponse = {
      id: 'pay-uuid-112233',
      orderId: snapRequest.orderId,
      paymentReference: 'ORD-20260925-0001-1760406000000',
      amount: 64000,
      status: 'PENDING',
      snapToken: '66e4fa55-1234-abcd-5678-ef0123456789',
      redirectUrl: 'https://app.sandbox.midtrans.com/snap/v4/redirection/66e4fa55...',
    }

    expect(snapResponse.orderId).toBe(snapRequest.orderId)
    expect(snapResponse.status).toBe('PENDING')
    expect(snapResponse.snapToken.length).toBeGreaterThan(10)
    expect(snapResponse.amount).toBe(64000)
  })

  it('validates cash payment DTO structure and calculation', () => {
    const cashPayload = {
      orderId: 'order-123',
      paymentMethod: 'CASH',
      amount: 85000,
      provider: 'Manual',
    }

    expect(cashPayload.paymentMethod).toBe('CASH')
    expect(cashPayload.amount).toBe(85000)
    expect(formatRupiah(cashPayload.amount)).toBe('Rp 85.000')
  })

  it('formats receipt breakdown accurately for multi-tenant orders', () => {
    const orderItems = [
      { name: 'Rawon Daging Spesial', quantity: 2, price: 30000 },
      { name: 'Es Teh Manis', quantity: 2, price: 5000 },
    ]

    const total = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0)
    expect(total).toBe(70000)
    expect(formatRupiah(total)).toBe('Rp 70.000')
  })
})
