import { CopyButton } from '@/common/CopyButton'
import { FormLabel, Input } from '@/common/forms'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { WORKSPACE_FORM_ID } from './constants'

export const ModToolForm = ({
  currentBatchId,
  handleRegenerateBatchId,
  externalUrl,
  setExternalUrl,
}: {
  currentBatchId: string
  handleRegenerateBatchId: () => void
  externalUrl?: string
  setExternalUrl?: (url: string) => void
}) => {
  return (
    <>
      <div className="mt-2 mb-3">
        <FormLabel label="External URL" htmlFor="externalUrl">
          <Input
            type="url"
            id="externalUrl"
            name="externalUrl"
            form={WORKSPACE_FORM_ID}
            className="block w-full"
            value={externalUrl}
            onChange={(e) => setExternalUrl?.(e.target.value)}
            placeholder="https://example.com (optional)"
          />
        </FormLabel>
      </div>

      <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Batch ID:
            </span>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 font-mono">
              {currentBatchId}
            </span>
          </div>
          <div>
            <CopyButton
              text={currentBatchId}
              className="mr-2"
              labelText="Batch ID "
              title={`Copy batch id to clipboard`}
            />
            <button
              type="button"
              onClick={handleRegenerateBatchId}
              className="text-xs text-white transition-colors"
              title="Regenerate Batch ID"
            >
              <ArrowPathIcon className="h-3 w-3 text-gray-500 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
