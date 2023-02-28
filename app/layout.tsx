'use client' // @TODO Totally circumventing SSC
import '../styles/globals.css'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Shell } from '../components/shell/Shell'

const queryClient = new QueryClient()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full overflow-hidden">
        <ToastContainer
          position="bottom-right"
          autoClose={2500}
          hideProgressBar={false}
          closeOnClick
        />
        <QueryClientProvider client={queryClient}>
          <Shell>{children}</Shell>
        </QueryClientProvider>
      </body>
    </html>
  )
}
