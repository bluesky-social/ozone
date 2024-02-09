import { LANGUAGES } from '@/lib/locale/languages'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Select } from './forms'

const languagesInPicker = LANGUAGES.filter(({ code2 }) => !!code2)

export const LanguagePicker: React.FC = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const lang = searchParams.get('lang')

  const changeLanguage = (lang: string) => {
    const nextParams = new URLSearchParams(searchParams)

    if (lang) {
      nextParams.set('lang', lang)
    } else {
      nextParams.delete('lang')
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
