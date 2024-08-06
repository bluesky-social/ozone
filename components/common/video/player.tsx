import Hls from 'hls.js/dist/hls.light' // Use light build of hls.
import { useEffect, useRef, useState } from 'react'

export default function VideoPlayer({
  source,
  poster,
}: {
  source: string
  poster: string
}) {
  const [hls] = useState(() => new Hls())

  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (ref.current && Hls.isSupported()) {
      hls.attachMedia(ref.current)

      return () => {
        hls.detachMedia()
      }
    }
  }, [hls])

  useEffect(() => {
    if (ref.current) {
      if (Hls.isSupported()) {
        hls.loadSource(source)
      } else {
        // TODO: fallback
      }
    }
  }, [source, hls])

  return (
    <video
      poster={poster}
      ref={ref}
      style={{ flex: 1 }}
      playsInline
      preload="none"
      controls
      loop
      muted
    />
  )
}
