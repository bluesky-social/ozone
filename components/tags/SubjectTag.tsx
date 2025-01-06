import { LabelChip } from '@/common/labels'
import { LANGUAGES_MAP_CODE2 } from '@/lib/locale/languages'
import { ComponentProps } from 'react'

export const getLanguageFlag = (langCode: string) => {
  if (!langCode) return undefined

  const langDetails = LANGUAGES_MAP_CODE2[langCode]
  return langDetails?.flag
}

export const SubjectTag = ({
  tag,
  ...rest
}: { tag: string } & ComponentProps<typeof LabelChip>) => {
  if (tag.startsWith('lang:')) {
    const langCode = tag.split(':')[1]?.toLowerCase()
    const langDetails = LANGUAGES_MAP_CODE2[langCode]
    if (langDetails?.flag) {
      const title = `${langDetails.name}, Tag: ${tag}`
      return (
        <span title={title} aria-label={title}>
          {langDetails.flag}
        </span>
      )
    }
  }
  
  return <LabelChip {...rest}>{tag}</LabelChip>
}
