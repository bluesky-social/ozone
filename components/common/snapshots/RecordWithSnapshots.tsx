import { ReactNode, useState } from 'react'
import { useRecordSnapshots, RecordSnapshot } from '@/lib/useRecordSnapshots'
import { SnapshotIndicator } from './SnapshotIndicator'

interface RecordWithSnapshotsProps {
  uri: string
  children: (snapshot: RecordSnapshot | null) => ReactNode
  className?: string
}

export function RecordWithSnapshots({
  uri,
  children,
  className = 'pl-10',
}: RecordWithSnapshotsProps) {
  const [selectedSnapshot, setSelectedSnapshot] =
    useState<RecordSnapshot | null>(null)

  const {
    data: snapshotData,
    error: snapshotError,
    isLoading: snapshotsLoading,
  } = useRecordSnapshots(uri)

  const handleSelectSnapshot = (snapshot: RecordSnapshot) => {
    setSelectedSnapshot(snapshot)
  }

  const handleResetToLive = () => {
    setSelectedSnapshot(null)
  }

  return (
    <>
      {children(selectedSnapshot)}
      <div className={`flex items-center gap-2 ${className}`}>
        <SnapshotIndicator
          snapshots={snapshotData?.snapshots}
          total={snapshotData?.total}
          error={!!snapshotError}
          isLoading={snapshotsLoading}
          onSelectSnapshot={handleSelectSnapshot}
        />
        {selectedSnapshot && (
          <button
            type="button"
            onClick={handleResetToLive}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            (viewing snapshot - click to view live version)
          </button>
        )}
      </div>
    </>
  )
}
