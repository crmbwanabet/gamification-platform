'use client'

import GamificationPlatform from '@/components/GamificationPlatform'
import SessionProvider from '@/components/session/SessionProvider'

export default function Home() {
  return (
    <SessionProvider>
      <GamificationPlatform />
    </SessionProvider>
  )
}
