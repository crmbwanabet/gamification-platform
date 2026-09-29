import './globals.css'
import { Bricolage_Grotesque, Onest, JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const body = Onest({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
})

// Candy game kit fonts — self-hosted (app/fonts/), so no Google fetch at build or load.
const game = localFont({
  src: './fonts/LilitaOne-400.woff2',
  weight: '400',
  variable: '--font-game',
  display: 'swap',
})

const gameBody = localFont({
  src: './fonts/Nunito-800.woff2',
  weight: '800',
  variable: '--font-game-body',
  display: 'swap',
})

export const metadata = {
  title: '100xBet Rewards - Gamification Platform',
  description: 'Play games, complete missions, and win amazing rewards!',
  keywords: ['betting', 'rewards', 'games', 'missions', 'gamification'],
  authors: [{ name: '100xBet' }],
  openGraph: {
    title: '100xBet Rewards',
    description: 'Play games, complete missions, and win amazing rewards!',
    type: 'website',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${game.variable} ${gameBody.variable}`}>
      <head>
        <link rel="icon" href="/images/coin.png" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
