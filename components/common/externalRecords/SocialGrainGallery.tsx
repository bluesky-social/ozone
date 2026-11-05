'use client'
import { RectangleStackIcon } from '@heroicons/react/24/outline'
import { asObject, asText } from './helpers'
import {
  RecordDate,
  RecordDates,
  RecordDescription,
  SimpleRecord,
  SimpleRecordProps,
} from './SimpleRecord'

export function SocialGrainGallery(props: SimpleRecordProps) {
  const record = asObject(props.value)
  return (
    <SimpleRecord
      {...props}
      type="Grain gallery"
      icon={<RectangleStackIcon />}
      title={asText(record.title) || 'Untitled gallery'}
    >
      <RecordDates>
        <RecordDate label="Created" value={record.createdAt} />
      </RecordDates>
      <RecordDescription value={record.description} />
      <p className="mb-3 text-gray-500 dark:text-gray-400">
        Photos are separate records and are not included in this simple record.
      </p>
    </SimpleRecord>
  )
}
