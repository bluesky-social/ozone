export const DETAIL_STATS_PERIODS = ['day', 'week', 'month', 'quarter'] as const
export type DetailStatsPeriod = (typeof DETAIL_STATS_PERIODS)[number]
export type DetailStatsDateRange = {
  startDate?: string
  endDate?: string
  period?: DetailStatsPeriod
}

const DAY_MS = 86400000

function parseDate(value?: string) {
  const day = value?.slice(0, 10)
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined
  const date = new Date(`${day}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(day)
    ? date
    : undefined
}

/** Calendar windows use UTC, with Monday as the first day of the week. */
export function getDetailStatsWindow(
  period: DetailStatsPeriod,
  anchor: string | undefined,
  today: string,
): DetailStatsDateRange {
  const current = parseDate(today)!
  const requested = parseDate(anchor)
  const start = new Date(
    requested && requested <= current ? requested : current,
  )
  if (period === 'week') {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7))
  } else if (period === 'month' || period === 'quarter') {
    start.setUTCDate(1)
    if (period === 'quarter') {
      start.setUTCMonth(Math.floor(start.getUTCMonth() / 3) * 3)
    }
  }
  const end = new Date(start)
  if (period === 'month' || period === 'quarter') {
    end.setUTCMonth(end.getUTCMonth() + (period === 'quarter' ? 3 : 1))
  } else {
    end.setUTCDate(end.getUTCDate() + (period === 'week' ? 7 : 1))
  }
  end.setUTCDate(end.getUTCDate() - 1)

  return {
    period,
    startDate: start.toISOString(),
    endDate: new Date(Math.min(end.getTime(), current.getTime())).toISOString(),
  }
}

export function matchingDetailStatsPeriod(
  range: DetailStatsDateRange,
  today: string,
  preferred?: string | null,
): DetailStatsPeriod | undefined {
  const hasPreferred = DETAIL_STATS_PERIODS.includes(
    preferred as DetailStatsPeriod,
  )
  const candidates = hasPreferred
    ? [preferred as DetailStatsPeriod]
    : DETAIL_STATS_PERIODS
  return candidates.find((period) => {
    const window = getDetailStatsWindow(period, range.endDate, today)
    return (
      range.startDate?.slice(0, 10) === window.startDate?.slice(0, 10) &&
      // A bookmarked current window can become a partial historical window.
      (hasPreferred
        ? !!parseDate(range.endDate) &&
          range.endDate!.slice(0, 10) >= window.startDate!.slice(0, 10) &&
          range.endDate!.slice(0, 10) <= window.endDate!.slice(0, 10)
        : range.endDate?.slice(0, 10) === window.endDate?.slice(0, 10))
    )
  })
}

export function moveDetailStatsWindow(
  range: DetailStatsDateRange,
  direction: -1 | 1,
  today: string,
): DetailStatsDateRange | undefined {
  const start = parseDate(range.startDate)
  const end = parseDate(range.endDate)
  const current = parseDate(today)!
  if (!start || !end || start > end || end > current) return undefined

  if (range.period) {
    const anchor = new Date(start)
    if (range.period === 'month' || range.period === 'quarter') {
      anchor.setUTCMonth(
        anchor.getUTCMonth() + direction * (range.period === 'quarter' ? 3 : 1),
      )
    } else {
      anchor.setUTCDate(
        anchor.getUTCDate() + direction * (range.period === 'week' ? 7 : 1),
      )
    }
    if (anchor > current) return undefined
    return getDetailStatsWindow(range.period, anchor.toISOString(), today)
  }

  // Preserve exact ranges from overview links until a calendar period is chosen.
  const span = end.getTime() - start.getTime() + DAY_MS
  const nextStart = start.getTime() + direction * span
  if (nextStart > current.getTime()) return undefined
  return {
    startDate: new Date(nextStart).toISOString(),
    endDate: new Date(
      Math.min(end.getTime() + direction * span, current.getTime()),
    ).toISOString(),
  }
}
