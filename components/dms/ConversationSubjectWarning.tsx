import { Alert } from '@/common/Alert'
import { parseAtUri } from '@/lib/util'
import { CollectionId } from '@/reports/helpers/subject'

export const ConversationSubjectWarning = ({
  subject,
  setSubject,
  className,
}: {
  subject: string
  setSubject: (subject: string) => void
  className?: string
}) => {
  const parsed = subject.startsWith('at://') ? parseAtUri(subject) : null
  if (parsed?.collection !== CollectionId.Convo || !parsed.did) {
    return null
  }

  const ownerDid = parsed.did
  return (
    <div className={className}>
      <Alert
        type="warning"
        title="Conversation subject"
        body={
          <>
            Actioning a conversation directly has no effect, please action the{' '}
            <a
              href="#"
              className="underline"
              onClick={(e) => {
                e.preventDefault()
                setSubject(ownerDid)
              }}
            >
              owner account
            </a>{' '}
            of the conversation instead.
          </>
        }
      />
    </div>
  )
}
