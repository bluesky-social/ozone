import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLocalStorage } from 'react-use'

export function useStoredQuery<
  TData extends NonNullable<unknown> | null,
  TError,
  TQueryKey extends (string | number | boolean | null)[],
>({
  initialData,
  ...options
}: Omit<
  UseQueryOptions<TData, TError, TData, TQueryKey>,
  'queryKey' | 'initialData'
> & {
  queryKey: TQueryKey
  initialData?: TData
}): UseQueryResult<TData, TError> {
  const key = `storedQuery:${JSON.stringify(options.queryKey).slice(1, -1)}`

  const [storedData, setStoredData] = useLocalStorage<TData>(key, initialData)

  const response = useQuery({ ...options, initialData: storedData })

  useEffect(() => {
    setStoredData(response.data)
  }, [response.data, setStoredData])

  return response
}
