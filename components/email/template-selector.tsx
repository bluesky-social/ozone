import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline'
import { Fragment, useState } from 'react'

import {
  Combobox,
  Transition,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/react'
import { ToolsOzoneCommunicationDefs } from '@atproto/api'
import { LanguageSelectorDropdown } from '@/common/LanguagePicker'
import { LabelChip } from '@/common/labels/List'
import { getLanguageName } from '@/lib/locale/helpers'

export const TemplateSelector = ({
  defaultLang,
  onSelect,
  communicationTemplates,
}: {
  defaultLang?: string
  onSelect: (name: string) => void
  communicationTemplates?: ToolsOzoneCommunicationDefs.TemplateView[]
}) => {
  const [selected, setSelected] = useState('')
  const [query, setQuery] = useState('')
  const [selectedLang, setSelectedLang] = useState<string | undefined>(
    defaultLang,
  )
  const matchingTemplates = communicationTemplates
    ?.filter((tpl) => {
      if (selectedLang && tpl.lang !== selectedLang) {
        return false
      }

      if (query.length) {
        return (
          tpl.name.toLowerCase().includes(query.toLowerCase()) && !tpl.disabled
        )
      }
      return !tpl.disabled
    })
    .sort((prev, next) => prev.name.localeCompare(next.name))

  return (
    <div className="flex flex-row items-center gap-2">
      <LanguageSelectorDropdown
        selectedLang={selectedLang}
        setSelectedLang={setSelectedLang}
      />
      <div className="w-full -mt-1">
        <Combobox
          value={selected}
          onChange={(selectedTpl) => {
            setSelected(selectedTpl || '')
            onSelect(selectedTpl || '')
          }}
          name="template"
        >
          <div className="relative mt-1 w-full">
            <div className="relative w-full cursor-default overflow-hidden rounded-md bg-white dark:bg-slate-700 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
              <ComboboxInput
                className="w-full rounded-md border-gray-300 dark:border-teal-500 dark:bg-slate-700 shadow-sm dark:shadow-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-teal-500 sm:text-sm dark:text-gray-100"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type keyword or click the arrows on the right to see all templates"
              />
              <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </ComboboxButton>
            </div>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              afterLeave={() => setQuery('')}
            >
              <ComboboxOptions className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                {!matchingTemplates?.length ? (
                  <NoTemplateOption {...{ selectedLang, query }} />
                ) : (
                  matchingTemplates?.map((tpl) => (
                    <ComboboxOption
                      key={tpl.name}
                      className={({ focus }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          focus
                            ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                            : 'text-gray-900 dark:text-gray-200'
                        }`
                      }
                      value={tpl.name}
                    >
                      {({ selected, focus }) => (
                        <>
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                focus ? 'text-indigo-900' : 'text-indigo-600'
                              }`}
                            >
                              <CheckIcon
                                className="h-5 w-5 dark:text-gray-50"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                          <div className="flex flex-row">
                            <span
                              className={`block truncate ${
                                selected ? 'font-medium' : 'font-normal'
                              }`}
                            >
                              {tpl.name}
                            </span>
                            {!!tpl.lang && (
                              <LabelChip className="dark:bg-slate-800 dark:text-gray-200 ml-2">
                                {getLanguageName(tpl.lang)}
                              </LabelChip>
                            )}
                          </div>
                        </>
                      )}
                    </ComboboxOption>
                  ))
                )}
              </ComboboxOptions>
            </Transition>
          </div>
        </Combobox>
      </div>
    </div>
  )
}

const NoTemplateOption = ({
  query = '',
  selectedLang,
}: {
  query?: string
  selectedLang?: string
}) => {
  return (
    <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-100">
      No template found {query.length ? `matching "${query}"` : ''}{' '}
      {selectedLang ? `in ${getLanguageName(selectedLang)} language` : ''}
    </div>
  )
}
