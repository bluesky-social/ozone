import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToolsOzoneModerationDefs } from '@atproto/api'
import { useWorkspaceListData, WorkspaceListData } from './useWorkspaceListData'
import {
  useWorkspaceAddItemsMutation,
  useWorkspaceImport,
  useWorkspaceRemoveItemsMutation,
} from './hooks'

const state = vi.hoisted(() => ({
  list: '',
  getSubjects: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}))
vi.mock('@/shell/ConfigurationContext', () => ({
  useLabelerAgent: () => ({
    tools: { ozone: { moderation: { getSubjects: state.getSubjects } } },
  }),
  useServerConfig: () => ({ role: 'tools.ozone.team.defs#roleAdmin' }),
}))
vi.mock('@/lib/local-storage', () => ({
  getLocalStorageData: () => state.list,
  setLocalStorageData: (_key: string, value: string) => {
    state.list = value
  },
}))
vi.mock('react-toastify', () => ({
  toast: { error: state.error, success: state.success, isActive: () => false },
}))

type Subject = ToolsOzoneModerationDefs.SubjectView
const account = (n: number): Subject => ({
  type: 'account',
  subject: `did:plc:subject${n}`,
})
const subjects = (n: number) =>
  Array.from({ length: n }, (_, i) => account(i).subject)
const key = (ids: string[]) => ['workspaceListData', ids]
const asData = (entries: Subject[]): WorkspaceListData =>
  Object.fromEntries(entries.map((entry) => [entry.subject, entry]))

let client: QueryClient
function capture<T>(useHook: () => T): T {
  let value: T
  function Capture() {
    value = useHook()
    return null
  }
  renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Capture />
    </QueryClientProvider>,
  )
  return value!
}
function register(ids: string[]) {
  return capture(() => useWorkspaceListData({ subjects: ids, enabled: false }))
}
async function load(ids: string[]) {
  const result = await register(ids).refetch({ throwOnError: true })
  return result.data!
}
function add() {
  return capture(useWorkspaceAddItemsMutation)
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  state.list = ''
  state.getSubjects.mockReset()
  state.getSubjects.mockImplementation(async ({ subjects: ids }) => ({
    data: {
      subjects: ids.map((subject) => ({
        type: subject.startsWith('did:') ? 'account' : 'record',
        subject,
      })),
    },
  }))
  state.error.mockClear()
  state.success.mockClear()
  vi.stubGlobal(
    'FileReader',
    class {
      result = ''
      onload?: () => void
      async readAsText(file: File) {
        this.result = await file.text()
        this.onload?.()
      }
    },
  )
})
afterEach(() => {
  client.clear()
  vi.unstubAllGlobals()
})

