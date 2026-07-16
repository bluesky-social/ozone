import { CopyButton } from '@/common/CopyButton'
import { FormLabel, Input } from '@/common/forms'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { WORKSPACE_FORM_ID } from './constants'

export const ModToolForm = ({
  currentBatchId,
  handleRegenerateBatchId,
  onBatchIdChange,
  externalUrl,
  setExternalUrl,
}: {
  currentBatchId: string
  handleRegenerateBatchId: () => void
  onBatchIdChange?: (batchId: string) => void
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

      <div className="mb-3">
        <FormLabel label="Batch ID" htmlFor="batchId">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              id="batchId"
              className="block w-full font-mono"
              value={currentBatchId}
              onChange={(e) => onBatchIdChange?.(e.target.value)}
              placeholder="Batch identifier"
              autoComplete="off"
            />
            <CopyButton
              text={currentBatchId}
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
        </FormLabel>
      </div>
    </>
  )
}
