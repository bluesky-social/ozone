import { HTMLAttributes } from 'react'

import { TabsPanel } from '@/common/Tabs'
import {
  CredentialSignIn,
  CredentialSignInForm,
} from './auth/credential/CredentialSignInForm'
import { OAuthSignIn, OAuthSignInForm } from './auth/oauth/OAuthSignInForm'

export function AuthForm({
  credentialSignIn,
  oauthSignIn,
  ...props
}: {
  credentialSignIn?: CredentialSignIn
  oauthSignIn?: OAuthSignIn
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <TabsPanel
      {...props}
      fallback={<div>No auth method available</div>}
      autoHide
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
