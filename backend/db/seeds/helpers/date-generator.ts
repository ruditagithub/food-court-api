/**
 * Realistic Date & Peak Hours Generator for Food Court Seeding
 * Range: August 1, 2025 -> October 24, 2026 (~14.5 months)
 */

export const SEED_START_DATE = new Date('2025-08-01T08:00:00.000Z')
export const SEED_END_DATE = new Date('2026-10-24T21:00:00.000Z')

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Returns a random date between startDate and endDate with realistic time-of-day curve
 */
export function generateRandomOrderDate(
  start = SEED_START_DATE,
  end = SEED_END_DATE
): Date {
  const startMs = start.getTime()
  const endMs = end.getTime()

  // 1. Pick a random day with slight weekend bias
  let chosenMs = startMs + Math.random() * (endMs - startMs)
  const candidate = new Date(chosenMs)
  const dayOfWeek = candidate.getDay() // 0 = Sunday, 6 = Saturday

  // If weekday, 25% chance to re-roll to give weekends higher order density
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && Math.random() < 0.25) {
    chosenMs = startMs + Math.random() * (endMs - startMs)
  }

  const d = new Date(chosenMs)

  // 2. Pick realistic hour based on Food Court traffic pattern
  // 42% Lunch (11:30 - 14:00)
  // 46% Dinner (17:30 - 21:00)
  // 12% Afternoon / Breakfast (10:00 - 11:30 or 14:00 - 17:30)
  const roll = Math.random()
  let hour: number
  let minute: number

  if (roll < 0.42) {
    // Lunch Rush
    hour = getRandomInt(11, 13)
    minute = hour === 11 ? getRandomInt(30, 59) : getRandomInt(0, 59)
  } else if (roll < 0.88) {
    // Dinner Rush
    hour = getRandomInt(17, 20)
    minute = hour === 17 ? getRandomInt(30, 59) : getRandomInt(0, 59)
  } else {
    // Off-peak
    if (Math.random() < 0.5) {
      hour = getRandomInt(10, 11)
      minute = getRandomInt(0, 29)
    } else {
      hour = getRandomInt(14, 16)
      minute = getRandomInt(0, 59)
    }
  }

  const second = getRandomInt(0, 59)

  d.setHours(hour, minute, second, getRandomInt(100, 999))
  return d
}
