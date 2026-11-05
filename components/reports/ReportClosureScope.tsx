import { Select } from '@/common/forms'
import { ReportTypeMultiselect } from '@/reports/ReportTypeMultiselect'

export type ReportClosureScope = 'current' | 'all' | 'types' | 'allOwned'

export function ReportClosureScopeSelector({
  scope,
  onScopeChange,
  reportTypes,
  onReportTypesChange,
  subject,
}: {
  scope: ReportClosureScope
  onScopeChange: (scope: ReportClosureScope) => void
  reportTypes: string[]
  onReportTypesChange: (types: string[]) => void
  subject: { type: string; subject: string }
}) {
  const isAccount =
    subject.type === 'account' && subject.subject.startsWith('did:')
  return (
    <div className="space-y-2">
      <Select
        aria-label="Report closure scope"
        className="w-full"
        value={scope}
        onChange={(e) => onScopeChange(e.target.value as ReportClosureScope)}
      >
        <option value="current">Close this report only</option>
        <option value="all">Close all open reports on subject</option>
        <option value="types">Close reports of specific types</option>
        {isAccount && (
          <option value="allOwned">
            Close reports on this account and all its subjects
          </option>
        )}
      </Select>
      {scope === 'types' && (
        <ReportTypeMultiselect
          value={reportTypes}
          onChange={onReportTypesChange}
        />
      )}
      {scope === 'allOwned' && (
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Other reports under active review remain open. Eligible appeal reports
          are closed as no-action, but their subjects may still show an unresolved
          appeal.
        </p>
      )}
    </div>
  )
}
