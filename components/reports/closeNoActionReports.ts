export type BulkNoActionScope = 'all' | 'types' | 'allOwned'

export class CurrentReportCloseError extends Error {
  constructor(
    public readonly closedCount: number,
    public readonly cause: unknown,
  ) {
    super('Could not close the current report')
  }
}

export async function closeNoActionReports({
  subject,
  reportId,
  scope,
  reportTypes,
  internalNote,
  closeReports,
  closeCurrentReport,
}: {
  subject: string
  reportId: number
  scope: BulkNoActionScope
  reportTypes: string[]
  internalNote?: string
  closeReports: (input: {
    subject: string
    reportId: number
    reportTypes?: string[]
    includeAllOwned?: boolean
    internalNote?: string
  }) => Promise<{ closedCount: number; reportIds: number[] }>
  closeCurrentReport: () => Promise<unknown>
}): Promise<number> {
  const result = await closeReports({
    subject,
    reportId,
    reportTypes: scope === 'types' ? reportTypes : undefined,
    includeAllOwned: scope === 'allOwned' ? true : undefined,
    internalNote,
  })

  if (result.reportIds.includes(reportId)) return result.closedCount

  // Older servers ignore reportId and protect the current assigned report.
  try {
    await closeCurrentReport()
    return result.closedCount + 1
  } catch (cause) {
    throw new CurrentReportCloseError(result.closedCount, cause)
  }
}
