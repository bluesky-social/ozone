import {
  ComAtprotoModerationDefs,
  ToolsOzoneModerationDefs,
  ToolsOzoneReportDefs,
} from '@atproto/api'

export const isAppealReportType = (reportType?: string): boolean =>
  reportType === ComAtprotoModerationDefs.REASONAPPEAL ||
  reportType === 'tools.ozone.report.defs#reasonAppeal'

export const getDefaultReportTypes = (
  report: Pick<ToolsOzoneReportDefs.ReportView, 'queue' | 'reportType'>,
): string[] => {
  const queueTypes = report.queue?.reportTypes ?? []

  if (report.reportType && isAppealReportType(report.reportType)) {
    return [
      ...new Set([
        ...queueTypes.filter((type) => !isAppealReportType(type)),
        report.reportType,
      ]),
    ]
  }

  if (queueTypes.length > 0) {
    return [...queueTypes]
  }

  return report.reportType ? [report.reportType] : []
}

export const getHandleFromSubjectView = (
  sv: ToolsOzoneModerationDefs.SubjectView,
): string | undefined =>
  sv.status?.subjectRepoHandle ??
  sv.repo?.handle ??
  sv.record?.repo?.handle
