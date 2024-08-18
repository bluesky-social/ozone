import Hls from 'hls.js/dist/hls.light' // Use light build of hls.
import { useEffect, useRef, useState } from 'react'

export default function VideoPlayer({
  source,
  thumbnail,
}: {
  source: string
  thumbnail: string
}) {
  const [hls] = useState(() => new Hls())
  const [isUnsupported, setIsUnsupported] = useState(false)

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
        setIsUnsupported(false)
        hls.loadSource(source)
      } else {
        setIsUnsupported(true)
      }
    }
  }, [source, hls])

  return (
    <video
      poster={thumbnail}
      ref={ref}
      style={{ flex: 1 }}
      playsInline
      preload="none"
      controls
      loop
      muted
    >
      {isUnsupported && (
        <p>
          Your browser does not seem to support HLS videos. Please switch to a
          different browser to view this content.
        </p>
      )}
    </video>
  )
}
