type CloseReportsResult = { closedCount: number; reportIds: number[] }

// The bulk endpoint protects active reviews, including the report explicitly
// selected by the moderator. Close that report separately if it was skipped.
export async function closeAllOwnedReports({
  subject,
  reportId,
  internalNote,
  closeReports,
  closeCurrentReport,
}: {
  subject: string
  reportId: number
  internalNote?: string
  closeReports: (input: {
    subject: string
    includeAllOwned: true
    internalNote?: string
  }) => Promise<CloseReportsResult>
  closeCurrentReport: () => Promise<unknown>
}): Promise<
  | { closedCount: number; currentClosed: true }
  | { closedCount: number; currentClosed: false; error: unknown }
> {
  const result = await closeReports({
    subject,
    includeAllOwned: true,
    internalNote,
  })
  if (result.reportIds.includes(reportId)) {
    return { closedCount: result.closedCount, currentClosed: true }
  }

  try {
    await closeCurrentReport()
    return { closedCount: result.closedCount + 1, currentClosed: true }
  } catch (error) {
    return { closedCount: result.closedCount, currentClosed: false, error }
  }
}
