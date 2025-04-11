import { LabelChip } from '@/common/labels/List'
import { LANGUAGES_MAP_CODE2 } from '@/lib/locale/languages'
import {
  AppBskyLabelerDefs,
  AppBskyLabelerService,
  ComAtprotoLabelDefs,
  ComAtprotoModerationDefs,
} from '@atproto/api'
import {
  ExclamationCircleIcon,
  EyeSlashIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/solid'
import { useState } from 'react'
import { LabelDefinitionEditor } from './DefinitionEditor'
import { Checkbox, Textarea } from '@/common/forms'
import { reasonTypeOptions } from '@/reports/helpers/getType'
import { ActionButton } from '@/common/buttons'

const reasonTypes = [
  ComAtprotoModerationDefs.REASONSPAM,
  ComAtprotoModerationDefs.REASONMISLEADING,
  ComAtprotoModerationDefs.REASONRUDE,
  ComAtprotoModerationDefs.REASONSEXUAL,
  ComAtprotoModerationDefs.REASONVIOLATION,
  ComAtprotoModerationDefs.REASONOTHER,
  ComAtprotoModerationDefs.REASONAPPEAL,
]

const subjectTypes = ['account', 'record', 'chat']

const LabelDefinitionView = ({
  label,
  definition,
  onUpdate,
}: {
  label: ComAtprotoLabelDefs.LabelValue
  definition?: ComAtprotoLabelDefs.LabelValueDefinition
  onUpdate: (
    label,
    updatedDef?: ComAtprotoLabelDefs.LabelValueDefinition,
  ) => void
}) => {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <LabelDefinitionEditor
        onCancel={() => setIsEditing(false)}
        definition={definition}
        label={label}
        onUpdate={(label, updatedDef) => {
          onUpdate(label, updatedDef)
          setIsEditing(false)
        }}
      />
    )
  }

  if (!definition) {
    return (
      <div className="mb-1 border-b border-gray-300 dark:border-gray-700 pb-2">
        <LabelChip className="ml-0">{label}</LabelChip>
        <button
          onClick={() => setIsEditing(true)}
          type="button"
          title={`Edit ${label} label definition`}
        >
          <PencilSquareIcon className="w-3 h-3 ml-1" />
        </button>
      </div>
    )
  }

  return (
    <div className="mb-1 border-b dark:border-gray-700 border-gray-300 pb-2">
      <div>
        <LabelChip className="ml-0">{definition.identifier}</LabelChip>
        {definition.adultOnly && <span className="text-sm">🔞 Adult Only</span>}
        <button
          onClick={() => setIsEditing(true)}
          type="button"
          title={`Edit ${definition.identifier} label definition`}
        >
          <PencilSquareIcon className="w-3 h-3 ml-1" />
        </button>
      </div>
      <div className="flex flex-row items-center mt-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 flex flex-row items-center border-r dark:border-gray-600 pr-2 mr-2">
          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
          Severity:
          <span className="capitalize text-gray-700 dark:text-gray-300 ml-1">
            {definition.severity}
          </span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 flex flex-row items-center border-r dark:border-gray-600 pr-2 mr-2">
          <EyeSlashIcon className="h-4 w-4 mr-1" />
          Blurs:
          <span className="capitalize text-gray-700 dark:text-gray-300 ml-1">
            {definition.blurs}
          </span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Default Setting:
          <span className="capitalize text-gray-700 dark:text-gray-300 ml-1">
            {definition.defaultSetting}
          </span>
        </p>
      </div>

      <div className="mt-2">
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
          Locales
        </h3>
        <div className="mt-2 space-y-2">
          {definition.locales.map((locale, index) => (
            <div
              key={index}
              className="p-3 border rounded bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-gray-700"
            >
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {LANGUAGES_MAP_CODE2[locale.lang]?.flag || `(${locale.lang})`}{' '}
                {locale.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {locale.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const LabelerRecordView = ({
  record,
  onUpdate,
}: {
  record: AppBskyLabelerService.Record
  onUpdate: (record: AppBskyLabelerService.Record) => void
}) => {
  return (
    <div>
      <div className="flex flex-row justify-between">
        <h3 className="border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">
          Labels
        </h3>
        <ActionButton
          appearance="secondary"
          size="xs"
          onClick={() => {
            const newPolicies: AppBskyLabelerDefs.LabelerPolicies = {
              labelValues: [...(record.policies.labelValues || []), ''],
            }

            if (record.policies.labelValueDefinitions) {
              newPolicies.labelValueDefinitions = [
                ...record.policies.labelValueDefinitions,
              ]
            }

            onUpdate({
              ...record,
              policies: newPolicies,
            })
          }}
        >
          Add Label
        </ActionButton>
      </div>
      {record.policies.labelValues.length === 0 && (
        <p className="text-red-500">No labels configured.</p>
      )}
      {record.policies.labelValues.map((label) => (
        <div key={label} className="pb-2">
          <LabelDefinitionView
            label={label}
            definition={record.policies.labelValueDefinitions?.find(
              (def) => def.identifier === label,
            )}
            onUpdate={(newLabel, newDefinition) => {
              const { labelValueDefinitions, labelValues } = record.policies

              // If definition is not set we need to remove existing definition if there is one
              // and then update the label value if there is an update
              if (!newDefinition) {
                const newDefinitions = labelValueDefinitions?.length
                  ? labelValueDefinitions.filter(
                      ({ identifier }) => identifier === label,
                    )
                  : labelValueDefinitions

                // Replace the label being edited with the updated value
                const newValues = labelValues.map((l) => {
                  if (l === label) {
                    return newLabel
                  }
                  return l
                })

                // Call update with the new label values and definitions
                return onUpdate({
                  ...record,
                  policies: {
                    ...record.policies,
                    labelValues: newValues,
                    labelValueDefinitions: newDefinitions,
                  },
                })
              }

              const newDefinitions = labelValueDefinitions?.length
                ? labelValueDefinitions.map((def) => {
                    if (def.identifier === label) {
                      return newDefinition
                    }
                    return def
                  })
                : [newDefinition]

              // Replace the label value from identifier value of definition
              const newValues = labelValues.map((l) => {
                if (l === label) {
                  return newDefinition.identifier
                }
                return l
              })

              onUpdate({
                ...record,
                policies: {
                  ...record.policies,
                  labelValues: newValues,
                  labelValueDefinitions: newDefinitions,
                },
              })
            }}
          />
        </div>
      ))}
      <div className="flex flex-row gap-3">
        <div>
          <h3 className="border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">
            Report Types
          </h3>
          {reasonTypes.map((reasonType) => {
            return (
              <div key={reasonType}>
                <Checkbox
                  value={reasonType}
                  defaultChecked={
                    !record.reasonTypes ||
                    record.reasonTypes?.includes(reasonType)
                  }
                  name={`reasonType-${reasonType}`}
                  className="mb-3 flex items-center leading-3"
                  onChange={(e) => {
                    let newReasonTypes =
                      record.reasonTypes === undefined
                        ? [...reasonTypes]
                        : [...record.reasonTypes]
                    if (e.target.checked) {
                      newReasonTypes.push(reasonType)
                    } else {
                      newReasonTypes = newReasonTypes.filter(
                        (type) => type !== reasonType,
                      )
                    }

                    if (newReasonTypes.length === 0) {
                      onUpdate({ ...record, reasonTypes: undefined })
                    } else {
                      onUpdate({ ...record, reasonTypes: newReasonTypes })
                    }
                  }}
                  label={
                    <span className="capitalize">
                      {reasonTypeOptions[reasonType]}
                    </span>
                  }
                />
              </div>
            )
          })}
        </div>
        <div>
          <h3 className="border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">
            Subject Types
          </h3>
          {subjectTypes.map((subjectType) => {
            return (
              <div key={subjectType}>
                <Checkbox
                  value={subjectType}
                  // When subjectTypes is falsy, it means the labeler accepts all subject types so we show all items as checked
                  defaultChecked={
                    !record.subjectTypes ||
                    record.subjectTypes?.includes(subjectType)
                  }
                  name={`subjectType-${subjectType}`}
                  className="mb-3 flex items-center leading-3"
                  onChange={(e) => {
                    let newSubjectTypes =
                      record.subjectTypes === undefined
                        ? [...subjectTypes]
                        : [...record.subjectTypes]
                    if (e.target.checked) {
                      newSubjectTypes.push(subjectType)
                    } else {
                      newSubjectTypes = newSubjectTypes.filter(
                        (type) => type !== subjectType,
                      )
                    }

                    if (newSubjectTypes.length === 0) {
                      onUpdate({ ...record, subjectTypes: undefined })
                    } else {
                      onUpdate({ ...record, subjectTypes: newSubjectTypes })
                    }
                  }}
                  label={<span className="capitalize">{subjectType}</span>}
                />
              </div>
            )
          })}
        </div>
        {(!record.subjectTypes || record.subjectTypes?.includes('record')) && (
          <div className="flex-1">
            <h3 className="border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">
              Subject Collections
            </h3>
            <Textarea
              className="w-full"
              placeholder="Comma separated list of nsids"
              onChange={(e) => {
                onUpdate({
                  ...record,
                  subjectCollections: e.target.value
                    .split(',')
                    .map((s) => s.trim()),
                })
              }}
            >
              {record.subjectCollections?.join(',')}
            </Textarea>
          </div>
        )}
      </div>
    </div>
  )
}
