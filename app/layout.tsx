import '../styles/globals.css'
import { Shell } from '../components/shell/Shell'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full bg-gray-50">
      <body className="h-full overflow-hidden">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
