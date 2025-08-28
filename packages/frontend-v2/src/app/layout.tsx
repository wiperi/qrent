import type { Metadata } from 'next'
import './globals.css'
import AppTRPCProvider from '@/lib/trpc-provider'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'Qrent - Your Perfect Home Awaits',
  description: 'Discover exceptional rental properties with ease. Your dream home is just a search away.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-800 antialiased">
        <AppTRPCProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AppTRPCProvider>
      </body>
    </html>
  )
}