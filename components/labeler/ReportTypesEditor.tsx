import { Checkbox } from '@/common/forms'
import {
  getReasonLabel,
  groupedReasonTypes,
  reasonTypeOptions,
} from '@/reports/helpers/getType'

const availableReasonTypes = Object.keys(reasonTypeOptions)
const appealReasonTypes = new Set([
  'com.atproto.moderation.defs#reasonAppeal',
  'tools.ozone.report.defs#reasonAppeal',
])
const groupedTypes = new Set(Object.values(groupedReasonTypes).flat())
const reasonGroups: [string, string[]][] = [
  ...Object.entries(groupedReasonTypes),
  [
    'Additional report types',
    availableReasonTypes.filter((type) => !groupedTypes.has(type)),
  ],
]

export function ReportTypesEditor({
  value,
  onChange,
}: {
  value?: string[]
  onChange: (reasonTypes: string[] | undefined) => void
}) {
  const customTypes = [...new Set(value)].filter(
    (type) => !Object.hasOwn(reasonTypeOptions, type),
  )
  const groups: [string, string[]][] = [
    ...reasonGroups,
    ['Custom report types', customTypes],
  ]

  return (
    <div className="mb-4">
      <h3 className="border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">
        Report Types
      </h3>
      <Checkbox
        name="all-reason-types"
        checked={value === undefined}
        onChange={(event) =>
          onChange(event.target.checked ? undefined : [...availableReasonTypes])
        }
        label="Accept all report types, including custom and future types"
        className="flex items-center mb-2"
      />
      <div className="flex gap-3 text-xs mb-3">
        <button
          type="button"
          className="text-indigo-600 dark:text-teal-400 hover:underline"
          onClick={() =>
            onChange([...new Set([...availableReasonTypes, ...(value ?? [])])])
          }
        >
          Select all available types
        </button>
        <button
          type="button"
          className="text-indigo-600 dark:text-teal-400 hover:underline"
          onClick={() => onChange([])}
        >
          Clear selection
        </button>
      </div>
      {value !== undefined &&
        value.every((type) => appealReasonTypes.has(type)) && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Only appeals are accepted.
          </p>
        )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(([category, types]) =>
          types.length ? (
            <fieldset key={category} className="min-w-0">
              <legend className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                {category}
              </legend>
              {types.map((type) => {
                const isAppeal = appealReasonTypes.has(type)
                return (
                  <div key={type} title={type}>
                    <Checkbox
                      value={type}
                      name={`reasonType-${type}`}
                      checked={
                        isAppeal || value === undefined || value.includes(type)
                      }
                      disabled={isAppeal}
                      onChange={
                        isAppeal
                          ? undefined
                          : (event) => {
                              const selected = value ?? availableReasonTypes
                              onChange(
                                event.target.checked
                                  ? [...new Set([...selected, type])]
                                  : selected.filter(
                                      (selectedType) => selectedType !== type,
                                    ),
                              )
                            }
                      }
                      label={
                        <>
                          {getReasonLabel(type)}
                          {isAppeal && (
                            <span className="ml-1 text-gray-500 dark:text-gray-400">
                              (always accepted)
                            </span>
                          )}
                        </>
                      }
                      className="flex items-center mb-1 break-words"
                    />
                  </div>
                )
              })}
            </fieldset>
          ) : null,
        )}
      </div>
    </div>
  )
}
