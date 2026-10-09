export const getSubjectStatusSortParams = (
  params: Pick<URLSearchParams, 'get'>,
) => {
  let sortField = params.get('sortField')

  if (
    ![
      'lastReportedAt',
      'lastReviewedAt',
      'reportedRecordsCount',
      'takendownRecordsCount',
      'priorityScore',
    ].includes(sortField ?? '')
  ) {
    sortField = 'lastReportedAt'
  }

  // Keep lastReportedAt NULLS LAST ordering compatible with its descending index.
  return { sortField, sortDirection: 'desc' as const }
}
