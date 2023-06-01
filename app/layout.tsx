'use client' // @TODO Totally circumventing SSC
import '../styles/globals.css'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Shell } from '../components/shell/Shell'
import { useEffectOnce, useInterval } from 'react-use'
import { reEvaluateSnoozeSubjectList } from '../components/reports/helpers/snoozeSubject'

const queryClient = new QueryClient()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Snoozed lists are stored locally, on first load of the app, we want to discard any snoozed subject
  // that's out of the snoozed duration so that on first fetch of the moderation reports, those subjects
  // are not ignored. Then, we schedule the re-evaluation to run every minute so that as the user browses
  // around, the expired snoozes are discarded and reports for those subjects are not accidentally ignored
  useEffectOnce(reEvaluateSnoozeSubjectList)
  useInterval(reEvaluateSnoozeSubjectList, 60_000)

  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full overflow-hidden">
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
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
