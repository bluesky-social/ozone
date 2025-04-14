import { reviewStateToText } from '@/subject/ReviewStateMarker'
import { WorkspaceFilterItem } from './types'
import { SubjectTag } from 'components/tags/SubjectTag'

export const FilterView = ({ filter }: { filter: WorkspaceFilterItem }) => {
  if (filter.field === 'tag') {
    return (
      <div>
        {filter.operator === 'eq' ? 'With Tag' : 'Without Tag'}
        <SubjectTag tag={filter.value} />
      </div>
    )
  }
  if (filter.field === 'emailConfirmed') {
    return (
      <div>
        {filter.operator === 'eq' ? 'Email Confirmed' : 'Email Not Confirmed'}
      </div>
    )
  }
  if (filter.field === 'emailContains') {
    return (
      <div>
        {filter.operator === 'ilike'
          ? 'Email Contains'
          : 'Email Does Not Contain'}{' '}
        <span className="font-semibold">{filter.value}</span>
      </div>
    )
  }

  if (filter.field === 'reviewState') {
    return (
      <div>
        {filter.operator === 'eq' ? 'In Review State' : 'Not In Review State'}{' '}
        <span className="font-semibold">{reviewStateToText[filter.value]}</span>
      </div>
    )
  }

  if (filter.field === 'takendown') {
    return (
      <div>{filter.operator === 'eq' ? 'Is Takendown' : 'Not Takendown'} </div>
    )
  }

  if (filter.field === 'accountAge') {
    return (
      <div>
        {filter.operator === 'gte' ? 'Min.' : 'Max.'} Account Age{' '}
        <span className="font-semibold">
          {filter.value} {filter.unit}
        </span>
      </div>
    )
  }

  if (filter.field === 'followersCount' || filter.field === 'followsCount') {
    return (
      <div>
        {filter.operator === 'gte' ? 'Min.' : 'Max.'}{' '}
        {filter.field === 'followersCount' ? 'Follower' : 'Follow'} Count{' '}
        <span className="font-semibold">{filter.value}</span>
      </div>
    )
  }

  if (filter.field === 'displayName') {
    return (
      <div>
        Profile display name contains{' '}
        <span className="font-semibold">{filter.value}</span>
        <br />
        <span className="text-xs dark:text-gray-300">
          This filter is case-insensitive
        </span>
      </div>
    )
  }

  if (filter.field === 'content') {
    return (
      <div>
        Record content contains{' '}
        <span className="font-semibold">{filter.value}</span>
        <br />
        <span className="text-xs dark:text-gray-300">
          This filter is case-insensitive
        </span>
      </div>
    )
  }

  if (filter.field === 'description') {
    return (
      <div>
        Profile description contains{' '}
        <span className="font-semibold">{filter.value}</span>
        <br />
        <span className="text-sm">This filter is case-insensitive</span>
      </div>
    )
  }

  return (
    <div>
      {filter.field} {filter.operator} {filter.value}
    </div>
  )
}
