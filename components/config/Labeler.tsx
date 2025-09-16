import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { AppBskyLabelerService } from '@atproto/api'
import { ActionButton, ButtonGroup, ButtonPrimary } from '@/common/buttons'
import { Card } from '@/common/Card'
import { ErrorInfo } from '@/common/ErrorInfo'
import { useSyncedState } from '@/lib/useSyncedState'
import { Checkbox, Textarea } from '@/common/forms'
import { ExternalLabelerConfig } from './external-labeler'
import { ServerConfig } from './server-config'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import { usePdsAgent } from '@/shell/AuthContext'
import { LocalPreferences } from './LocalPreferences'
import { QueueSetting } from 'components/setting/Queue'
import { toast } from 'react-toastify'
import { LabelerRecordView } from 'components/labeler/RecordView'
import { ActionTemplateConfig } from 'components/communication-template/action-template'
import { LabelGroupsConfig } from './LabelGroups'

export function LabelerConfig() {
  const { config, isServiceAccount } = useConfigurationContext()

  return (
    <div className="pt-4">
      {isServiceAccount && <ConfigureDetails />}
      {!isServiceAccount && (
        <div>
          <div className="flex flex-row justify-between mb-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-100">
              Labeler Configuration
            </h4>
          </div>
          <Card className="mt-4 p-4">
            Your service account owner {config.handle && <b>{config.handle}</b>}{' '}
            will be able to see more configuration here.
          </Card>
        </div>
      )}

      <ServerConfig />
      <QueueSetting />
      <ActionTemplateConfig />
      <LabelGroupsConfig />
      <LocalPreferences />
      <ExternalLabelerConfig />
    </div>
  )
}

