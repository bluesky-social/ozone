export function countStrikes(
  events: ReadonlyArray<{ event: unknown }>,
  now = Date.now(),
): { activeStrikeCount: number; totalStrikeCount: number } {
  let activeStrikeCount = 0
  let totalStrikeCount = 0
  for (const { event } of events) {
    if (!event || typeof event !== 'object' || !('strikeCount' in event)) {
      continue
    }
    if (typeof event.strikeCount !== 'number') continue
    totalStrikeCount += event.strikeCount
    const expiresAt =
      'strikeExpiresAt' in event && typeof event.strikeExpiresAt === 'string'
        ? Date.parse(event.strikeExpiresAt)
        : undefined
    if (expiresAt === undefined || expiresAt > now) {
      activeStrikeCount += event.strikeCount
    }
  }
  return { activeStrikeCount, totalStrikeCount }
}
