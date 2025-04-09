declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    error?: string
    spotifyId?: string
    expiresAt?: number
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}