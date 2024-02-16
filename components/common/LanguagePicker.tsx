import { LANGUAGES } from '@/lib/locale/languages'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Select } from './forms'

const languagesInPicker = LANGUAGES.filter(({ code2 }) => !!code2)

export const LanguagePicker: React.FC = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const tagsParam = searchParams.get('tags')
  const tags = tagsParam?.split(',') || []
  const lang = tags.find((tag) => tag.includes('lang:'))?.split(':')[1]

  const changeLanguage = (newLang: string) => {
    const nextParams = new URLSearchParams(searchParams)

    if (newLang) {
      nextParams.set(
        'tags',
        [
          ...tags.filter((tag) => !tag.includes('lang:')),
          `lang:${newLang}`,
        ].join(','),
      )
    } else {
      const newTags = tags.filter((tag) => !tag.includes('lang:'))
      if (newTags.length) {
        nextParams.set('tags', newTags.join(','))
      } else {
        nextParams.delete('tags')
      }
    }

    router.push((pathname ?? '') + '?' + nextParams.toString())
  }

  return (
    <Select
      value={lang || ''}
      className="!text-xs !py-1 max-w-xs w-32"
      onChange={(e) => changeLanguage(e.target.value)}
    >
      <option value="">All Languages</option>
      {languagesInPicker.map(({ code2, name }) => {
        return (
          <option key={code2} value={code2}>
            {name}
          </option>
        )
      })}
    </Select>
  )
}
