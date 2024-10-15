import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { Dropdown } from './Dropdown'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const EmbedTypeTitles = {
  image: 'Image',
  video: 'Video',
  external: 'External',
}

export const EmbedTypePicker = ({
  embedType,
  setEmbedType,
}: {
  embedType?: string
  setEmbedType: (embedType?: string) => void
}) => {
  return (
    <Dropdown
      className="inline-flex justify-center items-center rounded-md text-sm dark:text-gray-200 text-gray-700"
      items={[
        {
          id: 'default',
          text: 'No embed filter',
          onClick: () => setEmbedType(),
        },
        {
          id: 'image',
          text: EmbedTypeTitles['image'],
          onClick: () => setEmbedType('image'),
        },
        {
          id: 'video',
          text: EmbedTypeTitles['video'],
          onClick: () => setEmbedType('video'),
        },
        {
          id: 'external',
          text: EmbedTypeTitles['external'],
          onClick: () => setEmbedType('external'),
        },
      ]}
      data-cy="lang-selector"
    >
      {embedType ? EmbedTypeTitles[embedType] : 'Embed type'}

      <ChevronDownIcon
        className="h-4 w-4 dark:text-gray-50"
        aria-hidden="true"
      />
    </Dropdown>
  )
}

export const EmbedTypePickerForModerationQueue = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const tagsParam = searchParams.get('tags')

  const tags = tagsParam?.split(',') || []

  const includedEmbedTypes = tags
    .filter((tag) => tag.startsWith('embed:'))
    .map((t) => t.replace('embed:', ''))

  const setEmbedType = (embedType?: string) => {
    const nextParams = new URLSearchParams(searchParams)

    if (embedType) {
      nextParams.set('tags', `embed:${embedType}`)
    } else {
      nextParams.delete('tags')
    }

    router.push((pathname ?? '') + '?' + nextParams.toString())
  }

  return (
    <EmbedTypePicker
      embedType={includedEmbedTypes[0]}
      setEmbedType={setEmbedType}
    />
  )
}
