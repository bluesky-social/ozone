import React, { useEffect, useState } from 'react'
import { Input, Select, Textarea, FormLabel, Checkbox } from '@/common/forms'
import { ComAtprotoLabelDefs } from '@atproto/api'
import { defaultLabelValueDefinition } from './helpers'
import { ActionButton } from '@/common/buttons'

export const LabelDefinitionEditor: React.FC<{
  label: ComAtprotoLabelDefs.LabelValue
  definition?: ComAtprotoLabelDefs.LabelValueDefinition
  onUpdate: (
    label: string,
    definition?: ComAtprotoLabelDefs.LabelValueDefinition,
  ) => void
  onCancel: () => void
}> = ({ label, definition, onUpdate, onCancel }) => {
  const [hasDefinition, setHasDefinition] = useState(!!definition)

  // Keep state synced with parent state
  useEffect(() => {
    setHasDefinition(!!definition)
  }, [definition])

  if (hasDefinition) {
    return (
      <LabelFullDefinitionEditor
        label={label}
        definition={definition}
        onUpdate={(updatedDef) => {
          onUpdate(label, updatedDef)
          setHasDefinition(false)
        }}
        onRemoveDefinition={() => {
          setHasDefinition(false)
        }}
        onCancel={() => {
          setHasDefinition(false)
          onCancel()
        }}
      />
    )
  }

  return (
    <LabelMinimalDefinitionEditor
      label={label}
      onUpdate={(newLabel) => {
        onUpdate(newLabel)
      }}
      onAddDefinition={() => {
        setHasDefinition(true)
      }}
      onCancel={() => {
        onCancel()
      }}
    />
  )
}

const LabelMinimalDefinitionEditor = ({
  label,
  onUpdate,
  onAddDefinition,
  onCancel,
}: {
  label: ComAtprotoLabelDefs.LabelValue
  onUpdate: (label: ComAtprotoLabelDefs.LabelValue) => void
  onAddDefinition: () => void
  onCancel: () => void
}) => {
  const [formState, setFormState] = useState<{ label: string }>({ label })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(formState.label)
  }
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="w-full flex flex-row items-center gap-2">
        <FormLabel className="flex-1" label="Label">
          <Input
            required
            name="label"
            value={formState.label}
            onChange={handleChange}
            className="block w-full p-2"
          />
        </FormLabel>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        This label does not have a detailed definition
      </p>
      <div className="flex flex-row justify-between">
        <div>
          <ActionButton
            appearance="outlined"
            type="button"
            size="sm"
            onClick={onAddDefinition}
          >
            Add Definition
          </ActionButton>
        </div>
        <div className="flex justify-end space-x-2">
          <ActionButton
            appearance="outlined"
            type="button"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </ActionButton>
          <ActionButton appearance="primary" size="sm" type="submit">
            Save
          </ActionButton>
        </div>
      </div>
    </form>
  )
}

const LabelFullDefinitionEditor: React.FC<{
  label: ComAtprotoLabelDefs.LabelValue
  definition?: ComAtprotoLabelDefs.LabelValueDefinition
  onUpdate: (updatedDef: ComAtprotoLabelDefs.LabelValueDefinition) => void
  onRemoveDefinition: () => void
  onCancel: () => void
}> = ({ label, definition, onUpdate, onCancel, onRemoveDefinition }) => {
  const [formState, setFormState] =
    useState<ComAtprotoLabelDefs.LabelValueDefinition>(
      definition || { ...defaultLabelValueDefinition, identifier: label },
    )

  useEffect(() => {
    if (definition) {
      setFormState(definition)
    }
  }, [definition])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormState({ ...formState, [e.target.name]: e.target.value })
  }

  const handleLocaleChange = (
    index: number,
    field: keyof ComAtprotoLabelDefs.LabelValueDefinitionStrings,
    value: string,
  ) => {
    const updatedLocales = [...formState.locales]
    updatedLocales[index] = { ...updatedLocales[index], [field]: value }
    setFormState({ ...formState, locales: updatedLocales })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log(formState)
    onUpdate(formState)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="w-full flex flex-row items-center gap-2">
        <FormLabel className="flex-1" label="Identifier">
          <Input
            name="identifier"
            className="block w-full p-2"
            value={formState.identifier}
            onChange={handleChange}
            required
          />
        </FormLabel>
      </div>

      <div className="w-full flex flex-col sm:flex-row gap-2">
        <FormLabel label="Severity" className="flex-1">
          <Select
            name="severity"
            value={formState.severity}
            onChange={handleChange}
          >
            <option value="inform">Inform</option>
            <option value="alert">Alert</option>
            <option value="none">None</option>
          </Select>
        </FormLabel>

        <FormLabel label="Blurs" className="flex-1">
          <Select name="blurs" value={formState.blurs} onChange={handleChange}>
            <option value="content">Content</option>
            <option value="media">Media</option>
            <option value="none">None</option>
          </Select>
        </FormLabel>

        <FormLabel label="Default Setting" className="flex-1">
          <Select
            name="defaultSetting"
            value={formState.defaultSetting}
            onChange={handleChange}
          >
            <option value="ignore">Ignore</option>
            <option value="warn">Warn</option>
            <option value="hide">Hide</option>
          </Select>
        </FormLabel>

        <FormLabel label="Adult Only" className="flex-1">
          <Checkbox
            label="Yes"
            checked={formState.adultOnly || false}
            onChange={(e) =>
              setFormState({ ...formState, adultOnly: e.target.checked })
            }
          />
        </FormLabel>
      </div>

      <div className="mt-4">
        <div className="flex flex-row justify-between mb-1">
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Locales
          </h3>
          <div>
            <ActionButton
              appearance="outlined"
              type="button"
              size="sm"
              onClick={() =>
                setFormState({
                  ...formState,
                  locales: [
                    ...formState.locales,
                    {
                      lang: '',
                      name: '',
                      description: '',
                    },
                  ],
                })
              }
            >
              <span className="text-xs">Add Locale</span>
            </ActionButton>
          </div>
        </div>
        {formState.locales.map((locale, index) => (
          <div
            key={index}
            className="p-3 border rounded bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-gray-700 mb-2"
          >
            <div className="flex flex-row items-center gap-2 mb-2">
              <FormLabel label="Language" htmlFor="lang" className="w-1/4">
                <Input
                  value={locale.lang}
                  name="lang"
                  className="block p-2 w-full"
                  onChange={(e) =>
                    handleLocaleChange(index, 'lang', e.target.value)
                  }
                />
              </FormLabel>
              <FormLabel label="Name" className="flex-1" htmlFor="name">
                <Input
                  name="name"
                  value={locale.name}
                  className="block p-2 w-full"
                  onChange={(e) =>
                    handleLocaleChange(index, 'name', e.target.value)
                  }
                />
              </FormLabel>
            </div>
            <FormLabel label="Description" htmlFor="description">
              <Textarea
                value={locale.description}
                name="description"
                className="block p-2 w-full"
                onChange={(e) =>
                  handleLocaleChange(index, 'description', e.target.value)
                }
              />
            </FormLabel>
          </div>
        ))}
      </div>

      <div className="flex flex-row justify-between">
        <div>
          <ActionButton
            appearance="outlined"
            type="button"
            size="sm"
            onClick={onRemoveDefinition}
          >
            Remove Definition
          </ActionButton>
        </div>
        <div className="flex justify-end space-x-2">
          <ActionButton
            appearance="outlined"
            type="button"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </ActionButton>
          <ActionButton appearance="primary" size="sm" type="submit">
            Save
          </ActionButton>
        </div>
      </div>
    </form>
  )
}
