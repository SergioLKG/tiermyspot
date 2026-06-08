"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

export function SessionProvider({ children }: { children: any }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}

