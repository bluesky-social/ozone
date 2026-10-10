import { getProfileUriForDid } from '@/reports/helpers/subject'
import { getDidFromUri } from '@/lib/util'
import { useLabelerAgent } from '@/shell/ConfigurationContext'
import { useQuery } from '@tanstack/react-query'

export const SubjectSwitchButton = ({
  subject,
  setSubject,
}: {
  subject: string
  setSubject: (s: string) => void
}) => {
  const isSubjectDid = subject.startsWith('did:')
  const labelerAgent = useLabelerAgent()
  const profileUri = isSubjectDid ? getProfileUriForDid(subject) : undefined

  const { data: hasProfile, isLoading, isError } = useQuery({
    enabled: !!profileUri,
    queryKey: ['profileRecordExists', { profileUri }],
    retry: false,
    queryFn: async () => {
      try {
        await labelerAgent.tools.ozone.moderation.getRecord({ uri: profileUri! })
        return true
      } catch (error) {
        if (error?.['error'] === 'RecordNotFound') return false
        throw error
      }
    },
  })

  let profileUnavailableMessage: string | undefined
  if (isSubjectDid) {
    if (isLoading) {
      profileUnavailableMessage = 'Loading profile record...'
    } else if (isError) {
      profileUnavailableMessage = 'Profile record unavailable'
    } else if (hasProfile === false) {
      profileUnavailableMessage = 'No profile record'
    }
  }

  if (profileUnavailableMessage) {
    return (
      <span className="ml-2 text-xs text-gray-500">
        {profileUnavailableMessage}
      </span>
    )
  }

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
