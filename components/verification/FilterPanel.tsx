'use client'

import { useEffect, FormEvent, useState } from 'react'
import { VerificationFilterOptions } from './useVerificationList'
import { FormLabel, Input, Select } from '@/common/forms'
import { ActionButton } from '@/common/buttons'

interface VerificationFilterPanelProps {
  filters: VerificationFilterOptions
  onApplyFilters: (filters: VerificationFilterOptions) => void
  onResetFilters: () => void
}

export const VerificationFilterPanel = ({
  filters,
  onApplyFilters,
  onResetFilters,
}: VerificationFilterPanelProps) => {
  const [formState, setFormState] = useState({
    subjectsInput: (filters.subjects || []).join(', '),
    issuersInput: (filters.issuers || []).join(', '),
    isRevoked:
      filters.isRevoked === undefined ? 'any' : filters.isRevoked.toString(),
    createdAfter: filters.createdAfter || '',
    createdBefore: filters.createdBefore || '',
  })

  useEffect(() => {
    setFormState({
      subjectsInput: (filters.subjects || []).join(', '),
      issuersInput: (filters.issuers || []).join(', '),
      isRevoked:
        filters.isRevoked === undefined ? 'any' : filters.isRevoked.toString(),
      createdAfter: filters.createdAfter || '',
      createdBefore: filters.createdBefore || '',
    })
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const subjects = formState.subjectsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const issuers = formState.issuersInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const newFilters: VerificationFilterOptions = {
      subjects: subjects.length > 0 ? subjects : undefined,
      issuers: issuers.length > 0 ? issuers : undefined,
      isRevoked:
        formState.isRevoked === 'any'
          ? undefined
          : formState.isRevoked === 'true',
      createdAfter: formState.createdAfter || undefined,
      createdBefore: formState.createdBefore || undefined,
    }

    onApplyFilters(newFilters)
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
