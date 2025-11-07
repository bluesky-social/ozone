import type { JSX } from 'react'
import { classNames } from '@/lib/util'

// Utility function to detect and replace links with <a> tags
const wrapLinksInText = (text: string): JSX.Element[] => {
  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/

  // Split text into parts, with URLs as matches
  const parts = text.split(urlRegex)

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // If part matches a URL, return it as a link
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all underline"
        >
          {part}
        </a>
      )
    }
    // Otherwise, return it as plain text
    return <span key={index}>{part}</span>
  })
}

export const TextWithLinks: React.FC<{ text: string; className?: string }> = ({
  text,
  className,
}) => {
  return (
    <p className={classNames(`whitespace-pre-wrap`, className)}>
      {wrapLinksInText(text)}
    </p>
  )
}
