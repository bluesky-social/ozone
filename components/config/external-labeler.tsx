import { useEffect, useState } from 'react'

import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { FormLabel, Input } from '@/common/forms'
import { useLabelerServiceDef } from '@/common/labels/useLabelerDefinition'
import {
  addExternalLabelerDid,
  getExternalLabelers,
  removeExternalLabelerDid,
} from './data'
import { isDarkModeEnabled } from '@/common/useColorScheme'
import dynamic from 'next/dynamic'
import client from '@/lib/client'
import { ErrorInfo } from '@/common/ErrorInfo'
import { buildBlueSkyAppUrl } from '@/lib/util'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid'

const BrowserReactJsonView = dynamic(() => import('react-json-view'), {
  ssr: false,
})

export const ExternalLabelerConfig = () => {
  const [labelers, setLabelers] = useState<Record<string, any>>({})
  const [did, setDid] = useState<string>('')
  const labelerServiceDef = useLabelerServiceDef(did)
  const labelerDetails = Object.entries(labelers)
  const darkMode = isDarkModeEnabled()
  const originalServiceDid = client.getServiceDid()?.split('#')[0]

  useEffect(() => {
    setLabelers(getExternalLabelers())
  }, [])
  const alreadySubscribed = !!labelerDetails.find(([d]) => d === did)

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
              disabled={!labelerServiceDef || alreadySubscribed}
              onClick={() => {
                const labelers = addExternalLabelerDid(did, labelerServiceDef)
                setLabelers(labelers)
                setDid('')
              }}
            >
              <span className="text-sm sm:text-base">Subscribe</span>
            </ActionButton>
          </div>
          {did && !labelerServiceDef && (
            <ErrorInfo type="warn">Labeler profile not found!</ErrorInfo>
          )}
          {did && alreadySubscribed && (
            <ErrorInfo type="warn">
              You{"'"}re already subscribed to this labeler!
            </ErrorInfo>
          )}

          {labelerDetails.length ? (
            <div className="mt-4">
              <h4 className="font-bold pb-2 text-sm">Configured labelers</h4>
              {labelerDetails.map(([labelerDid, labeler], i) => (
                <div
                  key={labeler.uri}
                  className={`pb-2 dark:border-gray-600 border-gray-300 ${
                    i < labelerDetails.length - 1 ? 'border-b mb-2' : ''
                  }`}
                >
                  <h5 className="text-base flex items-center">
                    <a
                      target="_blank"
                      href={buildBlueSkyAppUrl({
                        did: labelerDid,
                      })}
                    >
                      {labeler.creator.displayName}
                    </a>{' '}
                    <ArrowTopRightOnSquareIcon className="ml-1 h-4 w-4" />
                  </h5>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {labeler.creator.description}
                  </p>
                  <div className="my-2">
                    <BrowserReactJsonView
                      collapsed
                      src={labeler}
                      theme={darkMode ? 'harmonic' : 'rjv-default'}
                      name={null}
                      quotesOnKeys={false}
                      displayObjectSize={false}
                      displayDataTypes={false}
                      enableClipboard={false}
                      validationMessage="Cannot delete property"
                    />
                  </div>
                  {originalServiceDid !== labeler.creator.did && (
                    <ActionButton
                      size="xs"
                      appearance="outlined"
                      className="px-2 sm:px-4 sm:mr-2"
                      onClick={() => {
                        const labelers = removeExternalLabelerDid(
                          labeler.creator.did,
                        )
                        setLabelers(labelers)
                      }}
                    >
                      <span className="text-sm sm:text-base">Unsubscribe</span>
                    </ActionButton>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2">No external labeler configured</p>
          )}
        </div>
      </Card>
    </>
  )
}
