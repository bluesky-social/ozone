'use client'

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react'
import { toast } from 'react-toastify'

type VideoTimestampContextValue = {
  registerVideo: (video: HTMLVideoElement) => () => void
  seekTo: (seconds: number) => void
}

const VideoTimestampContext = createContext<VideoTimestampContextValue | null>(
  null,
)

export function VideoTimestampProvider({ children }: { children: ReactNode }) {
  const videos = useRef(new Set<HTMLVideoElement>())

  const registerVideo = useCallback((video: HTMLVideoElement) => {
    videos.current.add(video)
    return () => videos.current.delete(video)
  }, [])

  const seekTo = useCallback((seconds: number) => {
    const video = videos.current.values().next().value
    if (!video) {
      toast.error('No video found')
      return
    }

    video.currentTime = seconds
    if (video.paused) {
      void video.play().catch(() => {
        toast.error('Unable to play video')
      })
    }
  }, [])

  const value = useMemo(
    () => ({ registerVideo, seekTo }),
    [registerVideo, seekTo],
  )

  return (
    <VideoTimestampContext.Provider value={value}>
      {children}
    </VideoTimestampContext.Provider>
  )
}

export function useVideoTimestamp() {
  return useContext(VideoTimestampContext)
}
