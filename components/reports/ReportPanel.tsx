import { useEffect, useState } from 'react'
import { ActionPanel } from '../common/ActionPanel'
import { ButtonPrimary, ButtonSecondary } from '../common/buttons'
import { FormLabel, Input, Textarea } from '../common/forms'
import { RecordCard, RepoCard } from '../common/RecordCard'
import { PropsOf } from '@/lib/types'
import { useQueryClient } from '@tanstack/react-query'
import { SubjectSwitchButton } from '@/common/SubjectSwitchButton'
import { reasonTypeOptions, groupedReasonTypes } from './helpers/getType'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  Transition,
} from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/24/solid'
import { Fragment } from 'react'

export function ReportPanel(
  props: PropsOf<typeof ActionPanel> & {
    subject?: string
    subjectOptions?: string[]
    onSubmit: (vals: ReportFormValues) => Promise<void>
  },
) {
  const { subject, subjectOptions, onSubmit, onClose, ...others } = props
  return (
    <ActionPanel title="Create a report" onClose={onClose} {...others}>
      <Form
        onCancel={onClose}
        onSubmit={onSubmit}
        subject={subject}
        subjectOptions={subjectOptions}
      />
    </ActionPanel>
  )
}

function Form(props: {
  subject?: string
  subjectOptions?: string[]
  onCancel: () => void
  onSubmit: (vals: ReportFormValues) => Promise<void>
}) {
  const {
    subject: fixedSubject,
    subjectOptions,
    onCancel,
    onSubmit,
    ...others
  } = props
  const [subject, setSubject] = useState(fixedSubject ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [selectedReason, setSelectedReason] = useState('')
  const [reasonQuery, setReasonQuery] = useState('')
  const queryClient = useQueryClient()

  // Update the subject when parent renderer wants to update it
  // This happens when the subject is loaded async on the renderer component
  // so on first render, we won't have the subject value yet
  useEffect(() => {
    if (fixedSubject) setSubject(fixedSubject)
  }, [fixedSubject])

  return (
    <form
      onSubmit={async (ev) => {
        ev.preventDefault()
        try {
          setSubmitting(true)
          const formData = new FormData(ev.currentTarget)
          await onSubmit({
            subject: formData.get('subject')!.toString(),
            reasonType: selectedReason,
            reason: formData.get('reason')!.toString() || undefined,
          })
          onCancel() // Close
          queryClient.invalidateQueries(['modEventList'])
        } finally {
          setSubmitting(false)
        }
      }}
      {...others}
    >
      <FormLabel
        label="Subject"
        htmlFor="subject"
        className="mb-3"
        extraLabel={
          <SubjectSwitchButton subject={subject} setSubject={setSubject} />
        }
      >
        <Input
          type="text"
          id="subject"
          name="subject"
          required
          list="subject-suggestions"
          placeholder="Subject"
          className="block w-full"
          readOnly={!!fixedSubject}
          value={subject}
          onChange={(ev) => setSubject(ev.target.value)}
          autoComplete="off"
        />
        <datalist id="subject-suggestions">
          {subjectOptions?.map((subject) => (
            <option key={subject} value={subject} />
          ))}
        </datalist>
      </FormLabel>
      {subject.startsWith('at://') && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-0 mb-3">
          <RecordCard uri={subject} />
        </div>
      )}
      {subject.startsWith('did:') && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 pb-1 mb-3">
          <RepoCard did={subject} />
        </div>
      )}
      {!subject.startsWith('at://') && !subject.startsWith('did:') && (
        <div className="rounded border-2 border-dashed border-gray-300 p-2 mb-3 text-center">
          <span className="text-xs text-gray-400">Preview</span>
        </div>
      )}
      <FormLabel label="Reason" htmlFor="reasonType" className="mb-3">
        <ReasonTypeCombobox
          selectedReason={selectedReason}
          onSelect={setSelectedReason}
          query={reasonQuery}
          onQueryChange={setReasonQuery}
        />
      </FormLabel>
      <Textarea
        name="reason"
        placeholder="Details"
        className="block w-full mb-3"
      />
      <div className="text-right">
        <ButtonSecondary
          className="mr-4"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </ButtonSecondary>
        <ButtonPrimary type="submit" disabled={submitting}>
          Submit
        </ButtonPrimary>
      </div>
    </form>
  )
}

