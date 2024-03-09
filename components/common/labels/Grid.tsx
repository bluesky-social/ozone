import client from '@/lib/client'
import { useState } from 'react'
import Select from 'react-tailwindcss-select'
import { ALL_LABELS, LabelGroupInfo } from './util'

const EMPTY_ARR = []
type SelectProps = React.ComponentProps<typeof Select>

export const LabelSelector = (props: LabelsProps) => {
  const {
    id,
    formId,
    name,
    defaultLabels = EMPTY_ARR,
    options = Object.keys(ALL_LABELS),
    disabled,
    onChange,
  } = props
  const [selectedLabels, setSelectedLabels] = useState<SelectProps['value']>(
    defaultLabels.map((label) => ({
      label,
      value: label,
    })),
  )
  const selectorOptions = [
    ...(client.session?.config.labeler?.policies?.['labelValues'] || []),
    ...Object.values(ALL_LABELS).map(({ identifier }) => identifier),
  ].map((label) => ({
    label,
    value: label,
  }))

  // TODO: selected label text doesn't feel very nice here
  return (
    <>
      <input
        type="hidden"
        name={name}
        {...{ id, formId, disabled }}
        value={
          Array.isArray(selectedLabels)
            ? selectedLabels.map(({ label }) => label).join(',')
            : ''
        }
      />
      <Select
        isMultiple
        isSearchable
        primaryColor=""
        value={selectedLabels}
        options={selectorOptions}
        formatOptionLabel={(data) => {
          return (
            <li
              className={`block transition duration-200 py-1 cursor-pointer select-none truncate`}
              style={{ color: LabelGroupInfo[data.label]?.color }}
            >
              {data.label}
            </li>
          )
        }}
        onChange={(value) => {
          setSelectedLabels(value)
          onChange?.(
            Array.isArray(value) ? value.map(({ value }) => value) : [],
          )
        }}
      />
    </>
  )
}

type LabelsProps = {
  id: string
  formId: string
  name: string
  disabled?: boolean
  defaultLabels?: string[]
  options?: string[]
  onChange?: (labels: string[]) => void
}
