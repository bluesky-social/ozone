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
import { AuthQueryClientProvider } from '@/shell/AuthQueryClient'
import { isDarkModeEnabled } from '@/common/useColorScheme'
import { PLC_DIRECTORY_URL, SOCIAL_APP_URL } from '@/lib/constants'
import { ConfigurationProvider } from '@/shell/ConfigurationContext'

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

        <AuthProvider
          plcDirectoryUrl={PLC_DIRECTORY_URL}
          handleResolver={SOCIAL_APP_URL}
        >
          <AuthQueryClientProvider>
            <ConfigurationProvider>
              <CommandPaletteRoot>
                <Shell>{children}</Shell>
              </CommandPaletteRoot>
            </ConfigurationProvider>
          </AuthQueryClientProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
