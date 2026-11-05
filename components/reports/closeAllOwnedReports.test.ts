import { describe, expect, it, vi } from 'vitest'
import { closeAllOwnedReports } from './closeAllOwnedReports'

const subject = 'did:plc:account'

describe('closing reports across an account', () => {
  it('closes all eligible subjects with a note without closing the selected report twice', async () => {
    const closeReports = vi.fn().mockResolvedValue({
      closedCount: 2,
      reportIds: [17, 18],
    })
    const closeCurrentReport = vi.fn()

    const result = await closeAllOwnedReports({
      subject,
      reportId: 17,
      internalNote: 'reviewed',
      closeReports,
      closeCurrentReport,
    })

    expect(closeReports).toHaveBeenCalledWith({
      subject,
      includeAllOwned: true,
      internalNote: 'reviewed',
    })
    expect(closeCurrentReport).not.toHaveBeenCalled()
    expect(result).toEqual({ closedCount: 2, currentClosed: true })
  })

  it.each([0, 2])(
    'closes the selected report when %i other reports were eligible',
    async (closedCount) => {
      const closeCurrentReport = vi.fn().mockResolvedValue(undefined)
      const result = await closeAllOwnedReports({
        subject,
        reportId: 17,
        closeReports: vi.fn().mockResolvedValue({
          closedCount,
          reportIds: closedCount ? [18, 19] : [],
        }),
        closeCurrentReport,
      })

      expect(closeCurrentReport).toHaveBeenCalledOnce()
      expect(result).toEqual({
        closedCount: closedCount + 1,
        currentClosed: true,
      })
    },
  )

  it('reports partial success if closing the selected report fails', async () => {
    const error = new Error('report changed')
    const result = await closeAllOwnedReports({
      subject,
      reportId: 17,
      closeReports: vi
        .fn()
        .mockResolvedValue({ closedCount: 1, reportIds: [18] }),
      closeCurrentReport: vi.fn().mockRejectedValue(error),
    })
    expect(result).toEqual({ closedCount: 1, currentClosed: false, error })
  })

  it('does not close the selected report if the bulk request fails', async () => {
    const closeCurrentReport = vi.fn()
    await expect(
      closeAllOwnedReports({
        subject,
        reportId: 17,
        closeReports: vi.fn().mockRejectedValue(new Error('bulk failed')),
        closeCurrentReport,
      }),
    ).rejects.toThrow('bulk failed')
    expect(closeCurrentReport).not.toHaveBeenCalled()
  })
})
