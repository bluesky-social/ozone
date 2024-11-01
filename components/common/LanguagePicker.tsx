import { getLanguageName } from '@/lib/locale/helpers'
import { LANGUAGES_MAP_CODE2 } from '@/lib/locale/languages'
import { Popover, Transition } from '@headlessui/react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ActionButton } from './buttons'
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

const SelectionTitle = ({
  includedLanguages,
  excludedLanguages,
}: {
  includedLanguages: string[]
  excludedLanguages: string[]
}) => {
  if (includedLanguages.length === 0 && excludedLanguages.length === 0) {
    return (
      <span className="text-gray-700 dark:text-gray-100">All Languages</span>
    )
  }

  const includedNames = includedLanguages.map(
    (lang) => LANGUAGES_MAP_CODE2[lang].name,
  )
  const excludedNames = excludedLanguages.map(
    (lang) => LANGUAGES_MAP_CODE2[lang].name,
  )

  return (
    <>
      <span className="text-gray-700 dark:text-gray-100">
        {includedNames.join(', ')}
      </span>
      {includedNames.length > 0 && excludedNames.length > 0 && (
        <span className="text-gray-700 dark:text-gray-100 mx-1">|</span>
      )}
      <span className="text-gray-700 dark:text-gray-100">
        {excludedNames.map((name, i) => (
          <s key={name}>
            {name}
            {i < excludedNames.length - 1 && ', '}
          </s>
        ))}
      </span>
    </>
  )
}

export const LanguagePicker: React.FC = () => {
  return (
    <Popover>
      {({ open, close }) => (
        <>
          <Popover.Button className="text-sm flex flex-row items-center">
            <SelectionTitle {...{ includedLanguages, excludedLanguages }} />
            <ChevronDownIcon className="dark:text-gray-50 w-4 h-4" />
          </Popover.Button>

          {/* Use the `Transition` component. */}
          <Transition
            show={open}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Popover.Panel className="absolute left-0 z-10 mt-1 flex w-screen max-w-max -translate-x-1/5 px-4">
              <div className="w-fit-content flex-auto rounded bg-white dark:bg-slate-800 p-4 text-sm leading-6 shadow-lg dark:shadow-slate-900 ring-1 ring-gray-900/5">

              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

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
