export const createSetPageLink = (queryParams: Record<string, string>) => {
  const url = new URL(window.location.href.replace(window.location.search, ''))

  Object.entries({ tab: 'sets', ...queryParams }).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url.toString()
}
