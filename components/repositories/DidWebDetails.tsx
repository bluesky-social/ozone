import { CopyButton } from '@/common/CopyButton'
import { Loading } from '@/common/Loader'
import { resolveDidDocData, type DidDocData } from '@/lib/identity'
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

const getDidWebUrl = (did: string) => {
  if (!did.startsWith('did:web:')) return null
  const hostname = did.slice('did:web:'.length)
  return `https://${hostname}/.well-known/did.json`
}

const getHandleFromDoc = (doc: DidDocData): string => {
  const handleAka = doc.alsoKnownAs.find(
    (aka) => typeof aka === 'string' && aka.startsWith('at://'),
  )
  if (!handleAka) return 'None'
  return handleAka.replace('at://', '')
}

const formatVerificationMethods = (
  verificationMethods: Record<string, string>,
): string => {
  return Object.entries(verificationMethods)
    .map(([id, key]) => `${id}: ${key}`)
    .join('\n')
}

const formatServices = (services: DidDocData['services']): string => {
  return Object.entries(services)
    .map(
      ([id, service]) =>
        `${id} (${service.type}): ${
          service.endpoint || service.serviceEndpoint
        }`,
    )
    .join('\n')
}

export const useDidWebDetails = (did: string) =>
  useQuery<unknown, unknown, DidDocData | null>({
    queryKey: ['didWebDetails', { did }],
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!did.startsWith('did:web:')) return null
      return await resolveDidDocData(did)
    },
  })

export const DidWebDetails = ({ did }: { did: string }) => {
  const { data: didDoc, isLoading, isError } = useDidWebDetails(did)

  const plainTextDetails = useMemo(() => {
    if (!didDoc) return ''
    const lines: string[] = []
    lines.push(`DID: ${didDoc.did}`)
    lines.push(`Handle: ${getHandleFromDoc(didDoc)}`)

    if (Object.keys(didDoc.verificationMethods).length > 0) {
      lines.push('\nVerification Methods:')
      lines.push(formatVerificationMethods(didDoc.verificationMethods))
    }

    if (Object.keys(didDoc.services).length > 0) {
      lines.push('\nServices:')
      lines.push(formatServices(didDoc.services))
    }

    return lines.join('\n')
  }, [didDoc])

  if (didDoc === null) return null
  if (isLoading) return <Loading />
  if (!didDoc) {
    return <h4 className="text-red-500 mb-3">DID document not found!</h4>
  }

  if (isError) {
    return <h4 className="text-red-500 mb-3">Error loading DID document!</h4>
  }

  const webUrl = getDidWebUrl(did)

  return (
    <div className="mb-3">
      <h4 className="font-semibold text-gray-500 dark:text-gray-50">
        DID Document{' '}
        {webUrl && (
          <a href={webUrl} target="_blank" title="Open the DID document URL">
            <ArrowTopRightOnSquareIcon className="inline-block h-3 w-3 mr-1" />
          </a>
        )}
        <CopyButton
          text={plainTextDetails}
          title="Copy DID details to clipboard"
          labelText="DID details "
        />
      </h4>
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50 dark:bg-slate-700">
          <tr className="text-gray-500 dark:text-gray-50 text-left text-sm">
            <th className="py-2 pl-2">Field</th>
            <th className="py-2 pl-2">Value</th>
          </tr>
        </thead>
        <tbody className="dark:text-gray-100">
          <tr className="text-sm align-top">
            <td className="pr-2 py-2 pl-2 font-medium">DID</td>
            <td className="py-2 pl-2 break-all">{didDoc.did}</td>
          </tr>
          <tr className="text-sm align-top">
            <td className="pr-2 py-2 pl-2 font-medium">Handle</td>
            <td className="py-2 pl-2">{getHandleFromDoc(didDoc)}</td>
          </tr>
          {Object.keys(didDoc.services).length > 0 && (
            <tr className="text-sm align-top">
              <td className="pr-2 py-2 pl-2 font-medium">Services</td>
              <td className="py-2 pl-2">
                {Object.entries(didDoc.services).map(([id, service]) => (
                  <div key={id} className="mb-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      {id}
                    </span>
                    <div className="text-xs mt-1">
                      <span className="text-gray-500 dark:text-gray-400">
                        Type:{' '}
                      </span>
                      {service.type}
                    </div>
                    <div className="text-xs mt-1 break-all">
                      <span className="text-gray-500 dark:text-gray-400">
                        Endpoint:{' '}
                      </span>
                      {service.serviceEndpoint}
                    </div>
                  </div>
                ))}
              </td>
            </tr>
          )}
          {didDoc.alsoKnownAs.length > 1 && (
            <tr className="text-sm align-top">
              <td className="pr-2 py-2 pl-2 font-medium">Also Known As</td>
              <td className="py-2 pl-2">
                {didDoc.alsoKnownAs.map((aka, idx) => (
                  <div key={idx} className="text-xs break-all">
                    {aka}
                  </div>
                ))}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
