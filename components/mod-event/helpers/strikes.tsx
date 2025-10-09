import { DAY } from '@/lib/util'

export const strikeToSuspensionDurationInHours = {
  4: 3 * DAY,
  8: 7 * DAY,
  12: 14 * DAY,
  16: Infinity,
}
