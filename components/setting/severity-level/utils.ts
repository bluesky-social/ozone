export const createSeverityLevelPageLink = (
  queryParams: Record<string, string>,
) => {
  const url = new URL(window.location.href.replace(window.location.search, ''))

  Object.entries({
    tab: 'policies',
    view: 'severity-levels',
    ...queryParams,
  }).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url.toString()
}
