'use client'
import { useEffect, useState } from 'react'
import { useInterval } from 'react-use'
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
    <div className="flex flex-row justify-center py-4">
      <p className="font-bold text-xl">{getDuration(seconds)}</p>
    </div>
  )
}

// Right now, we only serve the tetris game here, in the future, we want to rotate
// between a few games/fun activities which is why it's named "surprise me"
export default function SurpriseMePage() {
  useEffect(() => {
    document.title = `Take a break!`
  }, [])

  return (
    <>
      {/* This is valid jsx but because of a known bug, typescript is confused */}
      {/* @ts-ignore:next-line */}
      <style global jsx>
        {`
          .game-block {
            margin: 0;
            padding: 0;
            width: 1.5em;
            height: 1.5em;
            border: 1px solid #ddd;
          }
          .piece-i {
            background-color: #ec858b;
          }
          .piece-j {
            background-color: #f1b598;
          }
          .piece-l {
            background-color: #f8efae;
          }
          .piece-o {
            background-color: #b5a677;
          }
          .piece-s {
            background-color: #816e56;
          }
          .piece-t {
            background-color: #b77c72;
          }
          .piece-z {
            background-color: #e3be58;
          }
          .piece-preview {
            background-color: #eee;
          }
        `}
      </style>
      <Timer />
      <ClientOnlyTetris />
    </>
  )
}
