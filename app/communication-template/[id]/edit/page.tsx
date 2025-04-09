'use client'
import { use } from 'react'

import { useTitle } from 'react-use'
import { CommunicationTemplateForm } from 'components/communication-template/form'

export default function CommunicationTemplateEditPage(props: {
  params: Promise<{
    id: string
  }>
}) {
  const params = use(props.params)

  const { id } = params

  useTitle(`Edit Communication Templates #${id}`)

  return (
    <div className="w-5/6 md:w-2/3 lg:w-1/2 mx-auto">
      <h2 className="text-gray-600 font-semibold mb-3 pb-2 mt-4 border-b border-gray-300">
        Edit Template #{id}
      </h2>
      <CommunicationTemplateForm templateId={id} />
    </div>
  )
}
