import { Card } from '@/common/Card'

const ActionErrors = {
  'blob-selection-required': {
    title: 'No blobs selected',
    description: 'You must select at least one blob to be diverted',
  },
  'policy-selection-required': {
    title: 'No takedown policy selected',
    description: 'You must select the policy used for the takedown',
  },
}

export type ActionErrorKey = keyof typeof ActionErrors | string

export const ActionError = ({ error }: { error: ActionErrorKey }) => {
  if (ActionErrors[error]) {
    return (
      <Card variation="error">
        <h4 className="font-bold">{ActionErrors[error].title}</h4>
        <p>{ActionErrors[error].description}</p>
      </Card>
    )
  }
  return (
    <Card variation="error">
      <p>{error}</p>
    </Card>
  )
}
