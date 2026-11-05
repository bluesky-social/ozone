'use client'
import { NewspaperIcon } from '@heroicons/react/24/outline'
import { asObject, asText } from './helpers'
import {
  Detail,
  ExternalUrl,
  RecordDescription,
  RecordImage,
  SimpleRecord,
  SimpleRecordProps,
} from './SimpleRecord'

// Theme and preferences stay in the raw JSON: untrusted publication styling
// must not leak into the moderator UI.
export function SiteStandardPublication(props: SimpleRecordProps) {
  const record = asObject(props.value)
  return (
    <SimpleRecord
      {...props}
      type="Standard publication"
      icon={<NewspaperIcon />}
      title={asText(record.name) || 'Unnamed publication'}
      details={
        <Detail label="URL">
          {record.url === undefined ? (
            'Not provided'
          ) : (
            <ExternalUrl value={record.url} />
          )}
        </Detail>
      }
    >
      <RecordImage record={props} blob={record.icon} alt="Publication icon" />
      <RecordDescription value={record.description} />
    </SimpleRecord>
  )
}
