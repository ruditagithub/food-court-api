/**
 * Realistic Chronological Date, Seasonality & Peak Hours Generator
 * Default window: last 450 days ending at execution time so "today/7d/30d/year" analytics stay populated.
 */

export const DEFAULT_SIMULATION_DAYS = 450

export function getSeedDateRange(
  days = DEFAULT_SIMULATION_DAYS,
  endDate = new Date()
): { startDate: Date; endDate: Date } {
  const end = new Date(endDate.getTime())
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
  start.setHours(0, 0, 0, 0)
  return { startDate: start, endDate: end }
}

const initialRange = getSeedDateRange(DEFAULT_SIMULATION_DAYS)
export const SEED_START_DATE = initialRange.startDate
export const SEED_END_DATE = initialRange.endDate

export interface DailyOrderBucket {
  dayIndex: number
  dateStr: string
  dayStart: Date
  targetOrders: number
}

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function computeDayWeight(day: Date, dayIndex: number, totalDays: number): number {
  // 1. Gradual business growth from 0.72x at start to 1.28x near present
  const progress = totalDays > 1 ? dayIndex / (totalDays - 1) : 1
  const growthFactor = 0.72 + 0.56 * progress

  // 2. Day-of-week pattern (Fri-Sun significantly busier)
  const dow = day.getDay() // 0 = Sun, 6 = Sat
  let dowFactor = 0.85
  if (dow === 5) dowFactor = 1.25
  else if (dow === 6) dowFactor = 1.50
  else if (dow === 0) dowFactor = 1.45

  // 3. Payday lift (25th through 2nd of month)
  const dom = day.getDate()
  const paydayFactor = dom >= 25 || dom <= 2 ? 1.22 : 1.0

  // 4. Holiday season lift (late Dec / early Jan & Jun-Jul school holidays)
  const month = day.getMonth() + 1
  let holidayFactor = 1.0
  if ((month === 12 && dom >= 22) || (month === 1 && dom <= 5)) {
    holidayFactor = 1.32
  } else if (month === 6 || month === 7) {
    holidayFactor = 1.12
  }

  // 5. Natural daily variation (+/- 10%)
  const dailyNoise = 0.90 + Math.random() * 0.20

  return growthFactor * dowFactor * paydayFactor * holidayFactor * dailyNoise
}

/**
 * Allocates totalOrders chronologically from startDate to endDate such that SUM(targetOrders) === totalOrders.
 */
export function buildDailyOrderPlan(
  totalOrders: number,
  startDate = SEED_START_DATE,
  endDate = SEED_END_DATE
): DailyOrderBucket[] {
  if (totalOrders <= 0) return []

  const cursor = new Date(startDate.getTime())
  cursor.setHours(0, 0, 0, 0)

  const endDayStart = new Date(endDate.getTime())
  endDayStart.setHours(0, 0, 0, 0)

  const days: Date[] = []
  while (cursor.getTime() <= endDayStart.getTime()) {
    days.push(new Date(cursor.getTime()))
    cursor.setDate(cursor.getDate() + 1)
  }

  if (days.length === 0) {
    days.push(new Date(endDayStart.getTime()))
  }

  const weights = days.map((d, idx) => computeDayWeight(d, idx, days.length))

  // Scale final day proportionally if execution happens mid-day
  const endHourFraction = Math.min(
    1,
    Math.max(0.15, (endDate.getHours() - 8) / 14)
  )
  weights[weights.length - 1] *= endHourFraction

  const weightSum = weights.reduce((acc, w) => acc + w, 0)
  const exactCounts = weights.map((w) => (w / weightSum) * totalOrders)
  const floorCounts = exactCounts.map((c) => Math.floor(c))

  let remaining = totalOrders - floorCounts.reduce((acc, c) => acc + c, 0)
  const remainders = exactCounts
    .map((c, idx) => ({ idx, frac: c - floorCounts[idx] }))
    .sort((a, b) => b.frac - a.frac)

  for (let i = 0; i < remainders.length && remaining > 0; i++) {
    floorCounts[remainders[i].idx]++
    remaining--
  }

  return days.map((dayStart, dayIndex) => ({
    dayIndex,
    dateStr: formatDateKey(dayStart),
    dayStart,
    targetOrders: floorCounts[dayIndex],
  }))
}

/**
 * Generates a realistic food court timestamp within a single calendar day (lunch & dinner rush curve).
 */
export function generateTimeInDay(dayStart: Date, maxAllowedTime?: Date): Date {
  const d = new Date(dayStart.getTime())
  const roll = Math.random()
  let hour: number
  let minute: number

  if (roll < 0.10) {
    // Breakfast / Brunch (09:30 - 11:29)
    hour = getRandomInt(9, 11)
    minute = hour === 9 ? getRandomInt(30, 59) : hour === 11 ? getRandomInt(0, 29) : getRandomInt(0, 59)
  } else if (roll < 0.52) {
    // Lunch Rush (11:30 - 13:59) -> 42%
    hour = getRandomInt(11, 13)
    minute = hour === 11 ? getRandomInt(30, 59) : getRandomInt(0, 59)
  } else if (roll < 0.62) {
    // Afternoon / Coffee (14:00 - 17:29) -> 10%
    hour = getRandomInt(14, 17)
    minute = hour === 17 ? getRandomInt(0, 29) : getRandomInt(0, 59)
  } else {
    // Dinner Rush (17:30 - 21:29) -> 38%
    hour = getRandomInt(17, 21)
    minute = hour === 17 ? getRandomInt(30, 59) : hour === 21 ? getRandomInt(0, 29) : getRandomInt(0, 59)
  }

  const second = getRandomInt(0, 59)
  const ms = getRandomInt(0, 999)
  d.setHours(hour, minute, second, ms)

  if (maxAllowedTime && d.getTime() > maxAllowedTime.getTime()) {
    const startMs = dayStart.getTime()
    const maxMs = Math.max(startMs, maxAllowedTime.getTime())
    const openMs = startMs + 9.5 * 3600000
    const clampFloor = maxMs > openMs ? openMs : startMs
    const span = Math.max(1, maxMs - clampFloor)
    return new Date(clampFloor + Math.floor(Math.random() * span))
  }

  return d
}

/**
 * Backward-compatible helper for random dates following food court rush hours.
 */
export function generateRandomOrderDate(
  start = SEED_START_DATE,
  end = SEED_END_DATE
): Date {
  const startMs = start.getTime()
  const endMs = end.getTime()
  let chosenMs = startMs + Math.random() * (endMs - startMs)
  const candidate = new Date(chosenMs)
  const dayOfWeek = candidate.getDay()

  if (dayOfWeek >= 1 && dayOfWeek <= 5 && Math.random() < 0.25) {
    chosenMs = startMs + Math.random() * (endMs - startMs)
  }

  const day = new Date(chosenMs)
  day.setHours(0, 0, 0, 0)
  const generated = generateTimeInDay(day, end)

  if (generated.getTime() < startMs) {
    return new Date(startMs + Math.floor(Math.random() * Math.max(1, endMs - startMs)))
  }
  return generated
}
