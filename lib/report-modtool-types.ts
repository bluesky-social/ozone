// TODO(custom-queues): Remove this entire module once @atproto/api is bumped
// to a version that includes `modTool` on
// tools.ozone.report.defs#reportView. Until then, this minimal local
// extension lets the SPA read the new field defensively.
import { ToolsOzoneModerationDefs, ToolsOzoneReportDefs } from '@atproto/api'

/** reportView with the optional `modTool` field (pending @atproto/api bump). */
export type ReportViewWithModTool = ToolsOzoneReportDefs.ReportView & {
  modTool?: ToolsOzoneModerationDefs.ModTool
}

export const getReportModTool = (
  report: ToolsOzoneReportDefs.ReportView,
): ToolsOzoneModerationDefs.ModTool | undefined =>
  (report as ReportViewWithModTool).modTool
