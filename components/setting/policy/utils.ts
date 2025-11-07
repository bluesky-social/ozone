export const nameToKey = (name: string) => name.toLowerCase().replace(/\s/g, '-')

export const createPolicyPageLink = (queryParams: Record<string, string>) => {
  const url = new URL(window.location.href.replace(window.location.search, ''))

  Object.entries({ tab: 'policies', ...queryParams }).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  return url.toString()
}
