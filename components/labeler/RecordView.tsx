import { LabelChip } from '@/common/labels'
import { LANGUAGES_MAP_CODE2 } from '@/lib/locale/languages'
import {
  AppBskyLabelerService,
  ComAtprotoLabelDefs,
  ComAtprotoModerationDefs,
} from '@atproto/api'
import {
  ExclamationCircleIcon,
  EyeSlashIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/solid'
import { useEffect, useState } from 'react'
import { LabelerRecordEditor } from './RecordEditor'
import { Checkbox, Textarea } from '@/common/forms'
import { reasonTypeOptions } from '@/reports/helpers/getType'

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
  onUpdate: (updatedDef: ComAtprotoLabelDefs.LabelValueDefinition) => void
}) => {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <LabelerRecordEditor
        onCancel={() => setIsEditing(false)}
        definition={definition}
        onUpdate={(updatedDef) => {
          onUpdate(updatedDef)
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

export const LabelerRecordView = (props: {
  originalRecord: AppBskyLabelerService.Record
}) => {
  const [record, setRecord] = useState(props.originalRecord)

  useEffect(() => {
    setRecord(props.originalRecord)
  }, [props.originalRecord])

  return (
    <div>
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
                  defaultChecked
                  name={`reasonType-${reasonType}`}
                  className="mb-3 flex items-center leading-3"
                  onChange={(e) => {
                    let newReasonTypes = [...(record.reasonTypes || [])]
                    if (e.target.checked) {
                      newReasonTypes.push(reasonType)
                    } else {
                      newReasonTypes = newReasonTypes.filter(
                        (type) => type !== reasonType,
                      )
                    }

                    if (newReasonTypes.length === 0) {
                      setRecord({ ...record, reasonTypes: undefined })
                    } else {
                      setRecord({ ...record, reasonTypes: newReasonTypes })
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
                  defaultChecked
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
                      setRecord({ ...record, subjectTypes: undefined })
                    } else {
                      setRecord({ ...record, subjectTypes: newSubjectTypes })
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
                setRecord({
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

      <h3 className="border-b border-gray-300 dark:border-gray-700 pb-1 mb-2">
        Labels
      </h3>
      {record.policies.labelValues.map((label) => (
        <div key={label} className="pb-2">
          <LabelDefinitionView
            label={label}
            definition={record.policies.labelValueDefinitions?.find(
              (def) => def.identifier === label,
            )}
            onUpdate={(updatedDef) => {
              setRecord({
                ...record,
                policies: {
                  ...record.policies,
                  labelValueDefinitions:
                    record.policies.labelValueDefinitions?.map((def) =>
                      def.identifier === label ? updatedDef : def,
                    ),
                },
              })
            }}
          />
        </div>
      ))}
    </div>
  )
}
