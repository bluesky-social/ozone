import { usePathname, useSearchParams, useRouter } from 'next/navigation'

export const useWorkspaceOpener = () => {
  const pathname = usePathname()
  const params = useSearchParams()
  const router = useRouter()
  const workspaceOpenParam = params.get('workspaceOpen') ?? ''

  const toggleWorkspacePanel = () => {
    const searchParams = new URLSearchParams(params)
    if (workspaceOpenParam) {
      searchParams.delete('workspaceOpen')
    } else {
      searchParams.set('workspaceOpen', 'true')
    }
    router.push((pathname ?? '') + '?' + searchParams.toString())
  }

  return { toggleWorkspacePanel, isWorkspaceOpen: !!workspaceOpenParam }
}
