export function MutedBadge({ isMuted }: { isMuted?: boolean }) {
  if (!isMuted) return null
  return (
    <span className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium">
      Muted
    </span>
  )
}
