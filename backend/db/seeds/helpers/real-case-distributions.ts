/**
 * Real-Case Distributions for Food Court Seeding:
 * - Branch traffic shares (Grand Indonesia Jakarta & Grand City Surabaya higher than regional malls)
 * - Zipf / Pareto 80-20 popularity curve for tenants & menu items
 * - Exact Rupiah-accurate Split-Bill allocation across multi-participant dining sessions
 */

// Order matches foodCourtConfigs: Surabaya, Jakarta GI, Bandung PVJ, Bali Beachwalk, Jogja Pakuwon
export const BRANCH_TRAFFIC_WEIGHTS: readonly number[] = [0.25, 0.32, 0.18, 0.15, 0.10]

export const BRANCH_TRAFFIC_WEIGHT_MAP: Readonly<Record<string, number>> = {
  'fc-grand-city-surabaya': 0.25,
  'fc-grand-indonesia-jakarta': 0.32,
  'fc-paris-van-java-bandung': 0.18,
  'fc-beachwalk-kuta-bali': 0.15,
  'fc-pakuwon-mall-jogja': 0.10,
}

function hashId32(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Deterministically permutes items by ID hash so Pareto popularity stays realistic
 * (non-alphabetical) and identical across --resume runs.
 */
export function deterministicRankSort<T>(
  items: readonly T[],
  getId: (item: T) => string
): T[] {
  return [...items].sort((a, b) => hashId32(getId(a)) - hashId32(getId(b)))
}

export function buildParetoWeights(count: number, exponent = 1.15): number[] {
  if (count <= 0) return []
  const weights: number[] = new Array(count)
  for (let i = 0; i < count; i++) {
    weights[i] = 1 / Math.pow(i + 1, exponent)
  }
  return weights
}

export function createWeightedPicker<T>(
  items: readonly T[],
  weights: readonly number[]
): () => T {
  if (items.length === 0) {
    throw new Error('createWeightedPicker: items array must not be empty')
  }
  if (items.length !== weights.length) {
    throw new Error('createWeightedPicker: items and weights length mismatch')
  }

  const cumulative = new Float64Array(items.length)
  let total = 0
  for (let i = 0; i < items.length; i++) {
    total += Math.max(0, weights[i])
    cumulative[i] = total
  }

  if (total <= 0) {
    return () => items[Math.floor(Math.random() * items.length)]
  }

  return () => {
    const r = Math.random() * total
    let lo = 0
    let hi = cumulative.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (r <= cumulative[mid]) {
        hi = mid
      } else {
        lo = mid + 1
      }
    }
    return items[lo]
  }
}

export function distributeDayAcrossBranches(
  dayOrders: number,
  branchIds: readonly string[],
  weights?: readonly number[]
): Map<string, number> {
  const result = new Map<string, number>()
  if (branchIds.length === 0) return result

  const effectiveWeights = weights
    ? branchIds.map((_, idx) => weights[idx] ?? 1 / branchIds.length)
    : branchIds.map((id, idx) => BRANCH_TRAFFIC_WEIGHT_MAP[id] ?? BRANCH_TRAFFIC_WEIGHTS[idx] ?? 1 / branchIds.length)
  const weightSum = effectiveWeights.reduce((a, b) => a + b, 0)

  const exact = effectiveWeights.map((w) => {
    const jitter = 0.94 + Math.random() * 0.12
    return (w / weightSum) * jitter
  })
  const normSum = exact.reduce((a, b) => a + b, 0)

  const counts = exact.map((w) => Math.floor((w / normSum) * dayOrders))
  let rem = dayOrders - counts.reduce((a, b) => a + b, 0)

  const fracOrder = exact
    .map((w, idx) => ({ idx, frac: (w / normSum) * dayOrders - counts[idx] }))
    .sort((a, b) => b.frac - a.frac)

  for (let i = 0; i < fracOrder.length && rem > 0; i++) {
    counts[fracOrder[i].idx]++
    rem--
  }

  for (let i = 0; i < branchIds.length; i++) {
    result.set(branchIds[i], counts[i])
  }
  return result
}

export interface SplitBillAllocation {
  participantIndex: number
  itemAllocations: { orderItemId: string; allocatedAmount: number }[]
  amountDue: number
  discountAmount: number
}

/**
 * Allocates order_items across 1..K participants with 100% exact totalAmount & discountAmount reconciliation.
 */
export function allocateSplitBillItems(
  items: readonly { id: string; subtotal: number }[],
  participantCount: number,
  orderTax: number,
  orderServiceFee: number,
  orderDiscount: number
): SplitBillAllocation[] {
  const effectiveCount = Math.max(1, Math.min(participantCount, items.length))
  const masterSubtotal = items.reduce((sum, it) => sum + it.subtotal, 0)
  const totalAmount = Math.max(0, masterSubtotal - orderDiscount) + orderTax + orderServiceFee

  const buckets: {
    itemAllocations: { orderItemId: string; allocatedAmount: number }[]
    subtotal: number
  }[] = Array.from({ length: effectiveCount }, () => ({
    itemAllocations: [],
    subtotal: 0,
  }))

  // Round-robin assignment ensures each participant gets at least 1 item
  for (let i = 0; i < items.length; i++) {
    const pIdx = i % effectiveCount
    buckets[pIdx].itemAllocations.push({
      orderItemId: items[i].id,
      allocatedAmount: items[i].subtotal,
    })
    buckets[pIdx].subtotal += items[i].subtotal
  }

  if (effectiveCount === 1 || masterSubtotal <= 0) {
    return [
      {
        participantIndex: 0,
        itemAllocations: buckets[0].itemAllocations,
        amountDue: totalAmount,
        discountAmount: orderDiscount,
      },
    ]
  }

  const netExtras = orderTax + orderServiceFee - orderDiscount
  const results: SplitBillAllocation[] = new Array(effectiveCount)
  let allocatedDueSum = 0
  let allocatedDiscountSum = 0

  for (let p = 1; p < effectiveCount; p++) {
    const share = buckets[p].subtotal / masterSubtotal
    const pExtra = Math.round(netExtras * share)
    const pDiscount = Math.min(
      Math.max(0, orderDiscount - allocatedDiscountSum),
      Math.max(0, Math.round(orderDiscount * share))
    )
    const pDue = Math.min(
      Math.max(0, totalAmount - allocatedDueSum),
      Math.max(0, buckets[p].subtotal + pExtra)
    )

    allocatedDueSum += pDue
    allocatedDiscountSum += pDiscount

    results[p] = {
      participantIndex: p,
      itemAllocations: buckets[p].itemAllocations,
      amountDue: pDue,
      discountAmount: pDiscount,
    }
  }

  // Host (index 0) receives rounding remainder for 100% exact reconciliation
  results[0] = {
    participantIndex: 0,
    itemAllocations: buckets[0].itemAllocations,
    amountDue: Math.max(0, totalAmount - allocatedDueSum),
    discountAmount: Math.max(0, orderDiscount - allocatedDiscountSum),
  }

  return results
}
