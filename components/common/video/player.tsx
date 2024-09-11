import { getLanguageName } from '@/lib/locale/helpers'
import { AppBskyEmbedVideo } from '@atproto/api'
import Hls from 'hls.js/dist/hls.light' // Use light build of hls.
import { useEffect, useId, useRef, useState } from 'react'

export default function VideoPlayer({
  source,
  alt,
  thumbnail,
  captions,
}: {
  source: string
  alt?: string
  thumbnail?: string
  captions: AppBskyEmbedVideo.Caption[]
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
        crossOrigin="anonymous"
        aria-labelledby={alt ? figId : undefined}
      >
        {isUnsupported && (
          <p>
            Your browser does not seem to support HLS videos. Please switch to a
            different browser to view this content.
          </p>
        )}
        {captions.map((caption) => {
          return (
            <track
              key={caption.file.ref.toString()}
              label={getLanguageName(caption.lang)}
              kind="subtitles"
              srcLang={caption.lang}
              // Perhaps a risky assumption but as of now, it's safe to build subtitle URLs like this
              src={source.replace(
                'playlist.m3u8',
                `subtitles/${caption.lang}.vtt`,
              )}
              default
            />
          )
        })}
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
