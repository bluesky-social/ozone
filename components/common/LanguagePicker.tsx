import { getLanguageName } from '@/lib/locale/helpers'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { Dropdown } from './Dropdown'

// Please make sure that any item added here exists in LANGUAGES_MAP_CODE2 or add it there first
export const availableLanguageCodes = [
  'en',
  'es',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'pt',
  'ru',
  'zh',
  'ar',
]

export const LanguageSelectorDropdown = ({
  selectedLang,
  setSelectedLang,
}: {
  selectedLang?: string
  setSelectedLang: (lang?: string) => void
}) => {
  const selectedText = selectedLang
    ? getLanguageName(selectedLang)
    : 'No Specific Language'

  return (
    <Dropdown
      className="inline-flex justify-center rounded-md border border-gray-300 dark:border-teal-500 bg-white dark:bg-slate-800 dark:text-gray-100 dark:focus:border-teal-500  dark px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
      items={[
        {
          id: 'default',
          text: 'No Specific Language',
          onClick: () => setSelectedLang(),
        },
        ...availableLanguageCodes.map((lang) => ({
          id: lang,
          text: getLanguageName(lang),
          onClick: () => setSelectedLang(lang),
        })),
      ]}
      data-cy="lang-selector"
    >
      {selectedText}

      <ChevronDownIcon
        className="ml-2 -mr-1 h-5 w-5 text-violet-200 hover:text-violet-100"
        aria-hidden="true"
      />
    </Dropdown>
  )
}
