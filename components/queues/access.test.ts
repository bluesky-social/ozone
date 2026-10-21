import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { refreshQueueAccess } from './access'

afterEach(() => vi.unstubAllGlobals())

describe('queue access cache changes', () => {
  it('cancels stale requests and clears queue/report caches after membership or strict-setting changes', async () => {
    const client = new QueryClient()
    vi.stubGlobal('window', {})
    const setItem = vi.fn()
    vi.stubGlobal('sessionStorage', { setItem })
    const keys = [['queues'], ['report', 12], ['betaReports', { queueId: '3' }]]
    keys.forEach((key) => client.setQueryData(key, { old: true }))
    client.setQueryData(['modEventList'], { events: ['retained'] })
    let signal: AbortSignal | undefined
    const pending = client
      .fetchQuery({
        queryKey: ['report', 15],
        queryFn: (context) => {
          signal = context.signal
          return new Promise(() => {})
        },
      })
      .catch(() => {})
    await refreshQueueAccess(client)
    await pending
    expect(signal?.aborted).toBe(true)
    keys.forEach((key) => expect(client.getQueryData(key)).toBeUndefined())
    expect(client.getQueryData(['report', 15])).toBeUndefined()
    expect(client.getQueryData(['modEventList'])).toEqual({
      events: ['retained'],
    })
    expect(setItem).toHaveBeenCalledWith('ozone:reportsListIds', '[]')
    client.clear()
  })

  it('shows refreshed data after a membership change when navigating back to a cached query', async () => {
    const client = new QueryClient()
    const key = ['queues']
    for (let i = 0; i < 3; i++) {
      client.setQueryData(key, { queues: ['previously accessible'] })
    }
    const observer = new QueryObserver(client, {
      queryKey: key,
      queryFn: async () => ({ queues: ['still accessible'] }),
      refetchOnMount: false,
    })
    const unsubscribe = observer.subscribe(() => {})
    expect(observer.getCurrentResult().isFetchedAfterMount).toBe(false)
    await refreshQueueAccess(client)
    expect(observer.getCurrentResult().data).toEqual({
      queues: ['still accessible'],
    })
    expect(observer.getCurrentResult().isFetchedAfterMount).toBe(true)
    unsubscribe()
    client.clear()
  })
})
