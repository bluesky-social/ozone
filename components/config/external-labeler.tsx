import { HTMLAttributes, PropsWithChildren, useEffect, useState } from 'react'

import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { FormLabel, Input } from '@/common/forms'
import { useLabelerDefinitionQuery } from '@/common/labels/useLabelerDefinition'
import { isDarkModeEnabled } from '@/common/useColorScheme'
import dynamic from 'next/dynamic'
import { ErrorInfo } from '@/common/ErrorInfo'
import { buildBlueSkyAppUrl, classNames } from '@/lib/util'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid'
import { useConfigurationContext } from '@/shell/ConfigurationContext'
import { Loading } from '@/common/Loader'
import { useExternalLabelers } from '@/shell/ExternalLabelersContext'

const BrowserReactJsonView = dynamic(() => import('react-json-view'), {
  ssr: false,
})

export const ExternalLabelerConfig = () => {
  const { config } = useConfigurationContext()
  const [labelers, setLabelers] = useExternalLabelers()
  const [did, setDid] = useState('')

  const { data, error, isLoading } = useLabelerDefinitionQuery(did)
  const alreadyPresent = labelers.some((d) => d === did)

  return (
    <>
      <div className="flex flex-row justify-between my-4">
        <h4 className="font-medium text-gray-700 dark:text-gray-100">
          External Labeler
        </h4>
      </div>
      <Card className="mb-4 pb-4">
        <div className="p-2">
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
            You can subscribe to an external labeler and all labels added by
            that labeler to any subject will be displayed to you within ozone.
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
            Any labeler you subscribe to is saved on this browser only so, other
            team members won{"'"}t be able to see your subscriptions and if you
            login from a different browser, you will not have the same
            subscriptions there.
          </p>
          <p className="mt-1 text-sm text-gray-900 dark:text-gray-200">
            You can unsubscribe from any external labeler at any time.
          </p>

          <div className="flex flex-row justify-end items-end my-3 gap-2">
            <FormLabel label="Labeler DID" htmlFor="did" className="flex-1">
              <Input
                type="text"
                id="did"
                name="did"
                required
                placeholder="did:plc:..."
                className="block w-full"
                onChange={(e) => setDid(e.target.value)}
              />
            </FormLabel>
            <ActionButton
              size="sm"
              appearance="primary"
              className="px-2 sm:px-4 sm:mr-2 py-1.5"
              disabled={
                isLoading || !data || alreadyPresent || did === config.did
              }
              onClick={() => {
                setLabelers([...labelers, did])
                setDid('')
              }}
            >
              <span className="text-sm sm:text-base">Subscribe</span>
            </ActionButton>
          </div>
          {did && !data && !isLoading && (
            <ErrorInfo key="error" type="warn">
              {String(error || 'Labeler profile not found!')}
            </ErrorInfo>
          )}
          {did && alreadyPresent && (
            <ErrorInfo key="alreadyPresent" type="warn">
              You{"'"}re already subscribed to this labeler!
            </ErrorInfo>
          )}
          {did && did === config.did && (
            <ErrorInfo key="config" type="warn">
              The current service{"'"}s DID cannot be subscribed to as an
              external labeler.
            </ErrorInfo>
          )}

          <div className="mt-4">
            <h4 className="font-bold pb-2 text-sm">Configured labelers</h4>

            <ExternalLabelerView did={config.did} />

            {labelers.map((labelerDid) => (
              <div key={labelerDid}>
                <hr className="dark:border-gray-600 border-gray-300 my-2" />
                <ExternalLabelerView
                  did={labelerDid}
                  onUnsubscribe={() => {
                    setLabelers(labelers.filter((d) => d !== labelerDid))
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </>
  )
}

function ExternalLabelerView({
  did,
  onUnsubscribe,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  did: string
  onUnsubscribe?: () => void
}) {
  const darkMode = isDarkModeEnabled()
  const { isLoading, data, error, refetch } = useLabelerDefinitionQuery(did)

  return (
    <div className={classNames(`pb-2`, className)} {...props}>
      <h5 className="text-base flex items-center">
        <a target="_blank" href={buildBlueSkyAppUrl({ did })}>
          {data ? data.creator.displayName : did}
        </a>{' '}
        <ArrowTopRightOnSquareIcon className="ml-1 h-4 w-4" />
      </h5>
      {data ? (
        <>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            {data.creator.description}
          </p>

          <BrowserReactJsonView
            collapsed
            src={data}
            theme={darkMode ? 'harmonic' : 'rjv-default'}
            name={null}
            quotesOnKeys={false}
            displayObjectSize={false}
            displayDataTypes={false}
            enableClipboard={false}
            validationMessage="Cannot delete property"
          />
        </>
      ) : isLoading ? (
        <Loading />
      ) : (
        <ErrorInfo type="error">
          {String(error || 'Failed to load.')}{' '}
          <ActionButton
            size="xs"
            appearance="secondary"
            onClick={() => refetch()}
          >
            Reload
          </ActionButton>
          .
        </ErrorInfo>
      )}

      {onUnsubscribe && (
        <ActionButton
          key="unsubscribe"
          size="xs"
          appearance="outlined"
          className="mt-2 px-2 sm:px-4 sm:mr-2"
          onClick={() => onUnsubscribe()}
        >
          <span className="text-sm sm:text-base">Unsubscribe</span>
        </ActionButton>
      )}
      {children}
    </div>
  )
}
