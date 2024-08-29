import Hls from 'hls.js/dist/hls.light' // Use light build of hls.
import { useEffect, useId, useRef, useState } from 'react'

export default function VideoPlayer({
  source,
  alt,
  thumbnail,
}: {
  source: string
  alt?: string
  thumbnail?: string
}) {
  const [hls] = useState(() => new Hls())
  const [isUnsupported, setIsUnsupported] = useState(false)
  const figId = useId()
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
    <figure>
      <video
        poster={thumbnail}
        ref={ref}
        style={{ flex: 1 }}
        playsInline
        preload="none"
        controls
        loop
        muted
        aria-labelledby={alt ? figId : undefined}
      >
        {isUnsupported && (
          <p>
            Your browser does not seem to support HLS videos. Please switch to a
            different browser to view this content.
          </p>
        )}
      </video>
      {alt && (
        <figcaption
          id={figId}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: 0,
          }}
        >
          {alt}
        </figcaption>
      )}
    </figure>
  )
}
