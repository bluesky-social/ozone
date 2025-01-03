'use client'
import { useState } from 'react'
import { useInterval, useTitle } from 'react-use'
import dynamic from 'next/dynamic'

// The game package uses some client only code so we can't really import and use it here because that breaks SSR for some reason
// even though we are not using SSR
const ClientOnlyTetris = dynamic(
  () => import('@/entertainment/tetris'),
  { ssr: false }, // <-- not including this component on server-side
)

function getDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const formattedHours = String(hours).padStart(2, '0')
  const formattedMinutes = String(minutes).padStart(2, '0')
  const formattedSeconds = String(seconds).padStart(2, '0')

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`
}

const Timer = () => {
  const [seconds, setSeconds] = useState(0)
  useInterval(() => {
    setSeconds((sec) => sec + 1)
  }, 1000)

  return (
    <div className="flex flex-row justify-center py-4 dark:text-gray-200">
      <p className="font-bold text-xl">{getDuration(seconds)}</p>
    </div>
  )
}

// Right now, we only serve the tetris game here, in the future, we want to rotate
// between a few games/fun activities which is why it's named "surprise me"
export default function SurpriseMePage() {
  useTitle(`Take a break!`)

  return (
    <>
      {/* This is valid jsx but because of a known bug, typescript is confused */}
      {/* @ts-ignore:next-line */}

      <Timer />
      <ClientOnlyTetris />
    </>
  )
}
