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

  return (
    <Card className="mt-6 p-4 pb-6">
      <h4 className="font-medium text-gray-700 dark:text-gray-100">
        External Labeler
      </h4>
      <p className="mt-2">
        You can subscribe to an external labeler and all labels added by that
        labeler to any subject will be displayed to you within ozone.
      </p>
      <p className="mt-1">
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
          className="px-2 sm:px-4 sm:mr-2"
          disabled={
            !labelerServiceDef || !!labelerDetails.find(([d]) => d === did)
          }
          onClick={() => {
            const labelers = addExternalLabelerDid(did, labelerServiceDef)
            setLabelers(labelers)
            setDid('')
          }}
        >
          <span className="text-sm sm:text-base">Subscribe</span>
        </ActionButton>
      </div>

      {labelerDetails.length ? (
        <div className="mt-4">
          <h4 className="font-bold pb-2 text-sm">Configured labelers</h4>
          {labelerDetails.map(([_, labeler], i) => (
            <div
              key={labeler.uri}
              className={`pb-2 dark:border-gray-600 border-gray-300 ${
                i < labelerDetails.length - 1 ? 'border-b mb-2' : ''
              }`}
            >
              <h5 className="text-sm">{labeler.creator.displayName}</h5>
              <p className="text-xs">{labeler.creator.description}</p>
              <div className="my-1">
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
              {originalServiceDid === labeler.creator.did && (
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
        <p>No external labeler configured</p>
      )}
    </Card>
  )
}
