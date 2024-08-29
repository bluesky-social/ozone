import { HTMLAttributes } from 'react'

import { TabsPanel } from '@/common/Tabs'
import {
  CredentialSignIn,
  CredentialSignInForm,
} from './auth/credential/CredentialSignInForm'
import { OAuthSignIn, OAuthSignInForm } from './auth/oauth/OAuthSignInForm'
import { ENABLE_OAUTH } from '@/lib/constants'

export function AuthForm({
  credentialSignIn,
  oauthSignIn,
  ...props
}: {
  credentialSignIn?: CredentialSignIn
  oauthSignIn?: OAuthSignIn
} & HTMLAttributes<HTMLDivElement>) {
  if (!ENABLE_OAUTH && credentialSignIn) {
    return (
      <CredentialSignInForm
        key="credential"
        className="mt-8 space-y-6"
        signIn={credentialSignIn}
      />
    )
  }

  return (
    <TabsPanel
      {...props}
      fallback={<div>No auth method available</div>}
      views={[
        {
          view: 'credentials',
          label: 'Credentials',
          content: credentialSignIn ? (
            <CredentialSignInForm
              key="credential"
              className="mt-8 space-y-6"
              signIn={credentialSignIn}
            />
          ) : undefined,
        },
        {
          view: 'oauth',
          label: 'OAuth',
          content: oauthSignIn ? (
            <OAuthSignInForm
              key="oauth"
              className="mt-8 space-y-6"
              signIn={oauthSignIn}
            />
          ) : undefined,
        },
      ]}
    />
  )
}
