import { useEffect, useMemo, useState } from 'react'
import { useTitle } from 'react-use'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useMutation } from '@tanstack/react-query'
import { AppBskyLabelerService } from '@atproto/api'
import client, { ClientSession } from '@/lib/client'
import { useSession } from '@/lib/useSession'
import { ButtonGroup, ButtonPrimary, ButtonSecondary } from '@/common/buttons'
import { Card } from '@/common/Card'
import { ErrorInfo } from '@/common/ErrorInfo'
import { useSyncedState } from '@/lib/useSyncedState'
import { isDarkModeEnabled } from '@/common/useColorScheme'
import { ExternalLabelerConfig } from '@/config/external-labeler'
import { Checkbox, Textarea } from '@/common/forms'
import { ServerConfig } from '@/config/server-config'

const BrowserReactJsonView = dynamic(() => import('react-json-view'), {
  ssr: false,
})

export default function ConfigurePageContent() {
  useTitle('Configure')
  const session = useSession()
  useEffect(() => {
    client.reconfigure() // Ensure config is up to date
  }, [])
  if (!session) return null
  const isServiceAccount = session.did === session.config.did
  return (
    <div className="w-5/6 sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto my-4 dark:text-gray-100">
      {isServiceAccount && <ConfigureDetails session={session} />}
      {!isServiceAccount && (
        <div>
          <h3 className="font-medium text-lg text-gray-700 dark:text-gray-100">
            Configure
          </h3>
          <Card className="mt-4 p-4">
            Your service account owner{' '}
            {session?.config.handle && <b>{session?.config.handle}</b>} will be
            able to see more configuration here.
          </Card>
        </div>
      )}

      <ServerConfig session={session} />
      <ExternalLabelerConfig />
    </div>
  )
}

function ConfigureDetails({ session }: { session: ClientSession }) {
  const record = session.config.labeler ?? null
  return (
    <div>
      <h3 className="font-medium text-lg text-gray-700 dark:text-gray-100">
        Configure
      </h3>
      <Card className="mt-4 p-4 pb-6">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          Service Record
        </h4>
        <p className="mt-2">
          The existence of a service record makes your service account <b></b>{' '}
          available in the Bluesky application, allowing users to choose to use
          your labeling service. It contains a labeling policy with two parts:
          <ul className="list-disc list-inside mt-2 pl-4">
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
          </ul>
        </p>
        {!record && <RecordInitStep repo={session.config.did} />}
        {record && <RecordEditStep repo={session.config.did} record={record} />}
      </Card>
    </div>
  )
}

function RecordInitStep({ repo }: { repo: string }) {
  const [checked, setChecked] = useState(false)
  const createInitialRecord = useMutation({
    mutationFn: async () => {
      await client.api.com.atproto.repo.putRecord({
        repo,
        collection: 'app.bsky.labeler.service',
        rkey: 'self',
        record: {
          createdAt: new Date().toISOString(),
          policies: { labelValues: [] },
        },
      })
      await client.reconfigure()
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
}: {
  record: AppBskyLabelerService.Record
  repo: string
}) {
  const [editorMode, setEditorMode] = useState<'json' | 'plain'>('json')
  const darkMode = isDarkModeEnabled()
  const [recordVal, setRecordVal] = useSyncedState(record)
  const [plainTextRecord, setPlainTextRecord] = useSyncedState(
    JSON.stringify(record.policies, null, 2),
  )
  const [isPlainTextInvalid, setIsPlainTextInvalid] = useState<boolean>(false)
  const invalid = useMemo(() => {
    const validation = AppBskyLabelerService.validateRecord(recordVal)
    if (validation.success) return null
    return validation.error.message
  }, [recordVal])
  const updateRecord = useMutation({
    mutationFn: async () => {
      await client.api.com.atproto.repo.putRecord({
        repo,
        collection: 'app.bsky.labeler.service',
        rkey: 'self',
        record: recordVal,
      })
      await client.reconfigure()
    },
  })
  const addLabelValue = () => {
    setRecordVal({
      ...recordVal,
      policies: {
        ...recordVal.policies,
        labelValues: ['label-name', ...recordVal.policies.labelValues],
      },
    })
  }
  const addLabelDefinition = () => {
    setRecordVal({
      ...recordVal,
      policies: {
        ...recordVal.policies,
        labelValueDefinitions: [
          {
            identifier: 'label-name',
            severity: 'inform|alert|none',
            blurs: 'content|media|none',
            defaultSetting: 'ignore|warn|hide',
            adultOnly: false,
            locales: [
              {
                lang: 'en',
                name: 'Label Display Name',
                description: 'Label description.',
              },
            ],
          },
          ...(recordVal.policies.labelValueDefinitions ?? []),
        ],
      },
    })
  }
  return (
    <div>
      <div className="flex justify-evenly mt-4 mb-4">
        <ButtonSecondary onClick={addLabelValue} className="mx-1">
          Add label value
        </ButtonSecondary>
        <ButtonSecondary onClick={addLabelDefinition} className="mx-1">
          Add label definition
        </ButtonSecondary>
        <div className="flex-grow text-right">
          <ButtonPrimary
            onClick={() => updateRecord.mutate()}
            disabled={!!invalid || updateRecord.isLoading}
            className="mx-1"
          >
            Save
          </ButtonPrimary>
        </div>
      </div>

      <div className="my-2 justify-end sm:flex">
        <ButtonGroup
          size="xs"
          className="ml-0"
          appearance="primary"
          items={[
            {
              id: 'JSON',
              text: 'JSON Editor',
              isActive: editorMode === 'json',
              onClick: () => setEditorMode('json'),
            },
            {
              id: 'plain',
              text: 'Plain Editor',
              isActive: editorMode === 'plain',
              onClick: () => setEditorMode('plain'),
            },
          ]}
        />
      </div>
      {!!updateRecord.error && (
        <ErrorInfo>{updateRecord.error['message']}</ErrorInfo>
      )}
      {invalid && <ErrorInfo type="warn">{invalid}</ErrorInfo>}
      {isPlainTextInvalid && editorMode === 'plain' && (
        <ErrorInfo type="warn" className="mb-2">
          Invalid JSON input. Your changes can not be saved.
        </ErrorInfo>
      )}
      {editorMode === 'plain' ? (
        <div>
          <Textarea
            value={plainTextRecord}
            placeholder="Enter JSON here..."
            onChange={(ev) => {
              setPlainTextRecord(ev.target.value)
              try {
                setRecordVal({
                  ...recordVal,
                  policies: JSON.parse(ev.target.value) as any,
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
        <BrowserReactJsonView
          src={recordVal.policies}
          theme={darkMode ? 'harmonic' : 'rjv-default'}
          name={null}
          quotesOnKeys={false}
          displayObjectSize={false}
          displayDataTypes={false}
          enableClipboard={false}
          validationMessage="Cannot delete property"
          onEdit={(edit) => {
            const newRecord = {
              ...recordVal,
              policies: edit.updated_src as any,
            }
            setRecordVal(newRecord)
            setPlainTextRecord(JSON.stringify(newRecord.policies, null, 2))
          }}
          onDelete={(del) => {
            const [key, ...others] = del.namespace
            if (
              others.length ||
              (key !== 'labelValues' && key !== 'labelValueDefinitions')
            ) {
              // can only delete items directly out of labelValues and labelValueDefinitions
              return false
            }
            const newRecord = { ...recordVal, policies: del.updated_src as any }
            setRecordVal(newRecord)
            setPlainTextRecord(JSON.stringify(newRecord.policies, null, 2))
          }}
        />
      )}
    </div>
  )
}
