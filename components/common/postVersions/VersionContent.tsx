import { PostVersion } from '@/lib/postVersions'
import { diffWords, DiffPart } from '@/lib/wordDiff'

/**
 * The editable parts of a post version: text, alt text and languages. When
 * `previous` is set, shows what changed since that version.
 */
export function VersionContent({
  version,
  previous,
}: {
  version: PostVersion
  previous?: PostVersion
}) {
  const text = getText(version)
  const altTexts = getAltTexts(version)
  const previousAltTexts = previous ? getAltTexts(previous) : []
  const langs = getLangs(version)
  const previousLangs = previous ? getLangs(previous) : langs

  return (
    <>
      <p className="whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-gray-100">
        {previous ? (
          <DiffText parts={diffWords(getText(previous), text)} />
        ) : (
          text || (
            <span className="italic text-gray-400 dark:text-gray-500">
              No text
            </span>
          )
        )}
      </p>

      {altTexts.length > 0 && (
        <div className="mt-3 space-y-1">
          {altTexts.map((alt, i) => (
            <p
              key={i}
              className="text-xs text-gray-600 dark:text-gray-300 break-words"
            >
              <span className="font-medium">
                {altTexts.length > 1 ? `Alt text ${i + 1}: ` : 'Alt text: '}
              </span>
              {previous ? (
                <DiffText parts={diffWords(previousAltTexts[i] ?? '', alt)} />
              ) : (
                alt || <span className="italic">None</span>
              )}
            </p>
          ))}
        </div>
      )}

      {langs.join() !== previousLangs.join() && (
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
          <span className="font-medium">Languages: </span>
          <span className="line-through">
            {previousLangs.join(', ') || 'none'}
          </span>
          {' → '}
          {langs.join(', ') || 'none'}
        </p>
      )}
    </>
  )
}

/**
 * Which editable fields differ between two versions, e.g. ["text", "alt text"].
 */
export function getChangedFields(version: PostVersion, previous: PostVersion) {
  const changed: string[] = []
  if (getText(version) !== getText(previous)) changed.push('text')
  if (getAltTexts(version).join('\n') !== getAltTexts(previous).join('\n')) {
    changed.push('alt text')
  }
  if (getLangs(version).join() !== getLangs(previous).join()) {
    changed.push('languages')
  }
  return changed
}

function DiffText({ parts }: { parts: DiffPart[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'added') {
          return (
            <ins
              key={i}
              className="rounded-sm bg-green-100 text-green-900 no-underline dark:bg-green-900/40 dark:text-green-200"
            >
              {part.text}
            </ins>
          )
        }
        if (part.type === 'removed') {
          return (
            <del
              key={i}
              className="rounded-sm bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200"
            >
              {part.text}
            </del>
          )
        }
        return <span key={i}>{part.text}</span>
      })}
    </>
  )
}

type PostRecordish = {
  text?: unknown
  langs?: unknown
  embed?: {
    $type?: string
    alt?: string
    images?: { alt?: string }[]
    media?: { $type?: string; alt?: string; images?: { alt?: string }[] }
  }
}

function getText(version: PostVersion) {
  const record = version.record as PostRecordish
  return typeof record.text === 'string' ? record.text : ''
}

function getLangs(version: PostVersion) {
  const record = version.record as PostRecordish
  return Array.isArray(record.langs) ? (record.langs as string[]) : []
}

/**
 * Alt text of every image or video in the post, including media alongside a
 * quote post.
 */
function getAltTexts(version: PostVersion): string[] {
  const embed = (version.record as PostRecordish).embed
  if (!embed) return []
  const media = embed.media ?? embed
  if (media.images) return media.images.map((image) => image.alt ?? '')
  if (media.$type === 'app.bsky.embed.video') return [media.alt ?? '']
  return []
}
