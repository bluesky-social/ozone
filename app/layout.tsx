'use client' // @TODO Totally circumventing SSC
import '../styles/globals.css'
import 'react-toastify/dist/ReactToastify.css'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import { ToastContainer } from 'react-toastify'

import { Shell } from '@/shell/Shell'
import { CommandPaletteRoot } from '@/shell/CommandPalette/Root'
import { AuthProvider } from '@/shell/AuthContext'
import { DefaultQueryClientProvider } from '@/shell/QueryClient'
import { GlobalQueryClientProvider } from '@/shell/QueryClient'
import { isDarkModeEnabled } from '@/common/useColorScheme'
import { HANDLE_RESOLVER_URL, PLC_DIRECTORY_URL } from '@/lib/constants'
import { ConfigProvider } from '@/shell/ConfigContext'
import { ConfigurationProvider } from '@/shell/ConfigurationContext'
import { ExternalLabelersProvider } from '@/shell/ExternalLabelersContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Since we're doing everything client side and not using RSC, we can't use `Metadata` feature from next
  // to have these head tags from the server
  const isLocal =
    typeof window !== 'undefined'
      ? window?.location.host.includes('localhost:')
      : false

  return (
    <html
      lang="en"
      className={`h-full bg-gray-50 dark:bg-slate-900 ${
        isDarkModeEnabled() ? 'dark' : ''
      }`}
    >
      <title>Ozone</title>
      <link
        rel="icon"
        href={`/img/logo-${isLocal ? 'white' : 'colorful'}.png`}
        sizes="any"
      />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <body className="h-full overflow-hidden">
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          hideProgressBar={false}
          closeOnClick
        />

        <GlobalQueryClientProvider>
          <AuthProvider
            plcDirectoryUrl={PLC_DIRECTORY_URL}
            handleResolver={HANDLE_RESOLVER_URL}
          >
            <ConfigProvider>
              <DefaultQueryClientProvider>
                <ConfigurationProvider>
                  <ExternalLabelersProvider>
                    <CommandPaletteRoot>
                      <Shell>{children}</Shell>
                    </CommandPaletteRoot>
                  </ExternalLabelersProvider>
                </ConfigurationProvider>
              </DefaultQueryClientProvider>
            </ConfigProvider>
          </AuthProvider>
        </GlobalQueryClientProvider>
      </body>
    </html>
  )
}
