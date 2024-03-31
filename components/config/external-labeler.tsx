import { useEffect, useState } from 'react'

import { ActionButton } from '@/common/buttons'
import { Card } from '@/common/Card'
import { FormLabel, Input } from '@/common/forms'
import { useLabelerServiceDef } from '@/common/labels/useLabelerDefinition'
import { addExternalLabelerDid, getExternalLabelers } from './data'
import { isDarkModeEnabled } from '@/common/useColorScheme'
import dynamic from 'next/dynamic'

const BrowserReactJsonView = dynamic(() => import('react-json-view'), {
  ssr: false,
})

export const ExternalLabelerConfig = () => {
  const [labelers, setLabelers] = useState<Record<string, any>>({})
  const [did, setDid] = useState<string>('')
  const labelerServiceDef = useLabelerServiceDef(did)
  const labelerDetails = Object.entries(labelers)
  const darkMode = isDarkModeEnabled()

  useEffect(() => {
    setLabelers(getExternalLabelers())
  }, [])

  return (
    <Card className="mt-6 p-4 pb-6">
      <h4 className="font-medium text-gray-700 dark:text-gray-100">
        External Labeler
      </h4>
      <p className="mt-2">
        You can add an external labeler and all labels added by that labeler to
        any subject will be displayed to you within ozone.
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
          <span className="text-sm sm:text-base">Add Labeler</span>
        </ActionButton>
      </div>

      {labelerDetails.length ? (
        <div className="mt-4">
          <h4 className="font-bold pb-2 text-sm">Configured labelers</h4>
          {labelerDetails.map(([_, labeler]) => (
            <div key={labeler.uri} className="pb-2">
              <h5 className="text-sm">{labeler.creator.displayName}</h5>
              <p className="text-xs">{labeler.creator.description}</p>
              <div className="mt-1">
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
            </div>
          ))}
        </div>
      ) : (
        <p>No external labeler configured</p>
      )}
    </Card>
  )
}
