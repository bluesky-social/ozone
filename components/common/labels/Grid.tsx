import { useState } from 'react'
import Select from 'react-tailwindcss-select'
import client from '@/lib/client'
import {
  labelOptions,
  groupLabelList,
  getLabelGroupInfo,
  buildAllLabelOptions,
} from './util'

const EMPTY_ARR = []
type SelectProps = React.ComponentProps<typeof Select>

export const LabelSelector = (props: LabelsProps) => {
  const {
    id,
    formId,
    name,
    defaultLabels = EMPTY_ARR,
    options = labelOptions,
    disabled,
    onChange,
  } = props
  const [selectedLabels, setSelectedLabels] = useState<SelectProps['value']>(
    defaultLabels.map((label) => ({
      label,
      value: label,
    })),
  )
  const allOptions = buildAllLabelOptions(defaultLabels, options)
  const groupedLabelList = groupLabelList(allOptions)
  const selectorOptions = Object.entries(groupedLabelList).map(
    ([group, groupInfo]) => ({
      label: group,
      options: groupInfo.labels.map((label) => {
        const labelText = typeof label === 'string' ? label : label.id
        return {
          label: labelText,
          value: labelText,
        }
      }),
    }),
  )

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
          const labelGroup = getLabelGroupInfo(data.label)
          return (
            <li
              className={`block transition duration-200 py-1 cursor-pointer select-none truncate`}
              style={{ color: labelGroup.color }}
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
