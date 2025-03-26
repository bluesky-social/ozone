import React, { useEffect, useState } from 'react'
import { Input, Select, Textarea, FormLabel, Checkbox } from '@/common/forms'
import { ComAtprotoLabelDefs } from '@atproto/api'
import { defaultLabelValueDefinition } from './helpers'
import { ActionButton } from '@/common/buttons'

export const LabelerRecordEditor: React.FC<{
  definition?: ComAtprotoLabelDefs.LabelValueDefinition
  onUpdate: (updatedDef: ComAtprotoLabelDefs.LabelValueDefinition) => void
  onCancel: () => void
}> = ({ definition, onUpdate, onCancel }) => {
  const [formState, setFormState] =
    useState<ComAtprotoLabelDefs.LabelValueDefinition>(
      definition || defaultLabelValueDefinition,
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

        <FormLabel label="Severity">
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

        <FormLabel label="Blurs">
          <Select name="blurs" value={formState.blurs} onChange={handleChange}>
            <option value="content">Content</option>
            <option value="media">Media</option>
            <option value="none">None</option>
          </Select>
        </FormLabel>

        <FormLabel label="Default Setting">
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
      </div>
      <Checkbox
        label="Adult Only"
        checked={formState.adultOnly || false}
        onChange={(e) =>
          setFormState({ ...formState, adultOnly: e.target.checked })
        }
      />

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
              <FormLabel label="Language" className="w-1/4">
                <Input
                  value={locale.lang}
                  className="block p-2 w-full"
                  onChange={(e) =>
                    handleLocaleChange(index, 'lang', e.target.value)
                  }
                />
              </FormLabel>
              <FormLabel label="Name" className="flex-1">
                <Input
                  value={locale.name}
                  className="block p-2 w-full"
                  onChange={(e) =>
                    handleLocaleChange(index, 'name', e.target.value)
                  }
                />
              </FormLabel>
            </div>
            <FormLabel label="Description">
              <Textarea
                value={locale.description}
                className="block p-2 w-full"
                onChange={(e) =>
                  handleLocaleChange(index, 'description', e.target.value)
                }
              />
            </FormLabel>
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-2">
        <ActionButton appearance="outlined" type="button" onClick={onCancel}>
          Cancel
        </ActionButton>
        <ActionButton appearance="primary" type="submit">
          Save
        </ActionButton>
      </div>
    </form>
  )
}
