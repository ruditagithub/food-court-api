import { describe, expect, it } from 'bun:test'
import { buildCompactIds } from '../db/seeds/06-orders-history.seed'
import {
  allocateSplitBillItems,
  BRANCH_TRAFFIC_WEIGHTS,
  BRANCH_TRAFFIC_WEIGHT_MAP,
  buildParetoWeights,
  createWeightedPicker,
  deterministicRankSort,
  distributeDayAcrossBranches,
} from '../db/seeds/helpers/real-case-distributions'

describe('Real-Case Seeder Distributions & Split-Bill Math', () => {
  it('should create Pareto weights where top 20% items receive significantly higher weight than bottom 20%', () => {
    const weights = buildParetoWeights(21, 1.15)
    expect(weights.length).toBe(21)

    const topFour = weights.slice(0, 4).reduce((a, b) => a + b, 0)
    const bottomFour = weights.slice(-4).reduce((a, b) => a + b, 0)
    expect(topFour).toBeGreaterThan(bottomFour * 4)
    expect(buildParetoWeights(0)).toEqual([])
  })

  it('should distribute daily orders across branches matching exact day total', () => {
    const branches = ['fc-1', 'fc-2', 'fc-3', 'fc-4', 'fc-5']
    const dist = distributeDayAcrossBranches(2437, branches, BRANCH_TRAFFIC_WEIGHTS)
    let sum = 0
    for (const v of dist.values()) sum += v
    expect(sum).toBe(2437)
    expect(dist.get('fc-2')!).toBeGreaterThan(dist.get('fc-5')!)

    expect(distributeDayAcrossBranches(100, []).size).toBe(0)

    // Verify BRANCH_TRAFFIC_WEIGHT_MAP preserves branch weights regardless of DB PK sort order
    const pkSortedBranches = [
      'fc-beachwalk-kuta-bali',
      'fc-grand-city-surabaya',
      'fc-grand-indonesia-jakarta',
      'fc-pakuwon-mall-jogja',
      'fc-paris-van-java-bandung',
    ]
    const mapped = distributeDayAcrossBranches(10000, pkSortedBranches)
    expect(BRANCH_TRAFFIC_WEIGHT_MAP['fc-grand-indonesia-jakarta']).toBe(0.32)
    expect(mapped.get('fc-grand-indonesia-jakarta')!).toBeGreaterThan(
      mapped.get('fc-beachwalk-kuta-bali')!
    )
    expect(mapped.get('fc-grand-city-surabaya')!).toBeGreaterThan(
      mapped.get('fc-pakuwon-mall-jogja')!
    )
  })

  it('should deterministically rank items by ID regardless of input ordering', () => {
    const a = [{ id: 'tnt-1' }, { id: 'tnt-2' }, { id: 'tnt-3' }, { id: 'tnt-4' }]
    const b = [{ id: 'tnt-4' }, { id: 'tnt-2' }, { id: 'tnt-1' }, { id: 'tnt-3' }]
    expect(deterministicRankSort(a, (x) => x.id)).toEqual(
      deterministicRankSort(b, (x) => x.id)
    )
  })

  it('should pick weighted items proportional to weights via O(log N) binary search', () => {
    const picker = createWeightedPicker(['A', 'B'], [0.9, 0.1])
    let countA = 0
    for (let i = 0; i < 1000; i++) {
      if (picker() === 'A') countA++
    }
    expect(countA).toBeGreaterThan(800)
    expect(() => createWeightedPicker([], [])).toThrow()
    expect(() => createWeightedPicker(['A'], [1, 2])).toThrow()
  })

  it('should split bill across participants with exact totalAmount and discountAmount reconciliation', () => {
    const items = [
      { id: 'oi-1', subtotal: 35000 },
      { id: 'oi-2', subtotal: 18000 },
      { id: 'oi-3', subtotal: 42000 },
      { id: 'oi-4', subtotal: 12000 },
    ]
    const subtotal = 107000
    const discount = 15000
    const discounted = subtotal - discount
    const serviceFee = Math.round(discounted * 0.03) // 2760
    const tax = Math.round(discounted * 0.1) // 9200
    const expectedTotal = discounted + tax + serviceFee // 103960

    const allocations = allocateSplitBillItems(items, 3, tax, serviceFee, discount)
    expect(allocations.length).toBe(3)

    const sumDue = allocations.reduce((s, a) => s + a.amountDue, 0)
    const sumDisc = allocations.reduce((s, a) => s + a.discountAmount, 0)
    const totalAllocatedItems = allocations.reduce((s, a) => s + a.itemAllocations.length, 0)

    expect(sumDue).toBe(expectedTotal)
    expect(sumDisc).toBe(discount)
    expect(totalAllocatedItems).toBe(items.length)
    for (const alloc of allocations) {
      expect(alloc.itemAllocations.length).toBeGreaterThan(0)
      expect(alloc.amountDue).toBeGreaterThan(0)
    }
  })

  it('should handle split-bill boundary cases (participantCount > items, single participant)', () => {
    const twoItems = [
      { id: 'oi-1', subtotal: 25000 },
      { id: 'oi-2', subtotal: 15000 },
    ]
    const alloc = allocateSplitBillItems(twoItems, 4, 4000, 1200, 0)
    expect(alloc.length).toBe(2)
    expect(alloc.reduce((s, a) => s + a.amountDue, 0)).toBe(45200)
    expect(alloc.reduce((s, a) => s + a.discountAmount, 0)).toBe(0)

    const single = allocateSplitBillItems(twoItems, 1, 3500, 1050, 5000)
    expect(single.length).toBe(1)
    expect(single[0].amountDue).toBe(39550)
    expect(single[0].discountAmount).toBe(5000)

    // 100% discount boundary case
    const zeroDue = allocateSplitBillItems(twoItems, 2, 0, 0, 40000)
    expect(zeroDue.reduce((s, a) => s + a.amountDue, 0)).toBe(0)
    expect(zeroDue.reduce((s, a) => s + a.discountAmount, 0)).toBe(40000)
  })

  it('should generate compact deterministic IDs safely under varchar(36) at 10M scale', () => {
    const ids = buildCompactIds(10000000)
    expect(ids.sessionId.length).toBeLessThanOrEqual(20)
    expect(ids.orderId.length).toBeLessThanOrEqual(20)
    expect(ids.tenantOrderId(2).length).toBeLessThanOrEqual(24)
    expect(ids.orderItemId(2, 3).length).toBeLessThanOrEqual(26)
    expect(ids.paymentGroupId(4).length).toBeLessThanOrEqual(24)
    expect(ids.paymentGroupItemId(2, 3).length).toBeLessThanOrEqual(28)
    expect(ids.orderItemOptionId(2, 3).length).toBeLessThanOrEqual(28)
    expect(ids.participantId(4).length).toBeLessThanOrEqual(24)
    expect(ids.kitchenQueueId(2).length).toBeLessThanOrEqual(24)
    expect(ids.paymentId(4).length).toBeLessThanOrEqual(24)
    expect(ids.orderStatusLogId(2).length).toBeLessThanOrEqual(24)
  })
})
