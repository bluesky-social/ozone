import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useIsImageSearchEnabled } from '@/lib/useImageSearch'

/**
 * Create link to image search page
 */
export function ImageSearchLink({ url }: { url: string }) {
  const imageSearchEnabled = useIsImageSearchEnabled()
  if (!imageSearchEnabled) return null
  return (
    <a
      href={`/image-search?url=${encodeURIComponent(url)}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-50 hover:underline mt-1"
    >
      <MagnifyingGlassIcon className="w-3 h-3" />
      Search image
    </a>
  )
}
