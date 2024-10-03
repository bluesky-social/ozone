import { LabelChip } from '@/common/labels'
import { LANGUAGES_MAP_CODE2 } from '@/lib/locale/languages'

export const SubjectTag = ({ tag }: { tag: string }) => {
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
  return <LabelChip>{tag}</LabelChip>
}
