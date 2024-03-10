'use client'
import {
  ComponentProps,
  ReactElement,
  cloneElement,
  useEffect,
  useState,
} from 'react'
import {
  ArrowLeftOnRectangleIcon,
  ExclamationTriangleIcon,
  ArrowRightCircleIcon,
} from '@heroicons/react/20/solid'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Loading } from '@/common/Loader'
import client from '@/lib/client'
import { Input } from '@/common/forms'
import { AuthState } from './AuthContext'

export function ConfigurationFlow({ onComplete }: { onComplete: () => void }) {
  const session = useSession()
  const configQuery = useQuery({
    queryKey: ['ozoneConfig'],
    staleTime: Infinity, // explicitly control refresh
    queryFn: async () => {
      const meta = await getOzoneMeta()
      const doc = await resolveDidDocData(meta.did)
      const labelerUrl = getServiceUrlFromDoc(doc, 'atproto_labeler')
      const labelerDidKey = getDidKeyFromDoc(doc, 'atproto_label')
      const handle = getHandleFromDoc(doc)
      const pdsUrl = getServiceUrlFromDoc(doc, 'atproto_pds')
      const record = pdsUrl
        ? await getLabelerServiceRecord(pdsUrl, meta.did)
        : null
      return {
        doc,
        meta,
        handle,
        matching: {
          service: labelerUrl
            ? normalizeUrl(labelerUrl) === normalizeUrl(meta.url)
            : false,
          key: labelerDidKey === meta.publicKey,
        },
        needs: {
          service: !labelerUrl,
          key: !labelerDidKey,
          pds: !pdsUrl,
          record: !record,
        },
      }
    },
  })

  if (configQuery.status === 'loading') {
    return <Loading message="Checking configuration..." />
  }

  if (configQuery.status === 'error') {
    const message =
      configQuery.error?.['message'] ||
      'Something went wrong. Try logging in again, or seek support.'
    return (
      <>
        <ErrorInfo className="mt-2">{message}</ErrorInfo>
        <Button
          className="w-full mt-2"
          icon={<ArrowLeftOnRectangleIcon />}
          onClick={() => client.signout()}
        >
          Restart
        </Button>
      </>
    )
  }

  const config = configQuery.data
  if (!session || session.did !== config.meta.did) {
    return (
      <>
        {session && (
          <ErrorInfo className="mt-2">
            You&#39;re logged in as {session.handle}. Please login as{' '}
            {config.handle} in order to configure Ozone.
          </ErrorInfo>
        )}
        {!session && (
          <ErrorInfo className="mt-2">
            You&#39;re not logged-in. Please login as {config.handle} in order
            to configure Ozone.
          </ErrorInfo>
        )}
        <Button
          className="w-full mt-2"
          icon={<ArrowLeftOnRectangleIcon />}
          onClick={() => client.signout()}
        >
          Restart
        </Button>
      </>
    )
  }

  if (config.needs.key || config.needs.service) {
    return (
      <IdentityConfigurationFlow
        key={configQuery.dataUpdatedAt}
        config={config}
        onComplete={() => configQuery.refetch()}
      />
    )
  }

  return <pre>{JSON.stringify(config, null, 2)}</pre>
}

