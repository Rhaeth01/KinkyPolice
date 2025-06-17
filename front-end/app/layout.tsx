import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'KinkyPolice - Bot Discord Premium',
  description: 'Le bot Discord ultime pour les communautés adultes. Modération avancée, jeux interactifs, économie et bien plus.',
  keywords: 'Discord bot, NSFW, modération, jeux, économie, bot premium',
  authors: [{ name: 'KinkyPolice Team' }],
  openGraph: {
    title: 'KinkyPolice - Bot Discord Premium',
    description: 'Le bot Discord ultime pour les communautés adultes',
    type: 'website',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KinkyPolice - Bot Discord Premium',
    description: 'Le bot Discord ultime pour les communautés adultes',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-white`}>
        {children}
      </body>
    </html>
  )
}