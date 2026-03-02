export interface StringListProps {
  items: string[]
  conjunction?: string
}

export function StringList({ items, conjunction = 'and' }: StringListProps) {
  if (items.length === 0) return null
  if (items.length === 1) return <strong>{items[0]}</strong>

  const allButLast = items.slice(0, -1)
  const last = items[items.length - 1]

  return (
    <>
      {allButLast.map((item, i) => (
        <span key={item}>
          {i > 0 && ', '}
          <strong>{item}</strong>
        </span>
      ))}
      {allButLast.length > 0 && ` ${conjunction} `}
      <strong>{last}</strong>
    </>
  )
}
