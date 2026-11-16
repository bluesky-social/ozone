import { describe, expect, it, vi } from 'vitest'
import {
  closeNoActionReports,
  CurrentReportCloseError,
} from './closeNoActionReports'

describe('bulk no-action report closure', () => {
  it.each(['all', 'types', 'allOwned'] as const)(
    'explicitly targets the current report for %s',
    async (scope) => {
      const closeReports = vi.fn().mockResolvedValue({
        closedCount: 2,
        reportIds: [10, 11],
      })
      const closeCurrentReport = vi.fn()

      const count = await closeNoActionReports({
        subject: 'did:plc:example',
        reportId: 10,
        scope,
        reportTypes: ['reasonSpam'],
        internalNote: 'reviewed',
        closeReports,
        closeCurrentReport,
      })

      expect(closeReports).toHaveBeenCalledWith({
        subject: 'did:plc:example',
        reportId: 10,
        reportTypes: scope === 'types' ? ['reasonSpam'] : undefined,
        includeAllOwned: scope === 'allOwned' ? true : undefined,
        internalNote: 'reviewed',
      })
      expect(count).toBe(2)
      expect(closeCurrentReport).not.toHaveBeenCalled()
    },
  )

  it.each([0, 1])(
    'closes the current report separately when an older server closes %i other reports',
    async (closedCount) => {
      const closeCurrentReport = vi.fn().mockResolvedValue(undefined)
      const count = await closeNoActionReports({
        subject: 'did:plc:example',
        reportId: 10,
        scope: 'types',
        reportTypes: ['reasonSpam'],
        closeReports: vi.fn().mockResolvedValue({
          closedCount,
          reportIds: closedCount ? [11] : [],
        }),
        closeCurrentReport,
      })

      expect(closeCurrentReport).toHaveBeenCalledOnce()
      expect(count).toBe(closedCount + 1)
    },
  )

  it('reports partial success when the fallback fails', async () => {
    const cause = new Error('failed')
    const run = closeNoActionReports({
      subject: 'did:plc:example',
      reportId: 10,
      scope: 'all',
      reportTypes: [],
      closeReports: vi
        .fn()
        .mockResolvedValue({ closedCount: 2, reportIds: [11, 12] }),
      closeCurrentReport: vi.fn().mockRejectedValue(cause),
    })

    await expect(run).rejects.toMatchObject({
      closedCount: 2,
      cause,
    })
    await expect(run).rejects.toBeInstanceOf(CurrentReportCloseError)
  })
})
