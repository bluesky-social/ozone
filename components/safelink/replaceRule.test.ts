import { describe, expect, it, vi } from 'vitest'
import { replaceSafelinkRule } from './replaceRule'
import type { SafelinkRule } from './types'

const currentRule: SafelinkRule = {
  url: 'example.com/media/file.jpg',
  pattern: 'url',
  action: 'block',
  reason: 'csam',
  source: 'sourceA/url',
  comment: 'Original rule',
  createdBy: 'did:plc:example',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const replacement = {
  url: currentRule.url,
  pattern: currentRule.pattern,
  action: 'warn' as const,
  reason: 'none' as const,
  comment: 'Manual decision',
}

describe('replaceSafelinkRule', () => {
  it('removes the source rule before adding an Ozone rule with the same key', async () => {
    const calls: string[] = []
    const client = {
      removeRule: vi.fn(async () => {
        calls.push('remove')
      }),
      addRule: vi.fn(async () => {
        calls.push('add')
      }),
    }

    await replaceSafelinkRule(client, currentRule, replacement)

    expect(calls).toEqual(['remove', 'add'])
    expect(client.removeRule).toHaveBeenCalledWith({
      url: currentRule.url,
      pattern: currentRule.pattern,
      source: 'sourceA/url',
      comment: 'Replaced via Ozone',
    })
    expect(client.addRule).toHaveBeenCalledWith({
      ...replacement,
      source: 'ozone/default',
    })
  })

  it('restores the original rule if adding the replacement fails', async () => {
    const client = {
      removeRule: vi.fn(async () => {}),
      addRule: vi
        .fn()
        .mockRejectedValueOnce(new Error('Add failed'))
        .mockResolvedValueOnce(undefined),
    }

    await expect(
      replaceSafelinkRule(client, currentRule, replacement),
    ).rejects.toThrow('The original rule is in place')
    expect(client.addRule).toHaveBeenNthCalledWith(2, {
      url: currentRule.url,
      pattern: currentRule.pattern,
      action: currentRule.action,
      reason: currentRule.reason,
      comment: currentRule.comment,
      source: 'sourceA/url',
    })
  })

  it('restores the original rule when removal cannot be confirmed', async () => {
    const client = {
      removeRule: vi.fn().mockRejectedValue(new Error('Remove failed')),
      addRule: vi.fn(),
    }

    await expect(
      replaceSafelinkRule(client, currentRule, replacement),
    ).rejects.toThrow('The original rule is in place')
    expect(client.addRule).toHaveBeenCalledTimes(1)
    expect(client.addRule).toHaveBeenCalledWith({
      url: currentRule.url,
      pattern: currentRule.pattern,
      action: currentRule.action,
      reason: currentRule.reason,
      comment: currentRule.comment,
      source: 'sourceA/url',
    })
  })

  it('asks for a status check when the original rule cannot be restored', async () => {
    const client = {
      removeRule: vi.fn(async () => {}),
      addRule: vi.fn().mockRejectedValue(new Error('Add failed')),
    }

    await expect(
      replaceSafelinkRule(client, currentRule, replacement),
    ).rejects.toThrow('Check the current rule before retrying')
    expect(client.addRule).toHaveBeenCalledTimes(2)
  })

  it('does not drop a rule that already belongs to Ozone', async () => {
    const client = {
      removeRule: vi.fn(),
      addRule: vi.fn(),
    }

    await expect(
      replaceSafelinkRule(
        client,
        { ...currentRule, source: 'ozone/default' },
        replacement,
      ),
    ).rejects.toThrow('already managed in Ozone')
    expect(client.removeRule).not.toHaveBeenCalled()
    expect(client.addRule).not.toHaveBeenCalled()
  })
})
