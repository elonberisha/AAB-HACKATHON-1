import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'euguide-ks — Integrimi i Kosovës në BE',
  description: 'Platformë informuese për integrimin e Kosovës në Bashkimin Evropian',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq">
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  )
}
