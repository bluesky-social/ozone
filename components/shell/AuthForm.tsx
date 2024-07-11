import { HTMLAttributes } from 'react'

import { TabsPanel } from '@/common/Tabs'
import { AtpSignIn, AtpSignInForm } from './auth/atp/AtpSignInForm'
import { OAuthSignIn, OAuthSignInForm } from './auth/oauth/OAuthSignInForm'

export function AuthForm({
  atpSignIn,
  oauthSignIn,
  ...props
}: {
  atpSignIn?: AtpSignIn
  oauthSignIn?: OAuthSignIn
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <TabsPanel
      {...props}
      fallback={<div>No auth method available</div>}
      views={[
        {
          view: 'atp',
          label: 'Credentials',
          content: atpSignIn ? (
            <AtpSignInForm
              key="atp"
              className="mt-8 space-y-6"
              signIn={atpSignIn}
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
