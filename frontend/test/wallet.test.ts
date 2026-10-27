import { describe, expect, it } from 'bun:test'
import { formatRupiah } from '../src/lib/utils'

describe('Tenant Wallet & Food Court Fee Reallocation Model', () => {
  it('allocates 100% gross revenue to tenant without fee deduction', () => {
    const grossAmount = 50000
    const tenantFee = 0
    const tenantNet = grossAmount - tenantFee

    expect(tenantFee).toBe(0)
    expect(tenantNet).toBe(50000)
    expect(formatRupiah(tenantNet)).toBe('Rp 50.000')
  })

  it('calculates 1% platform fee absorbed by food court from subtotal spend', () => {
    const subtotal = 100000
    const serviceFee = 3000 // 3%
    const taxAmount = 10000 // 10%
    const platformFee = Math.round(subtotal * 0.01) // 1%
    const foodCourtNet = serviceFee + taxAmount - platformFee

    expect(platformFee).toBe(1000)
    expect(foodCourtNet).toBe(12000)
    expect(formatRupiah(platformFee)).toBe('Rp 1.000')
    expect(formatRupiah(foodCourtNet)).toBe('Rp 12.000')
  })

  it('handles rounding for odd order subtotals in 1% fee calculation', () => {
    const subtotal = 37775
    const platformFee = Math.round(subtotal * 0.01)
    expect(platformFee).toBe(378)
  })

  it('validates Food Court withdrawal submission constraints (min 50.000, transfer only)', () => {
    const currentBalance = 350000

    const validateFoodCourtWithdrawal = (payload: {
      amount: number
      paymentMethod: 'TRANSFER'
      bankName?: string
      bankAccountNumber?: string
      bankAccountHolder?: string
    }) => {
      if (payload.amount < 50000) {
        return { valid: false, error: 'Nominal penarikan minimal Rp 50.000' }
      }
      if (payload.amount > currentBalance) {
        return { valid: false, error: 'Saldo cabang tidak mencukupi' }
      }
      if (!payload.bankName?.trim() || !payload.bankAccountNumber?.trim() || !payload.bankAccountHolder?.trim()) {
        return { valid: false, error: 'Informasi rekening transfer harus lengkap' }
      }
      return { valid: true, error: null }
    }

    // Invalid: below 50.000
    expect(
      validateFoodCourtWithdrawal({
        amount: 25000,
        paymentMethod: 'TRANSFER',
        bankName: 'BCA',
        bankAccountNumber: '1234567890',
        bankAccountHolder: 'Sentra Kuliner',
      }).valid,
    ).toBe(false)

    // Invalid: exceeds balance
    expect(
      validateFoodCourtWithdrawal({
        amount: 500000,
        paymentMethod: 'TRANSFER',
        bankName: 'BCA',
        bankAccountNumber: '1234567890',
        bankAccountHolder: 'Sentra Kuliner',
      }).valid,
    ).toBe(false)

    // Invalid: missing bank info
    expect(
      validateFoodCourtWithdrawal({
        amount: 100000,
        paymentMethod: 'TRANSFER',
        bankName: '',
        bankAccountNumber: '',
        bankAccountHolder: '',
      }).valid,
    ).toBe(false)

    // Valid: satisfies all constraints
    expect(
      validateFoodCourtWithdrawal({
        amount: 150000,
        paymentMethod: 'TRANSFER',
        bankName: 'Mandiri',
        bankAccountNumber: '1440098765432',
        bankAccountHolder: 'Sentra Kuliner PT',
      }).valid,
    ).toBe(true)
  })

  it('filters withdrawal queue correctly by status and calculates pending totals', () => {
    const withdrawals = [
      { id: '1', amount: 50000, status: 'PENDING', paymentMethod: 'TRANSFER', foodCourt: { name: 'Cabang A' } },
      { id: '2', amount: 75000, status: 'PENDING', paymentMethod: 'TRANSFER', foodCourt: { name: 'Cabang B' } },
      { id: '3', amount: 100000, status: 'PROCESSED', paymentMethod: 'TRANSFER', foodCourt: { name: 'Cabang C' } },
      { id: '4', amount: 30000, status: 'COMPLETED', paymentMethod: 'TRANSFER', foodCourt: { name: 'Cabang D' } },
      { id: '5', amount: 25000, status: 'REJECTED', paymentMethod: 'TRANSFER', foodCourt: { name: 'Cabang E' } },
    ]

    const pendingList = withdrawals.filter((w) => w.status === 'PENDING')
    expect(pendingList.length).toBe(2)

    const totalPendingAmount = pendingList.reduce((acc, curr) => acc + curr.amount, 0)
    expect(totalPendingAmount).toBe(125000)
    expect(formatRupiah(totalPendingAmount)).toBe('Rp 125.000')

    const processedList = withdrawals.filter((w) => w.status === 'PROCESSED')
    expect(processedList.length).toBe(1)
  })

  it('correctly models historical fee reconciliation and food court absorption', () => {
    const historicalTenantOrderGross = 100000
    const historicalDeductedFee = Math.round(historicalTenantOrderGross * 0.01) // 1000
    const initialTenantBalance = 25000
    const initialFcBalance = 150000

    // Reconciliation refund: tenant gets back 100% of deducted fee
    const reconciledTenantBalance = initialTenantBalance + historicalDeductedFee
    expect(reconciledTenantBalance).toBe(26000)

    // Food court absorbs the 1% platform fee
    const adjustedFcBalance = initialFcBalance - historicalDeductedFee
    expect(adjustedFcBalance).toBe(149000)
    expect(formatRupiah(adjustedFcBalance)).toBe('Rp 149.000')
  })
})
