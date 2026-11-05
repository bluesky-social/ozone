'use client'
import { VideoCameraIcon } from '@heroicons/react/24/outline'
import { asObject, asText, textList } from './helpers'
import { DataField } from '../DataField'
import {
  ExternalUrl,
  PostReferenceDetail,
  RecordDate,
  RecordDates,
  RecordImage,
  SimpleRecord,
  SimpleRecordProps,
  TagList,
} from './SimpleRecord'

// Timestamps are declared by the client and don't prove a stream is live, so
// no live/ended status is inferred and nothing is fetched or embedded.
export function PlaceStreamLivestream(props: SimpleRecordProps) {
  const record = asObject(props.value)
  const agent = asText(record.agent)
  return (
    <SimpleRecord
      {...props}
      type="Livestream"
      icon={<VideoCameraIcon />}
      title={asText(record.title) || 'Untitled livestream'}
      details={
        <>
          {record.canonicalUrl !== undefined && (
            <DataField label="Canonical (viewing) URL">
              <ExternalUrl value={record.canonicalUrl} />
            </DataField>
          )}
          {record.url !== undefined && (
            <DataField label="Replication URL">
              <ExternalUrl value={record.url} />
            </DataField>
          )}
          {agent && <DataField label="Agent">{agent}</DataField>}
          <PostReferenceDetail
            label="Announcing post"
            uri={asObject(record.post).uri}
          />
        </>
      }
    >
      <RecordDates>
        <RecordDate label="Created" value={record.createdAt} />
        {record.lastSeenAt !== undefined && (
          <RecordDate label="Last seen" value={record.lastSeenAt} />
        )}
        {record.endedAt !== undefined && (
          <RecordDate label="Ended" value={record.endedAt} />
        )}
      </RecordDates>
      <RecordImage
        record={props}
        blob={record.thumb}
        alt="Livestream thumbnail"
      />
      <TagList tags={textList(record.tags)} />
    </SimpleRecord>
  )
}