const LabelerConfigDescription = () => {
  const [isFullView, setIsFullView] = useState(false)
  if (isFullView) {
    return (
      <div className="my-2 text-sm text-gray-500 dark:text-gray-300">
        <p>
          The existence of a service record makes your service account <b></b>{' '}
          available in the Bluesky application, allowing users to choose to use
          your labeling service. It contains a labeling policy consisting of a
          few parts:
        </p>
        <ul className="list-disc list-inside my-2 pl-4">
          <li>
            A list of{' '}
            <b>
              <code>labelValues</code>
            </b>
            : all label values that you intend to produce from your labeler.
          </li>
          <li>
            A list of{' '}
            <b>
              <code>labelValueDefinitions</code>
            </b>
            : details about how each custom label should be respected by the
            Bluesky application and presented to users.
          </li>
          <li>
            A list of{' '}
            <b>
              <code>subjectTypes</code>
            </b>
            : which can include `account` and/or `record`, specifying the
            subject types that users can submit reports for
          </li>
          <li>
            An array of{' '}
            <b>
              <code>subjectCollections</code>
            </b>
            : such as `app.bsky.feed.post`, specifying the types of records that
            can be reported by users.
          </li>
          <li>
            An array of{' '}
            <b>
              <code>reasonTypes</code>
            </b>
            : such as `com.atproto.moderation.defs#reasonOther`, specifying the
            report {'"'}reason types{'"'} that can be reported by users.
          </li>
        </ul>
        <p>
          <button
            type="button"
            onClick={() => setIsFullView(false)}
            className="text-blue-500"
          >
            Show Less
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="text-sm text-gray-500 dark:text-gray-300">
      <p className="my-2">
        The existence of a service record makes your service account available
        in the Bluesky application, allowing users to choose to use your
        labeling service.{' '}
        <button
          type="button"
          onClick={() => setIsFullView(true)}
          className="text-blue-500"
        >
          Show More
        </button>
      </p>
    </div>
  )
}

function ConfigureDetails() {
  const { config } = useConfigurationContext()
  const [editorMode, setEditorMode] = useState<'json' | 'ui'>('ui')

  return (
    <div>
      <h3 className="font-medium text-lg text-gray-700 dark:text-gray-100">
        Labeler Configuration
      </h3>
      <Card className="mt-4 p-4 pb-6">
        <div className="flex flex-row justify-between mb-2">
          <h4 className="font-medium text-gray-700 dark:text-gray-100">
            Service Record
          </h4>

          <ButtonGroup
            size="xs"
            className="ml-0"
            appearance="primary"
            items={[
              {
                id: 'ui',
                text: 'UI Editor',
                isActive: editorMode === 'ui',
                onClick: () => setEditorMode('ui'),
              },
              {
                id: 'json',
                text: 'JSON Editor',
                isActive: editorMode === 'json',
                onClick: () => setEditorMode('json'),
              },
            ]}
          />
        </div>
        <LabelerConfigDescription />
        {config.labeler ? (
          <RecordEditStep
            editorMode={editorMode}
            repo={config.did}
            record={config.labeler}
          />
        ) : (
          <RecordInitStep repo={config.did} />
        )}
      </Card>
    </div>
  )
}

const getEditableLabelerFields = (record: AppBskyLabelerService.Record) => {
  const editableRecord: Partial<AppBskyLabelerService.Record> = {
    policies: record.policies,
  }
  if (record.reasonTypes) {
    editableRecord.reasonTypes = record.reasonTypes
  }
  if (record.subjectTypes) {
    editableRecord.subjectTypes = record.subjectTypes
  }
  if (record.subjectCollections) {
    editableRecord.subjectCollections = record.subjectCollections
  }
  return editableRecord
}

function RecordInitStep({ repo }: { repo: string }) {
  const [checked, setChecked] = useState(false)
  const pdsAgent = usePdsAgent()

  const { reconfigure } = useConfigurationContext()

  const createInitialRecord = useMutation({
    mutationFn: async () => {
      await pdsAgent.com.atproto.repo.putRecord({
        repo,
        collection: 'app.bsky.labeler.service',
        rkey: 'self',
        record: {
          createdAt: new Date().toISOString(),
          policies: { labelValues: [] },
          subjectTypes: ['account', 'record'],
          subjectCollections: ['app.bsky.feed.post', 'app.bsky.actor.profile'],
          reasonTypes: [
            'com.atproto.moderation.defs#reasonSpam',
            'com.atproto.moderation.defs#reasonMisleading',
            'com.atproto.moderation.defs#reasonSexual',
            'com.atproto.moderation.defs#reasonRude',
            'com.atproto.moderation.defs#reasonAppeal',
            'com.atproto.moderation.defs#reasonOther',
          ],
        },
      })
      await reconfigure()
    },
  })
  return (
    <>
      <p className="mt-4">
        <b>You do not have a service record yet.</b> Would you like to create
        one?
      </p>
      {!!createInitialRecord.error && (
        <ErrorInfo>{createInitialRecord.error['message']}</ErrorInfo>
      )}
      <div className="text-center mt-4">
        <ButtonPrimary
          onClick={() => createInitialRecord.mutate()}
          disabled={!checked || createInitialRecord.isLoading}
        >
          Yes, create service record
        </ButtonPrimary>
      </div>
      <p className="text-center mt-2">
        <Checkbox
          checked={checked}
          onChange={(ev) => setChecked(ev.target.checked)}
          label={
            <>
              I have read the{' '}
              <Link
                href="https://bsky.social/about/support/community-guidelines#labeler"
                target="_blank"
                className="text-blue-500"
              >
                Bluesky Labeler Community Guidelines
              </Link>
            </>
          }
        />
      </p>
    </>
  )
}

function RecordEditStep({
  record,
  repo,
  editorMode,
}: {
  record: AppBskyLabelerService.Record
  repo: string
  editorMode: 'json' | 'ui'
}) {
  const pdsAgent = usePdsAgent()
  const { reconfigure } = useConfigurationContext()
  const [recordVal, setRecordVal] = useSyncedState(record)
  const [plainTextRecord, setPlainTextRecord] = useSyncedState(
    JSON.stringify(getEditableLabelerFields(record), null, 2),
  )
  const [isPlainTextInvalid, setIsPlainTextInvalid] = useState<boolean>(false)
  const invalid = useMemo(() => {
    const validation = AppBskyLabelerService.validateRecord(recordVal)
    if (validation.success) return null
    return validation.error.message
  }, [recordVal])
  const updateRecord = useMutation({
    mutationFn: async () => {
      await pdsAgent.com.atproto.repo.putRecord({
        repo,
        collection: 'app.bsky.labeler.service',
        rkey: 'self',
        record: recordVal,
      })
      toast.success('Service record updated')
      await reconfigure()
    },
  })
  return (
    <div>
      {isPlainTextInvalid && editorMode === 'json' && (
        <ErrorInfo type="warn" className="mb-2">
          Invalid JSON input. Your changes can not be saved.
        </ErrorInfo>
      )}
      {editorMode === 'json' ? (
        <div>
          <Textarea
            value={plainTextRecord}
            placeholder="Enter JSON here..."
            onChange={(ev) => {
              setPlainTextRecord(ev.target.value)
              try {
                setRecordVal({
                  ...recordVal,
                  ...(JSON.parse(ev.target.value) as any),
                })
                setIsPlainTextInvalid(false)
              } catch (e) {
                setIsPlainTextInvalid(true)
              }
            }}
            className="w-full h-96"
          />
        </div>
      ) : (
        <LabelerRecordView
          record={recordVal}
          onUpdate={(updatedRecord) => {
            try {
              setRecordVal(updatedRecord)
              setIsPlainTextInvalid(false)
            } catch (e) {
              setIsPlainTextInvalid(true)
            }
          }}
        />
      )}
      {!!updateRecord.error && (
        <ErrorInfo>{updateRecord.error['message']}</ErrorInfo>
      )}
      {invalid && <ErrorInfo type="warn">{invalid}</ErrorInfo>}
      <div className="flex flex-row justify-end gap-2">
        <ActionButton
          appearance="outlined"
          type="button"
          size="sm"
          onClick={() => setRecordVal(record)}
        >
          Reset
        </ActionButton>
        <ActionButton
          appearance="primary"
          size="sm"
          type="button"
          onClick={() => updateRecord.mutate()}
          disabled={!!invalid || updateRecord.isLoading}
        >
          Save
        </ActionButton>
      </div>
    </div>
  )
}
