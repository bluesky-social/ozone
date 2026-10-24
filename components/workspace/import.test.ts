import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React, { ReactElement, FormEventHandler } from 'react'
import WorkspaceItemCreator from './ItemCreator'
import { prepareWorkspaceItems } from './import'

const { resolveHandle, mutateAsync, success, error } = vi.hoisted(() => ({
  resolveHandle: vi.fn(),
  mutateAsync: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('@/lib/client', () => ({ globalAgent: { resolveHandle } }))
vi.mock('./hooks', () => ({
  useWorkspaceAddItemsMutation: () => ({ mutateAsync }),
}))
vi.mock('@/common/forms', () => ({ Input: 'input' }))
vi.mock('@/common/buttons', () => ({ ActionButton: 'button' }))
vi.mock('react-toastify', () => ({ toast: { success, error } }))

const did = 'did:plc:example'
const otherDid = 'did:web:example.test'
const post = `at://${did}/app.bsky.feed.post/example`

beforeEach(() => {
  mutateAsync.mockReset()
  success.mockClear()
  error.mockClear()
  resolveHandle.mockReset()
  resolveHandle.mockImplementation(async ({ handle }) => {
    if (handle === 'example.test') return { data: { did } }
    throw new Error('Handle not found')
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('pasted workspace subjects', () => {
  it('preserves existing DIDs and record URIs without lookups', async () => {
    const profile = `at://${otherDid}/app.bsky.actor.profile/self`
    expect(await prepareWorkspaceItems([did, otherDid, post, profile])).toEqual(
      [did, otherDid, post, profile],
    )
    expect(resolveHandle).not.toHaveBeenCalled()
  })

  it('normalizes mixed identifiers and links in input order', async () => {
    expect(
      await prepareWorkspaceItems([
        ` ${otherDid} `,
        'example.test',
        'https://bsky.app/profile/example.test/post/example',
        `https://bsky.app/profile/${did}/post/second?ref=share#thread`,
      ]),
    ).toEqual([otherDid, did, post, `at://${did}/app.bsky.feed.post/second`])
    expect(resolveHandle).toHaveBeenCalledTimes(1)
    expect(resolveHandle).toHaveBeenCalledWith({ handle: 'example.test' })
  })

  it.each([
    ['https://bsky.app/profile/example.test', did],
    [`https://bsky.app/profile/${did}`, did],
    [`https://bsky.app/profile/${otherDid}/?ref=share#profile`, otherDid],
    ['https://bsky.app/profile/example.test/post/example/?ref=share', post],
    [`https://bsky.app/profile/${did}/post/example`, post],
    ['https://bsky.app/profile/did%3Aplc%3Aexample/post/example', post],
    ['http://bsky.app/profile/example.test', did],
  ])('imports %s as its subject', async (input, expected) => {
    expect(await prepareWorkspaceItems([input])).toEqual([expected])
  })

  it('resolves handle-based record URIs without losing their collection or key', async () => {
    expect(
      await prepareWorkspaceItems([
        'at://example.test/app.bsky.feed.post/example',
        'at://example.test/app.bsky.graph.list/other',
      ]),
    ).toEqual([post, `at://${did}/app.bsky.graph.list/other`])
    expect(resolveHandle).toHaveBeenCalledTimes(1)
  })

  it('deduplicates canonical subjects and resolves each handle once', async () => {
    expect(
      await prepareWorkspaceItems([
        'example.test',
        'EXAMPLE.TEST',
        did,
        'https://bsky.app/profile/example.test',
        'https://bsky.app/profile/example.test/post/example',
        post,
        'example.test',
      ]),
    ).toEqual([did, post])
    expect(resolveHandle).toHaveBeenCalledTimes(1)
  })

  it.each([
    'not an identifier',
    'did:',
    'at://',
    `at://${did}/app.bsky.feed.post`,
    `at://${did}/app.bsky.feed.post/example/extra`,
    'https://example.test/profile/example.test',
    'https://bsky.app.example.test/profile/example.test',
    'https://bsky.app/profile/example.test/post',
    'https://bsky.app/profile/example.test/post/example/extra',
    'https://bsky.app/profile/example.test/lists/example',
    'https://bsky.app/profile/example.test/unknown/example',
    'https://bsky.app/profile/%broken',
    'https://bsky.app/profile/example.test/post/a%2Fb',
    'ftp://bsky.app/profile/example.test',
  ])('rejects a batch containing invalid input: %s', async (input) => {
    await expect(prepareWorkspaceItems([did, input])).rejects.toThrow(
      'Invalid workspace item',
    )
    expect(resolveHandle).not.toHaveBeenCalled()
  })

  it('rejects a mixed batch if an actor cannot be resolved', async () => {
    await expect(
      prepareWorkspaceItems([
        did,
        'https://bsky.app/profile/missing.test/post/example',
      ]),
    ).rejects.toThrow('Could not resolve handle: missing.test')
    expect(resolveHandle).toHaveBeenCalledWith({ handle: 'missing.test' })
  })

  it('ignores empty comma-separated entries but rejects an empty batch', async () => {
    expect(await prepareWorkspaceItems(['', ` ${did} `, ' '])).toEqual([did])
    await expect(prepareWorkspaceItems(['', ' '])).rejects.toThrow(
      'Enter at least one workspace item',
    )
  })

  it('keeps large imports complete and limits concurrent lookups to 50', async () => {
    let active = 0
    let maxActive = 0
    resolveHandle.mockImplementation(async ({ handle }) => {
      maxActive = Math.max(maxActive, ++active)
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      active--
      return { data: { did: `did:plc:${handle.split('.')[0]}` } }
    })
    const inputs = Array.from(
      { length: 401 },
      (_, i) => `https://bsky.app/profile/subject${i}.test/post/example`,
    )
    expect(await prepareWorkspaceItems(inputs)).toEqual(
      inputs.map(
        (_, i) => `at://did:plc:subject${i}/app.bsky.feed.post/example`,
      ),
    )
    expect(resolveHandle).toHaveBeenCalledTimes(401)
    expect(maxActive).toBe(50)
  })
})

describe('workspace item form submission', () => {
  async function submit(items: string) {
    // Exercise the real submit callback with form-data and hook boundaries mocked.
    const setAdding = vi.fn()
    vi.spyOn(React, 'useState').mockReturnValue([false, setAdding])
    const formData = new FormData()
    formData.set('items', items)
    vi.stubGlobal(
      'FormData',
      vi.fn(function () {
        return formData
      }),
    )
    const reset = vi.fn()
    const onCancel = vi.fn()
    const form = WorkspaceItemCreator({
      onFileUploadClick: vi.fn(),
      onCancel,
    }) as ReactElement<{ onSubmit: FormEventHandler<HTMLFormElement> }>
    await form.props.onSubmit({
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      currentTarget: { reset },
      target: { reset },
    } as unknown as React.FormEvent<HTMLFormElement>)
    return { reset, onCancel, setAdding }
  }

  it('passes canonical mixed subjects to storage and clears the successful form', async () => {
    mutateAsync.mockImplementation(async (_, { onSuccess }) => onSuccess())
    const { reset, onCancel, setAdding } = await submit(
      `${otherDid}, https://bsky.app/profile/example.test/post/example`,
    )
    expect(mutateAsync).toHaveBeenCalledWith(
      [otherDid, post],
      expect.any(Object),
    )
    expect(success).toHaveBeenCalledWith(
      'Added 1 Account, 1 Post to workspace.',
    )
    expect(reset).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
    expect(setAdding).toHaveBeenLastCalledWith(false)
    expect(error).not.toHaveBeenCalled()
  })

  it.each([
    'not an identifier',
    'https://bsky.app/profile/missing.test/post/example',
  ])(
    'keeps the form open and stores nothing for a failed batch containing %s',
    async (input) => {
      const { reset, onCancel, setAdding } = await submit(`${did}, ${input}`)
      expect(mutateAsync).not.toHaveBeenCalled()
      expect(reset).not.toHaveBeenCalled()
      expect(onCancel).not.toHaveBeenCalled()
      expect(success).not.toHaveBeenCalled()
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to add items to workspace.'),
      )
      expect(setAdding).toHaveBeenLastCalledWith(false)
    },
  )
})
