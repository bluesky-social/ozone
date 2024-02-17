export const diffTags = (current: string[], next: string[]) => {
  const add = next.filter((tag) => !current.includes(tag))
  const remove = current.filter((tag) => !next.includes(tag))
  return { add, remove }
}
