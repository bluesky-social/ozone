'use client'

import { useEffect, FormEvent, useState } from 'react'
import { VerificationFilterOptions } from './useVerificationList'
import { FormLabel, Input, Select } from '@/common/forms'
import { ActionButton } from '@/common/buttons'
import { ComAtprotoAdminDefs, ToolsOzoneModerationDefs } from '@atproto/api'
import { pluralize } from '@/lib/util'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { SubjectOverview } from '@/reports/SubjectOverview'
import { CopyButton } from '@/common/CopyButton'

type VerificationFilterPanelProps = {
  filters: VerificationFilterOptions
  onApplyFilters: (filters: VerificationFilterOptions) => void
  onResetFilters: () => void
  trustedVerifierSubjects?: ToolsOzoneModerationDefs.SubjectStatusView[]
}

type FilterFormState = {
  subjectsInput: string
  issuersInput: string
  isRevoked: string
  createdAfter: string
  createdBefore: string
}

const filtersToFormState = (
  filters: VerificationFilterOptions,
): FilterFormState => {
  return {
    subjectsInput: (filters.subjects || []).join(', '),
    issuersInput: (filters.issuers || []).join(', '),
    isRevoked:
      filters.isRevoked === undefined ? 'any' : filters.isRevoked.toString(),
    createdAfter: filters.createdAfter || '',
    createdBefore: filters.createdBefore || '',
  }
}

export const VerificationFilterPanel = ({
  filters,
  onApplyFilters,
  onResetFilters,
  trustedVerifierSubjects,
}: VerificationFilterPanelProps) => {
  const [formState, setFormState] = useState<FilterFormState>(
    filtersToFormState(filters),
  )

  useEffect(() => {
    setFormState(filtersToFormState(filters))
  }, [filters])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const applyFormStateToFilters = (formData: FilterFormState) => {
    const subjects = formData.subjectsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const issuers = formData.issuersInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const newFilters: VerificationFilterOptions = {
      subjects: subjects.length > 0 ? subjects : undefined,
      issuers: issuers.length > 0 ? issuers : undefined,
      isRevoked:
        formData.isRevoked === 'any'
          ? undefined
          : formData.isRevoked === 'true',
      createdAfter: formData.createdAfter || undefined,
      createdBefore: formData.createdBefore || undefined,
    }

    onApplyFilters(newFilters)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    applyFormStateToFilters(formState)
  }

  const handleReset = () => {
    setFormState({
      subjectsInput: '',
      issuersInput: '',
      isRevoked: 'any',
      createdAfter: '',
      createdBefore: '',
    })

    onResetFilters()
  }
  const applyTrustedVerifierFilter = () => {
    const subjects: string[] = []
    if (!trustedVerifierSubjects?.length) {
      return
    }

    for (const sub of trustedVerifierSubjects) {
      if (ComAtprotoAdminDefs.isRepoRef(sub.subject)) {
        subjects.push(sub.subject.did)
      }
    }

    if (!subjects.length) {
      return
    }

    const newFormState = {
      ...formState,
      issuersInput: subjects.join(', '),
    }
    setFormState(newFormState)
    applyFormStateToFilters(newFormState)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-b border-gray-200 dark:border-gray-700 py-2 my-1"
    >
      <FormLabel label="Subjects" className="mt-2">
        <Input
          type="text"
          name="subjectsInput"
          className="w-full"
          value={formState.subjectsInput}
          onChange={handleInputChange}
          placeholder="Comma separated list of subject dids"
        />
      </FormLabel>

      <FormLabel label="Issuers" className="mt-2">
        <Input
          type="text"
          name="issuersInput"
          className="w-full"
          value={formState.issuersInput}
          onChange={handleInputChange}
          placeholder="Comma separated list of issuer dids"
        />
      </FormLabel>

      {!!trustedVerifierSubjects?.length && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <button
            className="underline text-gray-800 dark:text-gray-300"
            onClick={applyTrustedVerifierFilter}
          >
            Click here
          </button>{' '}
          to only show verifications from{' '}
          <Popover className="inline-block">
            <PopoverButton className="underline text-gray-800 dark:text-gray-300">
              {pluralize(trustedVerifierSubjects.length, 'trusted verifier', {
                plural: 'trusted verifiers',
              })}
            </PopoverButton>
            <PopoverPanel
              anchor="bottom"
              className="rounded-sm dark:bg-slate-800"
            >
              <div className="p-3 dark:text-gray-300">
                {trustedVerifierSubjects.map((sub) => {
                  if (!ComAtprotoAdminDefs.isRepoRef(sub.subject)) {
                    return null
                  }
                  return (
                    <div
                      key={sub.subjectRepoHandle}
                      className="pb-1 flex flex-row"
                    >
                      <SubjectOverview
                        subject={{ did: sub.subject.did }}
                        subjectRepoHandle={sub.subjectRepoHandle}
                        withTruncation={true}
                      />

                      <CopyButton
                        text={sub.subject.did}
                        className="ml-1"
                        title={`Copy DID to clipboard`}
                      />
                    </div>
                  )
                })}
              </div>
            </PopoverPanel>
          </Popover>
        </p>
      )}

      {/* Revocation Status */}
      <FormLabel label="Revocation Status" className="mt-2">
        <Select
          name="isRevoked"
          value={formState.isRevoked}
          onChange={handleInputChange}
        >
          <option value="any">Any</option>
          <option value="true">Revoked</option>
          <option value="false">Not Revoked</option>
        </Select>
      </FormLabel>

      <div className="flex flex-row gap-3">
        <FormLabel
          label="Created After"
          htmlFor="createdAfter"
          className="flex-1 mt-2"
        >
          <Input
            type="datetime-local"
            id="createdAfter"
            name="createdAfter"
            className="block w-full dark:[color-scheme:dark]"
            value={formState.createdAfter}
            onChange={handleInputChange}
            autoComplete="off"
          />
        </FormLabel>

        <FormLabel
          label="Created Before"
          htmlFor="createdBefore"
          className="flex-1 mt-2"
        >
          <Input
            type="datetime-local"
            id="createdBefore"
            name="createdBefore"
            className="block w-full dark:[color-scheme:dark]"
            value={formState.createdBefore}
            onChange={handleInputChange}
            autoComplete="off"
            max={new Date().toISOString().split('T')[0]} // Set max to today
          />
        </FormLabel>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        <ActionButton type="submit" size="sm" appearance="primary">
          Apply Filters
        </ActionButton>

        <ActionButton
          type="button"
          size="sm"
          appearance="outlined"
          onClick={handleReset}
        >
          Reset Filters
        </ActionButton>
      </div>
    </form>
  )
}
