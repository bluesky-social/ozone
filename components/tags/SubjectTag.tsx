import { LabelChip } from '@/common/labels'
import { LANGUAGES_MAP_CODE2 } from '@/lib/locale/languages'
import { FlagIcon } from '@heroicons/react/24/solid'
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
    } else if (tag.endsWith('und')) {
      return (
        <LabelChip
          {...rest}
          title="Could not reliably determine primary language"
          aria-label="Could not reliably determine primary language"
        >
          lang?
        </LabelChip>
      )
    }
  }

  if (tag.startsWith('report:')) {
    const reportType = tag.split(':')[1]?.toLowerCase()
    return (
      <LabelChip
        {...rest}
        title={`Reported with reason ${reportType}`}
        aria-label={`Reported with reason ${reportType}`}
      >
        <FlagIcon className="h-3 w-3" /> {reportType}
      </LabelChip>
    )
  }

  return <LabelChip {...rest}>{tag}</LabelChip>
}