export type ReportFormValues = {
  subject: string
  reasonType: string
  reason?: string
}

function ReasonTypeCombobox({
  selectedReason,
  onSelect,
  query,
  onQueryChange,
}: {
  selectedReason: string
  onSelect: (reason: string) => void
  query: string
  onQueryChange: (query: string) => void
}) {
  const [isFocused, setIsFocused] = useState(false)
  
  // Create a flat list of all reason types with their categories for searching
  const allReasonTypes = Object.entries(groupedReasonTypes).flatMap(
    ([categoryName, reasonTypes]) =>
      reasonTypes.map((reasonType) => ({
        value: reasonType,
        label: reasonTypeOptions[reasonType] || reasonType,
        category: categoryName,
      }))
  )

  const filteredReasonTypes = allReasonTypes.filter((reason) => {
    if (!query) return true
    const searchText = query.toLowerCase()
    return (
      reason.label.toLowerCase().includes(searchText) ||
      reason.category.toLowerCase().includes(searchText) ||
      reason.value.toLowerCase().includes(searchText)
    )
  })

  // Group filtered results by category
  const groupedFilteredResults = filteredReasonTypes.reduce((acc, reason) => {
    if (!acc[reason.category]) {
      acc[reason.category] = []
    }
    acc[reason.category].push(reason)
    return acc
  }, {} as Record<string, typeof filteredReasonTypes>)

  return (
    <Combobox
      value={selectedReason}
      onChange={(value) => {
        onSelect(value || '')
        setIsFocused(false)
      }}
    >
      <div className="relative mt-1 w-full">
        <div className="relative w-full cursor-default overflow-hidden rounded-md bg-white dark:bg-slate-700 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
          <ComboboxInput
            className="w-full rounded-md border-gray-300 dark:border-teal-500 dark:bg-slate-700 shadow-sm dark:shadow-slate-700 focus:border-indigo-500 focus:ring-indigo-500 dark:focus:ring-teal-500 sm:text-sm dark:text-gray-100"
            onChange={(event) => onQueryChange(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            displayValue={(value: string) => {
              return isFocused ? '' : reasonTypeOptions[value] || value || ''
            }}
            placeholder="Select reason type. Type to search..."
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
          afterLeave={() => onQueryChange('')}
        >
          <ComboboxOptions className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-700 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
            {Object.keys(groupedFilteredResults).length === 0 ? (
              <div className="relative cursor-default select-none px-4 py-2 text-gray-700 dark:text-gray-100">
                No reason types found {query ? `matching "${query}"` : ''}.
              </div>
            ) : (
              Object.entries(groupedFilteredResults).map(([categoryName, reasons]) => (
                <div key={categoryName}>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-slate-600">
                    {categoryName}
                  </div>
                  {reasons.map((reason) => (
                    <ComboboxOption
                      key={reason.value}
                      className={({ focus }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          focus
                            ? 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-gray-200'
                            : 'text-gray-900 dark:text-gray-200'
                        }`
                      }
                      value={reason.value}
                      onClick={() => setIsFocused(false)}
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
                          <span
                            className={`block truncate ${
                              selected ? 'font-medium' : 'font-normal'
                            }`}
                          >
                            {reason.label}
                          </span>
                        </>
                      )}
                    </ComboboxOption>
                  ))}
                </div>
              ))
            )}
          </ComboboxOptions>
        </Transition>
      </div>
    </Combobox>
  )
}
