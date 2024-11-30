import { getLanguageName } from '@/lib/locale/helpers'
import { CheckIcon } from '@heroicons/react/20/solid'
import { ActionButton } from '@/common/buttons'
import { availableLanguageCodes } from '@/common/LanguagePicker'
import { useQueueFilter } from '../useQueueFilter'
import { getLanguageFlag } from 'components/tags/SubjectTag'

// Tags can be any arbitrary string, and lang tags are prefixed with lang:[code2] so we use this to get the lang code from tag string
const getLangFromTag = (tag: string) => tag.split(':')[1]

export const QueueFilterLanguage = () => {
  const { queueFilters, toggleLanguage, clearLanguages } = useQueueFilter()
  const includedLanguages =
    queueFilters.tags
      ?.filter((tag) => tag.startsWith('lang:'))
      .map(getLangFromTag) || []
  const excludedLanguages =
    queueFilters.excludeTags
      ?.filter((tag) => tag.startsWith('lang:'))
      .map(getLangFromTag) || []

  return (
    <div>
      <div className="flex flex-row justify-between items-center mb-2">
        <h3 className="text-gray-900 dark:text-gray-200">Language Filters</h3>
      </div>
      <div className="flex flex-row gap-6 text-gray-700 dark:text-gray-100">
        <LanguageList
          disabled={excludedLanguages}
          selected={includedLanguages}
          header="Include"
          onSelect={(lang) => toggleLanguage('include', lang)}
        />
        <LanguageList
          disabled={includedLanguages}
          selected={excludedLanguages}
          header="Exclude"
          onSelect={(lang) => toggleLanguage('exclude', lang)}
        />
      </div>

      <p className="py-2 block max-w-xs text-gray-500 dark:text-gray-300 text-xs">
        Note:{' '}
        <i>
          When multiple languages are selected, only subjects that are tagged
          with <b>all</b> of those languages will be included/excluded.
        </i>
      </p>
      {(includedLanguages.length > 0 || excludedLanguages.length > 0) && (
        <ActionButton
          size="xs"
          appearance="outlined"
          onClick={() => {
            clearLanguages()
          }}
        >
          <span className="text-xs">Clear Language Filters</span>
        </ActionButton>
      )}
    </div>
  )
}

const LanguageList = ({
  header,
  onSelect,
  selected = [],
  disabled = [],
}: {
  selected: string[]
  disabled: string[]
  header: string
  onSelect: (lang: string) => void
}) => {
  return (
    <div>
      <h4 className="text-gray-900 dark:text-gray-200 border-b border-gray-400 mb-2 pb-1">
        {header}
      </h4>
      <div className="flex flex-col items-start">
        {availableLanguageCodes.map((code2) => {
          const isDisabled = disabled.includes(code2)
          return (
            <button
              className={`w-full flex flex-row items-center justify-between ${
                isDisabled
                  ? 'text-gray-400'
                  : 'text-gray-700 dark:text-gray-100'
              }`}
              onClick={() => !isDisabled && onSelect(code2)}
              key={code2}
            >
              {getLanguageFlag(code2)} {getLanguageName(code2)}
              {selected.includes(code2) && (
                <CheckIcon className="h-4 w-4 text-green-700" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
