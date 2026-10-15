// Shared by summary cards, tables, and chart series. Keep metric colors stable
// across light and dark backgrounds; text uses separate accessible shades.
const inbound = {
  badge: 'bg-blue-100 dark:bg-blue-900/30',
  color: '#3b82f6',
  text: 'text-blue-700 dark:text-blue-300',
}
const pending = {
  badge: 'bg-amber-100 dark:bg-amber-900/30',
  color: '#d97706',
  text: 'text-amber-700 dark:text-amber-300',
}
const escalated = {
  badge: 'bg-purple-100 dark:bg-purple-900/30',
  color: '#a855f7',
  text: 'text-purple-700 dark:text-purple-300',
}
const closed = {
  badge: 'bg-indigo-100 dark:bg-indigo-900/30',
  color: '#6366f1',
  text: 'text-indigo-700 dark:text-indigo-300',
}
const actioned = {
  badge: 'bg-green-100 dark:bg-green-900/30',
  color: '#16a34a',
  text: 'text-green-700 dark:text-green-300',
}
const acknowledged = {
  badge: 'bg-cyan-100 dark:bg-cyan-900/30',
  color: '#0891b2',
  text: 'text-cyan-700 dark:text-cyan-300',
}
const handling = {
  badge: 'bg-slate-100 dark:bg-slate-900/30',
  color: '#64748b',
  text: 'text-slate-700 dark:text-slate-300',
}
const resolution = {
  badge: 'bg-teal-100 dark:bg-teal-900/30',
  color: '#0d9488',
  text: 'text-teal-700 dark:text-teal-300',
}
const missed = {
  badge: 'bg-rose-100 dark:bg-rose-900/30',
  color: '#e11d48',
  text: 'text-rose-700 dark:text-rose-300',
}
const label = {
  badge: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
  color: '#c026d3',
  text: 'text-fuchsia-700 dark:text-fuchsia-300',
}

export const STATS_COLORS = {
  inboundCount: inbound,
  pendingCount: pending,
  escalatedCount: escalated,
  closedCount: closed,
  actionedCount: actioned,
  acknowledgedCount: acknowledged,
  actionRate: actioned,
  labelActionCount: label,
  takedownActionCount: missed,
  avgHandlingTimeSec: handling,
  avgResolutionTimeSec: resolution,
  closureTargetMetCount: actioned,
  closureTargetMetRate: actioned,
  closureTargetMissedCount: missed,
  closureTargetOverdueCount: missed,
} as const

export type StatsMetric = keyof typeof STATS_COLORS
