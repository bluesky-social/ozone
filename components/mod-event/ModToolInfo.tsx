'use client'
import { WrenchIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { useModToolContext } from './ModToolContext'
import { classNames } from '@/lib/util'

interface ModToolInfoProps {
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
          <WrenchIcon className="h-4 w-4" />
          <span className="font-medium">Tool:</span>
          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
            {modTool.name}
          </span>
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
        <div className="mt-2 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-3 py-2">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">
            Tool Metadata:
          </div>
          <div className="font-mono text-xs whitespace-pre overflow-x-auto text-gray-800 dark:text-gray-200">
            {JSON.stringify(modTool.meta, null, 2)}
          </div>
        </div>
      )}
    </div>
  )
}