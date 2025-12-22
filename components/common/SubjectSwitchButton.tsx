import { getProfileUriForDid } from '@/reports/helpers/subject'
import { getDidFromUri } from '@/lib/util'

export const SubjectSwitchButton = ({
  subject,
  setSubject,
}: {
  subject: string
  setSubject: (s: string) => void
}) => {
  const isSubjectDid = subject.startsWith('did:')
  const text = isSubjectDid ? 'Switch to profile' : 'Switch to account'
  return (
    <button
      className="ml-2 text-xs text-gray-500 underline"
      onClick={(e) => {
        e.preventDefault()
        const newSubject = isSubjectDid
          ? getProfileUriForDid(subject)
          : getDidFromUri(subject)
        setSubject(newSubject)
      }}
    >
      {text}
    </button>
  )
}
