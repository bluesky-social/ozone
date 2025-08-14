'use client'
import {
  WrenchIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/20/solid'
import { useModToolContext } from './ModToolContext'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

type ModToolInfoProps = {
  modTool: {
    name: string
    meta?: Record<string, any>
  }
}

export const ModToolInfo = ({ modTool }: ModToolInfoProps) => {
  const { showModToolMeta, setShowModToolMeta } = useModToolContext()

  const hasMetadata = modTool.meta && Object.keys(modTool.meta).length > 0

  return (
    <div className="mt-2 border-t border-gray-200 dark:border-gray-600 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <WrenchIcon className="h-3 w-3" />
          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
            {modTool.name}
          </span>
          {hasMetadata && modTool.meta?.batchId && (
            <a
              href={`/events/batch/${modTool.meta.batchId}`}
              title="View Batch Actions"
              target="_blank"
            >
              <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gray-700 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" />
            </a>
          )}
        </div>
        {hasMetadata && (
          <button
            type="button"
            onClick={() => setShowModToolMeta(!showModToolMeta)}
            className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {showModToolMeta ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronRightIcon className="h-3 w-3" />
            )}
            <span>Metadata</span>
          </button>
        )}
      </div>

      {hasMetadata && showModToolMeta && (
        <div className="rounded bg-gray-50 dark:bg-gray-800">
          <div className="bg-gray-50 dark:bg-slate-700 dark:bg-slate-700 px-1 py-2 sm:p-2 font-mono whitespace-pre overflow-x-auto text-xs dark:text-gray-300">
            <pre>{JSON.stringify(modTool.meta, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
