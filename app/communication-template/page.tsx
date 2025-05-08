'use client'

import format from 'date-fns/format'
import { useState } from 'react'
import Link from 'next/link'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/20/solid'
import { useTitle } from 'react-use'

import { LabelChip } from '@/common/labels/List'
import { Loading, LoadingFailed } from '@/common/Loader'
import { useCommunicationTemplateList } from 'components/communication-template/hooks'
import { CommunicationTemplateDeleteConfirmationModal } from 'components/communication-template/delete-confirmation-modal'
import { ActionButton, LinkButton } from '@/common/buttons'
import { ErrorInfo } from '@/common/ErrorInfo'
import { LanguageSelectorDropdown } from '@/common/LanguagePicker'
import { getLanguageName } from '@/lib/locale/helpers'
import { usePermission } from '@/shell/ConfigurationContext'

export default function CommunicationTemplatePage() {
  const { data, error, isLoading } = useCommunicationTemplateList({})
  const [selectedLang, setSelectedLang] = useState<string | undefined>()
  const [deletingTemplateId, setDeletingTemplateId] = useState<
    string | undefined
  >()
  const templates = data
    ? [...data]
        .filter((tpl) => {
          if (!selectedLang) {
            return true
          }
          return tpl.lang === selectedLang
        })
        .sort((prev, next) => prev.name.localeCompare(next.name))
    : []
  useTitle(`Communication Templates`)

  const canManageTemplates = usePermission('canManageTemplates')

  if (!canManageTemplates) {
    return (
      <ErrorInfo type="warn">
        Sorry, you don{"'"}t have permission to manage communication templates.
      </ErrorInfo>
    )
  }

  if (isLoading) {
    return <Loading message="Loading templates" />
  }

  if (error) {
    return <LoadingFailed error={error} />
  }

  return (
    <div className="w-5/6 md:w-2/3 lg:w-1/2 mx-auto">
      <div className="flex flex-row justify-between items-center">
        <h2 className="font-semibold text-gray-600 dark:text-gray-100 mb-3 mt-4">
          Communication Templates
        </h2>
        <div className="flex flex-row gap-2">
          <LanguageSelectorDropdown {...{ selectedLang, setSelectedLang }} />
          <LinkButton
            href="/communication-template/create"
            appearance="primary"
            size="sm"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            New Template
          </LinkButton>
        </div>
      </div>
      <CommunicationTemplateDeleteConfirmationModal
        templateId={deletingTemplateId}
        setIsDialogOpen={() => setDeletingTemplateId(undefined)}
      />
      <ul>
        {!templates.length && (
          <div className="shadow bg-white dark:bg-slate-800 rounded-sm p-5 text-gray-700 dark:text-gray-100 mb-3 text-center">
            <p>
              {selectedLang
                ? `No ${getLanguageName(selectedLang)} templates found`
                : 'No templates found'}
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-200">
              Create a new template to send emails to users.
            </p>
          </div>
        )}
        {templates.map((template) => (
          <li
            key={template.id}
            className="shadow dark:shadow-slate-700 bg-white dark:bg-slate-800 rounded-sm p-3 text-gray-700 dark:text-gray-100 mb-3"
          >
            <div className="flex flex-row justify-between">
              <p className="text-sm text-gray-900 dark:text-gray-200">
                {template.name}
              </p>
              <div>
                {!!template.disabled && (
                  <LabelChip className="bg-red-200">Disabled</LabelChip>
                )}
                {!!template.lang && (
                  <LabelChip className="dark:bg-slate-600 dark:text-gray-200">
                    {getLanguageName(template.lang)}
                  </LabelChip>
                )}
              </div>
            </div>
            <p className="text-sm">Subject: {template.subject}</p>
            <div className="text-sm flex flex-row justify-between">
              <span>
                Last Updated{' '}
                {format(new Date(template.updatedAt), 'do MMM yyyy')}
              </span>
              <div className="flex flex-row">
                <Link
                  href={`/communication-template/${template.id}/edit`}
                  className="flex flex-row items-center border border-gray-400 rounded-sm px-2 hover:bg-gray-100 dark:hover:bg-slate-700 mx-1"
                >
                  <PencilIcon className="h-3 w-3 mr-1" />
                  Edit
                </Link>
                <ActionButton
                  appearance="outlined"
                  onClick={() => setDeletingTemplateId(template.id)}
                >
                  <TrashIcon className="h-3 w-3" />
                </ActionButton>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
