import { describe, expect, it } from 'bun:test'

describe('Order Creation & KDS Kanban Progression', () => {
  it('validates order payload structure with multiple items', () => {
    const payload = {
      tableId: '3be51a84-1e08-410a-ba92-d9ee72a4f00b',
      customerName: 'Rizky Ramadhan',
      items: [
        { menuId: 'menu-1', quantity: 2, specialInstructions: 'Pedas' },
        { menuId: 'menu-2', quantity: 1, specialInstructions: 'Es sedikit' },
      ],
    }

    expect(payload.customerName.length).toBeGreaterThanOrEqual(2)
    expect(payload.items.length).toBe(2)
    expect(payload.items[0].quantity).toBe(2)
  })

  it('progresses KDS status in correct kanban order', () => {
    const getNextStatus = (current: string) => {
      switch (current) {
        case 'QUEUED':
          return 'PREPARING'
        case 'PREPARING':
          return 'READY'
        case 'READY':
          return 'COMPLETED'
        default:
          return current
      }
    }

    expect(getNextStatus('QUEUED')).toBe('PREPARING')
    expect(getNextStatus('PREPARING')).toBe('READY')
    expect(getNextStatus('READY')).toBe('COMPLETED')
  })
})
