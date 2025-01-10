import { FALLBACK_VIDEO_URL } from '@/lib/constants'

export const getVideoUrlWithFallback = (
  originalUri: string,
  opts?: { isAuthorDeactivated?: boolean },
): string => {
  const [find, replace] = FALLBACK_VIDEO_URL
  if (!find || !replace) {
    return originalUri
  }

  if (!opts?.isAuthorDeactivated) {
    return originalUri
  }

  return originalUri.replace(find, replace)
}
