'use client'
import { useState } from 'react'
import Tetris from 'react-tetris'
import { useInterval } from 'react-use'

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
      <Tetris
        keyboardControls={{
          // Default values shown here. These will be used if no
          // `keyboardControls` prop is provided.
          down: 'MOVE_DOWN',
          left: 'MOVE_LEFT',
          right: 'MOVE_RIGHT',
          space: 'HARD_DROP',
          z: 'FLIP_COUNTERCLOCKWISE',
          x: 'FLIP_CLOCKWISE',
          up: 'FLIP_CLOCKWISE',
          p: 'TOGGLE_PAUSE',
          c: 'HOLD',
          shift: 'HOLD',
        }}
      >
        {({
          HeldPiece,
          Gameboard,
          PieceQueue,
          points,
          linesCleared,
          state,
          controller,
        }) => (
          <div className="flex flex-row gap-x-4 items-start pt-4 mx-auto">
            <HeldPiece />
            <div>
              <p>Points: {points}</p>
              <p>Lines Cleared: {linesCleared}</p>
            </div>
            <Gameboard />
            <PieceQueue />
            {state === 'LOST' && (
              <div>
                <h2>Game Over</h2>
                <button onClick={controller.restart}>New game</button>
              </div>
            )}
          </div>
        )}
      </Tetris>
    </>
  )
}
