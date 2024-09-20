import { getLanguageName } from '@/lib/locale/helpers'
import { AppBskyEmbedVideo } from '@atproto/api'
import Hls from 'hls.js/dist/hls.light' // Use light build of hls.
import { useEffect, useId, useRef, useState } from 'react'

export default function VideoPlayer({
  source,
  alt,
  thumbnail,
  captions,
  shouldBlur = false,
}: {
  source: string
  alt?: string
  thumbnail?: string
  captions: AppBskyEmbedVideo.Caption[]
  shouldBlur?: boolean
}) {
  const [hls] = useState(() => new Hls())
  const [isUnsupported, setIsUnsupported] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
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
    <figure
      className="flex-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video
        poster={thumbnail}
        ref={ref}
        playsInline
        preload="none"
        controls
        loop
        muted
        crossOrigin="anonymous"
        className={`w-full flex-1 transition-all duration-300 ease-in-out ${
          isHovered || !shouldBlur ? 'blur-none' : 'blur-md'
        } ${shouldBlur ? 'grayscale opacity-50' : ''}`}
        aria-labelledby={alt ? figId : undefined}
      >
        {!isHovered && shouldBlur && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-xl font-bold"></div>
        )}
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
