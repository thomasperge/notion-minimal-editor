import { ThemeProvider } from '@/components/providers/theme-provider'
import { DocumentsProvider } from '@/components/providers/documents-provider'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Editor',
  description: 'Simple editor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="editor-theme"
        >
          <DocumentsProvider>
            {children}
          </DocumentsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