function IdentityConfigurationFlow({
  config,
  onComplete,
}: {
  config: {
    handle: string
    meta: OzoneMeta
    doc: DidDocData
    needs: { service: boolean; key: boolean }
  }
  onComplete: () => void
}) {
  const [token, setToken] = useState('')
  const requestPlcOperationSignature = useMutation({
    mutationFn: async () => {
      await client.api.com.atproto.identity.requestPlcOperationSignature()
    },
  })
  const submitPlcOperation = useMutation({
    mutationFn: async () => {
      const services = config.needs.service ? config.doc.services : undefined
      if (services) {
        services['atproto_labeler'] = {
          type: 'AtprotoLabeler',
          endpoint: config.meta.url,
        }
      }
      const verificationMethods = config.needs.key
        ? config.doc.verificationMethods
        : undefined
      if (verificationMethods) {
        verificationMethods['atproto_label'] = config.meta.publicKey
      }
      const {
        data: { operation },
      } = await client.api.com.atproto.identity.signPlcOperation({
        token,
        verificationMethods,
        services,
      })
      await client.api.com.atproto.identity.submitPlcOperation({
        operation,
      })
      // @NOTE temp hack to push an identity op through
      await client.api.com.atproto.identity.updateHandle({
        handle: config.handle,
      })
      onComplete()
    },
  })
  return (
    <div className="text-gray-600 dark:text-gray-100 mt-4">
      <p className="mt-4">
        It looks like the network doesn&#39;t understand that{' '}
        <b>{config.handle}</b> is a moderation service yet. Let&#39;s get you
        setup!
      </p>
      <p className="mt-4">
        We will be associating your service running at <b>{config.meta.url}</b>{' '}
        with your moderation account <b>{config.handle}</b>. It is highly{' '}
        recommended <i>not</i> to use a personal account for this.
      </p>
      {requestPlcOperationSignature.isError && (
        <ErrorInfo className="mt-4">
          We weren&#39;t able to send a confirmation email. Try sending again,
          or seek support.
        </ErrorInfo>
      )}
      {!requestPlcOperationSignature.isSuccess && (
        <div className="flex mt-4">
          <Button
            disabled={requestPlcOperationSignature.isLoading}
            className="w-full mr-2"
            icon={<ArrowLeftOnRectangleIcon />}
            onClick={() => client.signout()}
          >
            Cancel
          </Button>
          <Button
            disabled={requestPlcOperationSignature.isLoading}
            className="w-full ml-2"
            icon={<ArrowRightCircleIcon />}
            onClick={() => requestPlcOperationSignature.mutate()}
          >
            Continue
          </Button>
        </div>
      )}
      {requestPlcOperationSignature.isSuccess && (
        <>
          <p className="mt-4">
            You should receive an email containing a confirmation code for a{' '}
            {'"PLC Update"'}. Please enter it below:
          </p>
          <Input
            type="text"
            placeholder="Confirmation Code"
            className="block w-full mt-2"
            value={token}
            onChange={(ev) => setToken(ev.target.value)}
          />
          {submitPlcOperation.isError && (
            <ErrorInfo className="mt-4">
              Submitting your PLC operation failed:
              <br />
              {submitPlcOperation.error?.['message']}
            </ErrorInfo>
          )}
          <div className="flex mt-4">
            <Button
              disabled={
                submitPlcOperation.isLoading || submitPlcOperation.isSuccess
              }
              className="w-full mr-2"
              icon={<ArrowLeftOnRectangleIcon />}
              onClick={() => client.signout()}
            >
              Cancel
            </Button>
            <Button
              disabled={
                submitPlcOperation.isLoading ||
                submitPlcOperation.isSuccess ||
                !token
              }
              className="w-full ml-2"
              icon={<ArrowRightCircleIcon />}
              onClick={() => submitPlcOperation.mutate()}
            >
              Submit
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function ErrorInfo({
  children,
  className = '',
  ...others
}: ComponentProps<'div'>) {
  return (
    <div
      className={`rounded-md bg-yellow-50 p-4 mt-4 ${className}`}
      {...others}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon
            className="h-5 w-5 text-yellow-400"
            aria-hidden="true"
          />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">{children}</h3>
        </div>
      </div>
    </div>
  )
}

function Button({
  children,
  className = '',
  icon,
  ...others
}: ComponentProps<'button'> & { icon: ReactElement }) {
  return (
    <button
      type="button"
      className={`group relative flex justify-center rounded-md border border-transparent py-2 px-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-rose-500 dark:focus:ring-slate-500 focus:ring-offset-2 bg-rose-600 dark:bg-teal-600 hover:bg-rose-700 dark:hover:bg-teal-700 dark:disabled:bg-gray-500 disabled:bg-gray-500 ${className}`}
      {...others}
    >
      <span className="absolute inset-y-0 left-0 flex items-center pl-3">
        {cloneElement(icon, {
          className: `h-5 w-5 text-rose-500 dark:text-gray-50 group-hover:text-rose-400 dark:group-hover:text-gray-100`,
          'aria-hidden': 'true',
        })}
      </span>
      {children}
    </button>
  )
}

function useSession() {
  const [session, setSession] = useState(
    client.authState === AuthState.LoggedOut ? null : client.session,
  )
  useEffect(() => {
    const updateSession = () =>
      setSession(
        client.authState === AuthState.LoggedOut ? null : client.session,
      )
    client.addEventListener('change', updateSession)
    return () => client.removeEventListener('change', updateSession)
  })
  return session
}

type OzoneMeta = { did: string; url: string; publicKey: string }

async function getOzoneMeta() {
  const res = await fetch('/.well-known/atproto-labeler.json')
  if (res.status !== 200) {
    throw new Error(
      'Could not find Ozone configuration info. Try logging in again or seek support.',
    )
  }
  const meta = await res.json()
  if (typeof meta?.did !== 'string') {
    throw new Error(
      "Ozone configuration info doesn't look right. Try logging in again or seek support.",
    )
  }
  return meta as OzoneMeta
}

async function resolveDidDocData(did: string): Promise<DidDocData> {
  let url: URL | undefined
  if (did.startsWith('did:web:')) {
    throw new Error(
      'You must configure your identity on your own if you\'re using a did:web. You will need to add a service with id "atproto_labeler" and verification method with id "atproto_label".',
    )
  }
  if (did.startsWith('did:plc:')) {
    url = new URL(`/${did}/data`, 'https://plc.directory')
  }
  if (!url) {
    throw new Error(
      `The server DID in your Ozone configuration looks invalid: ${did}. Are you sure Ozone is configured with the right account DID?`,
    )
  }
  const res = await fetch(url)
  if (res.status !== 200) {
    throw new Error(
      "We couldn't find your identity. Have you created an account yet?",
    )
  }
  const doc = await res.json()
  if (doc?.['did'] !== did) {
    throw new Error(
      `The DID doc for ${did} looks invalid. Are you sure Ozone is configured with the right account DID?`,
    )
  }
  return doc
}

function getHandleFromDoc(doc: DidDocData) {
  const handleAka = doc.alsoKnownAs.find(
    (aka) => typeof aka === 'string' && aka.startsWith('at://'),
  )
  if (!handleAka) {
    throw new Error(
      `Your identity ${doc.did} doesn\'t seem to have a handle. Are you sure you've setup your account?`,
    )
  }
  return handleAka.replace('at://', '')
}

function getDidKeyFromDoc(doc: DidDocData, keyId: string): string | null {
  return doc.verificationMethods[keyId] ?? null
}

function getServiceUrlFromDoc(
  doc: DidDocData,
  serviceId: string,
): string | null {
  return doc.services[serviceId]?.endpoint ?? null
}

async function getLabelerServiceRecord(pdsUrl: string, did: string) {
  const url = new URL('/xrpc/com.atproto.repo.getRecord', pdsUrl)
  url.searchParams.set('repo', did)
  url.searchParams.set('collection', 'app.bsky.labeler.service')
  url.searchParams.set('rkey', 'self')
  const res = await fetch(url)
  if (res.status !== 200) return null
  const recordInfo = await res.json()
  if (!recordInfo?.['value'] || typeof recordInfo['value'] !== 'object') {
    return null
  }
  return recordInfo['value'] as Record<string, undefined>
}

function normalizeUrl(url: string) {
  return new URL(url).href
}

type DidDocData = {
  did: string
  alsoKnownAs: string[]
  verificationMethods: Record<string, string>
  services: Record<string, { type: string; endpoint: string }>
}
