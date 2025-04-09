import { Loading } from '@/common/Loader'
import { useHandleToDidRedirect } from './useHandleToDidRedirect'

import type { JSX } from 'react'

export const RedirectFromHandleToDid = ({
  handle,
  children,
  record = [],
}: {
  handle: string
  record?: string[]
  children: JSX.Element
}) => {
  const { isFetching } = useHandleToDidRedirect(handle, (did) =>
    record?.length
      ? `/repositories/${did}/${record.join('/')}`
      : `/repositories/${did}`,
  )
  if (isFetching) {
    return <Loading />
  }

  return children
}
