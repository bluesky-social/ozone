import { Hover } from '@/common/Hover'
import { LabelChip, LabelList } from '@/common/labels/List'
import { pluralize } from '@/lib/util'
import { FlagIcon } from '@heroicons/react/24/solid'
import { ComponentProps } from 'react'
import { SubjectTag } from './SubjectTag'

const isReportTag = (tag: string) => tag.startsWith('report:')

// Renders a list of subject tags. Report tags (report:*) tend to pile up and
// crowd out the more useful tags, so when there are 2+ of them they collapse
// into a single "n types of reports" chip that reveals the full list on hover.
export const SubjectTagList = ({
  tags,
  ...rest
}: { tags?: string[] } & ComponentProps<typeof LabelList>) => {
  if (!tags?.length) return null

  const sorted = [...tags].sort()
  const reportTags = sorted.filter(isReportTag)
  const otherTags = sorted.filter((tag) => !isReportTag(tag))
  const collapseReportTags = reportTags.length > 1

  return (
    <LabelList {...rest}>
      {otherTags.map((tag) => (
        <SubjectTag key={tag} tag={tag} />
      ))}
      {!collapseReportTags &&
        reportTags.map((tag) => <SubjectTag key={tag} tag={tag} />)}
      {collapseReportTags && (
        <Hover
          content={
            <LabelList className="flex-wrap gap-1">
              {reportTags.map((tag) => (
                <SubjectTag key={tag} tag={tag} />
              ))}
            </LabelList>
          }
        >
          <LabelChip>
            <FlagIcon className="h-3 w-3" />{' '}
            {pluralize(reportTags.length, 'report type')}
          </LabelChip>
        </Hover>
      )}
    </LabelList>
  )
}
