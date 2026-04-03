import { ReactNode } from 'react'
import { LoadMoreButton } from '@/common/LoadMoreButton'

export function PaginatedGrid<T>({
  items,
  hasNextPage,
  fetchNextPage,
  renderItem,
  className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
}: {
  items: T[]
  hasNextPage?: boolean
  fetchNextPage?: () => void
  renderItem: (item: T, index: number) => ReactNode
  className?: string
}) {
  return (
    <div>
      <div className={className}>{items.map(renderItem)}</div>
      {!!items.length && hasNextPage && fetchNextPage && (
        <div className="mt-2 flex justify-center pb-2">
          <LoadMoreButton onClick={fetchNextPage} />
        </div>
      )}
    </div>
  )
}
