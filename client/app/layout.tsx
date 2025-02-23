import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Syne } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${syne.variable}`}>
      <body className="min-h-screen flex flex-col bg-white dark:bg-black transition-colors duration-200">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