describe('workspace partial loading and re-import', () => {
  it('keeps successful batches and continues after multiple batch failures', async () => {
    const ids = subjects(151)
    state.getSubjects
      .mockRejectedValueOnce(new Error('First batch unavailable'))
      .mockResolvedValueOnce({
        data: {
          subjects: ids
            .slice(50, 100)
            .map((subject) => ({ type: 'account', subject })),
        },
      })
      .mockRejectedValueOnce(new Error('Third batch unavailable'))
    const data = await load(ids)
    expect(Object.keys(data)).toEqual([...ids.slice(50, 100), ids[150]])
    expect(
      state.getSubjects.mock.calls.map(([params]) => params.subjects.length),
    ).toEqual([50, 50, 50, 1])
    expect(state.error).toHaveBeenCalledOnce()
  })

  it('re-imports only missing entries from a 401-subject workspace', async () => {
    const ids = subjects(401)
    const omitted = new Set([ids[3], ids[400]])
    state.list = ids.join(',')
    client.setQueryData(
      key(ids),
      asData(
        ids
          .filter((id) => !omitted.has(id))
          .map((subject) => ({ type: 'account', subject })),
      ),
    )
    await add().mutateAsync(ids)
    expect(state.getSubjects).toHaveBeenCalledTimes(1)
    expect(state.getSubjects.mock.calls[0][0].subjects).toEqual([...omitted])
    expect(
      Object.keys(client.getQueryData<WorkspaceListData>(key(ids))!),
    ).toHaveLength(401)
    expect(state.list.split(',')).toEqual(ids)
  })

  it('makes a complete duplicate import a lookup no-op, preserving loaded details', async () => {
    const ids = subjects(2)
    state.list = ids.join(',')
    const original = asData([account(0), account(1)])
    client.setQueryData(key(ids), original)
    await add().mutateAsync([ids[1], ids[0], ids[1]])
    expect(state.getSubjects).not.toHaveBeenCalled()
    expect(client.getQueryData(key(ids))).toEqual(original)
    expect(state.list.split(',')).toEqual(ids)
  })

  it('preserves loaded entries when a repair still fails, and retries on the next import', async () => {
    const ids = subjects(2)
    state.list = ids.join(',')
    client.setQueryData(key(ids), asData([account(0)]))
    state.getSubjects.mockRejectedValueOnce(new Error('Unavailable'))
    const mutation = add()
    await mutation.mutateAsync(ids)
    expect(client.getQueryData(key(ids))).toEqual(asData([account(0)]))
    expect(state.error).toHaveBeenCalledOnce()
    await mutation.mutateAsync(ids)
    expect(client.getQueryData(key(ids))).toEqual(
      asData([account(0), account(1)]),
    )
    expect(
      state.getSubjects.mock.calls.map(([params]) => params.subjects),
    ).toEqual([[ids[1]], [ids[1]]])
  })

  it.each(['json', 'csv'])(
    'repairs omitted accounts and records through %s file re-import',
    async (format) => {
      const ids = [
        account(0).subject,
        'at://did:plc:subject1/app.bsky.feed.post/example',
      ]
      state.list = ids.join(',')
      state.getSubjects.mockResolvedValueOnce({ data: { subjects: [] } })
      expect(await load(ids)).toEqual({})
      expect(state.error).toHaveBeenCalledWith(
        expect.stringMatching(/accounts and records/),
      )
      const importer = capture(useWorkspaceImport)
      await importer.importFromFiles([
        new File(
          [
            format === 'json'
              ? JSON.stringify(ids.map((uri) => ({ uri })))
              : ['uri', ...ids].join('\n'),
          ],
          `subjects.${format}`,
          {
            type: format === 'json' ? 'application/json' : 'text/csv',
          },
        ),
      ])
      expect(client.getQueryData<WorkspaceListData>(key(ids))).toEqual({
        [ids[0]]: { type: 'account', subject: ids[0] },
        [ids[1]]: { type: 'record', subject: ids[1] },
      })
      expect(state.list.split(',')).toEqual(ids)
    },
  )

  it('retains old details on a failed full refresh and replaces them on a successful full refresh', async () => {
    const ids = subjects(2)
    const good = { ...account(0), status: { tags: ['original'] } } as Subject
    client.setQueryData(key(ids), asData([good, account(1)]))
    const query = register(ids)
    state.getSubjects.mockRejectedValueOnce(new Error('Unavailable'))
    expect((await query.refetch()).data).toEqual(asData([good, account(1)]))
    const updated = { ...good, status: { tags: ['updated'] } } as Subject
    state.getSubjects.mockResolvedValueOnce({
      data: { subjects: [updated, account(1)] },
    })
    expect((await query.refetch()).data).toEqual(asData([updated, account(1)]))
    expect(
      state.getSubjects.mock.calls.map(([params]) => params.subjects),
    ).toEqual([ids, ids])
  })

  it('does not prefetch details before the workspace has loaded any cached data', async () => {
    const ids = subjects(2)
    await add().mutateAsync(ids)
    expect(state.getSubjects).not.toHaveBeenCalled()
    expect(await load(ids)).toEqual(asData([account(0), account(1)]))
  })

  it('adds new subjects without reloading details already in the workspace', async () => {
    const ids = subjects(3)
    state.list = ids[0]
    client.setQueryData(key([ids[0]]), asData([account(0)]))
    await add().mutateAsync([ids[1], ids[2], ids[1]])
    expect(state.list.split(',')).toEqual(ids)
    expect(
      state.getSubjects.mock.calls.map(([params]) => params.subjects),
    ).toEqual([ids.slice(1)])
    expect(client.getQueryData(key(ids))).toEqual(
      asData([account(0), account(1), account(2)]),
    )
  })

  it('fills holes from another cached list without fetching or replacing existing entries', async () => {
    const ids = subjects(2)
    state.list = ids.join(',')
    client.setQueryData(key(ids), asData([account(0)]))
    client.setQueryData(key([ids[1]]), asData([account(1)]))
    await add().mutateAsync(ids)
    expect(client.getQueryData(key(ids))).toEqual(
      asData([account(0), account(1)]),
    )
    expect(state.getSubjects).not.toHaveBeenCalled()
  })

  it('loads every subject in a large list using sequential batches of at most 50', async () => {
    const ids = subjects(401)
    expect(Object.keys(await load(ids))).toEqual(ids)
    expect(
      state.getSubjects.mock.calls.map(([params]) => params.subjects.length),
    ).toEqual([50, 50, 50, 50, 50, 50, 50, 50, 1])
    expect(state.error).not.toHaveBeenCalled()
  })

  it('can recover after every batch in the initial load failed', async () => {
    const ids = subjects(51)
    state.list = ids.join(',')
    state.getSubjects
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockRejectedValueOnce(new Error('Unavailable'))
    expect(await load(ids)).toEqual({})
    expect(state.error).toHaveBeenCalledOnce()
    await add().mutateAsync(ids)
    expect(
      Object.keys(client.getQueryData<WorkspaceListData>(key(ids))!),
    ).toEqual(ids)
    expect(
      state.getSubjects.mock.calls.map(([params]) => params.subjects.length),
    ).toEqual([50, 1, 50, 1])
  })

  it('ignores subjects outside the requested list in a response', async () => {
    state.getSubjects.mockResolvedValueOnce({
      data: { subjects: [account(0), account(99)] },
    })
    expect(await load(subjects(1))).toEqual(asData([account(0)]))
  })

  it('waits for an existing load, then repairs only entries it omitted', async () => {
    const ids = subjects(2)
    state.list = ids.join(',')
    let finish!: (value: unknown) => void
    state.getSubjects.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const loading = load(ids)
    await vi.waitFor(() => expect(state.getSubjects).toHaveBeenCalledOnce())
    const importing = add().mutateAsync(ids)
    finish({ data: { subjects: [account(0)] } })
    await loading
    await importing
    expect(
      state.getSubjects.mock.calls.map(([params]) => params.subjects),
    ).toEqual([ids, [ids[1]]])
    expect(client.getQueryData(key(ids))).toEqual(
      asData([account(0), account(1)]),
    )
  })

  it('does not replace a successful update that finishes while a repair is pending', async () => {
    const ids = subjects(2)
    state.list = ids.join(',')
    client.setQueryData(key(ids), asData([account(0)]))
    let finish!: (value: unknown) => void
    state.getSubjects.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const importing = add().mutateAsync(ids)
    await vi.waitFor(() => expect(state.getSubjects).toHaveBeenCalledOnce())
    const fresh = { ...account(1), status: { tags: ['fresh'] } } as Subject
    client.setQueryData(key(ids), asData([account(0), fresh]))
    finish({ data: { subjects: [account(1)] } })
    await importing
    expect(client.getQueryData(key(ids))).toEqual(asData([account(0), fresh]))
  })

  it('does not restore an ID removed while its repair is pending', async () => {
    const ids = subjects(2)
    state.list = ids.join(',')
    client.setQueryData(key(ids), asData([account(0)]))
    let finish!: (value: unknown) => void
    state.getSubjects.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const importing = add().mutateAsync(ids)
    await vi.waitFor(() => expect(state.getSubjects).toHaveBeenCalledOnce())
    await capture(useWorkspaceRemoveItemsMutation).mutateAsync([ids[1]])
    client.setQueryData(key([ids[0]]), asData([account(0)]))
    finish({ data: { subjects: [account(1)] } })
    await importing
    expect(state.list).toBe(ids[0])
    expect(client.getQueryData(key([ids[0]]))).toEqual(asData([account(0)]))
  })

  it('does not repopulate a cleared cache with an earlier session repair', async () => {
    const ids = subjects(1)
    state.list = ids.join(',')
    client.setQueryData(key(ids), {})
    let finish!: (value: unknown) => void
    state.getSubjects.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const importing = add().mutateAsync(ids)
    await vi.waitFor(() => expect(state.getSubjects).toHaveBeenCalledOnce())
    client.clear()
    client.setQueryData(key(ids), {})
    finish({ data: { subjects: [account(0)] } })
    await importing
    expect(client.getQueryData(key(ids))).toEqual({})
  })

  it('stops a cancelled full load before issuing another batch or reporting missing data', async () => {
    const ids = subjects(51)
    let finish!: (value: unknown) => void
    state.getSubjects.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const loading = register(ids).refetch()
    await vi.waitFor(() => expect(state.getSubjects).toHaveBeenCalledOnce())
    const signal = state.getSubjects.mock.calls[0][1].signal as AbortSignal
    await client.cancelQueries({ queryKey: key(ids) })
    finish({ data: { subjects: [account(0)] } })
    await loading
    expect(signal.aborted).toBe(true)
    expect(state.getSubjects).toHaveBeenCalledOnce()
    expect(state.error).not.toHaveBeenCalled()
    expect(client.getQueryData(key(ids))).toBeUndefined()
  })

  it('keeps successful refreshed batches and old entries from a failed middle batch', async () => {
    const ids = subjects(101)
    const original = asData(
      ids.map((subject) => ({ type: 'account', subject })),
    )
    client.setQueryData(key(ids), original)
    state.getSubjects
      .mockResolvedValueOnce({ data: { subjects: [account(0)] } })
      .mockRejectedValueOnce(new Error('Middle batch unavailable'))
      .mockResolvedValueOnce({ data: { subjects: [account(100)] } })
    expect(await load(ids)).toEqual(original)
    expect(
      state.getSubjects.mock.calls.map(([params]) => params.subjects.length),
    ).toEqual([50, 50, 1])
    expect(state.error).toHaveBeenCalledOnce()
  })

  it('merges overlapping concurrent imports without losing either result or duplicating workspace IDs', async () => {
    const ids = subjects(3)
    state.list = ids[0]
    client.setQueryData(key([ids[0]]), asData([account(0)]))
    const finish: ((value: unknown) => void)[] = []
    state.getSubjects.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish.push(resolve)
        }),
    )
    const mutation = add()
    const first = mutation.mutateAsync([ids[1]])
    await vi.waitFor(() => expect(finish).toHaveLength(1))
    const second = mutation.mutateAsync([ids[2], ids[1]])
    await vi.waitFor(() => expect(finish).toHaveLength(2))
    finish[1]({ data: { subjects: [account(1), account(2)] } })
    await second
    finish[0]({ data: { subjects: [account(1)] } })
    await first
    expect(state.list.split(',')).toEqual(ids)
    expect(client.getQueryData(key(ids))).toEqual(
      asData([account(0), account(1), account(2)]),
    )
    expect(client.getQueryData(key(ids.slice(0, 2)))).toEqual(
      asData([account(0), account(1)]),
    )
  })
})
