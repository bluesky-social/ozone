import { Loading } from '@/common/Loader'
import { useHandleToDidRedirect } from './useHandleToDidRedirect'

export const RedirectFromHandleToDid = ({
  handle,
  children,
}: {
  handle: string
  children: JSX.Element
}) => {
  const { isFetching } = useHandleToDidRedirect(
    handle,
    (did) => `/repositories/${did}`,
  )
  if (isFetching) {
    return <Loading />
  }

  return children
}
