'use client'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { asObject, asText } from './helpers'
import {
  Detail,
  RecordDate,
  RecordDates,
  RecordImage,
  SimpleRecord,
  SimpleRecordProps,
} from './SimpleRecord'

export function SocialGrainPhoto(props: SimpleRecordProps) {
  const record = asObject(props.value)
  const alt = asText(record.alt)
  const { width, height } = asObject(record.aspectRatio)
  const hasRatio = Number.isFinite(width) && Number.isFinite(height)
  return (
    <SimpleRecord
      {...props}
      type="Grain photo"
      icon={<PhotoIcon />}
      title="Photo"
      details={
        hasRatio && (
          <Detail label="Aspect ratio">
            {String(width)} × {String(height)}
          </Detail>
        )
      }
    >
      {record.createdAt !== undefined && (
        <RecordDates>
          <RecordDate label="Created" value={record.createdAt} />
        </RecordDates>
      )}
      <RecordImage
        record={props}
        blob={record.photo}
        alt={alt ?? ''}
        missingText="Photo image is missing or invalid."
      />
      {!alt && (
        <p className="mb-3 text-gray-500 dark:text-gray-400">
          No alt text provided.
        </p>
      )}
    </SimpleRecord>
  )
}
