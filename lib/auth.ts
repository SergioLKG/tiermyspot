import SpotifyProvider from "next-auth/providers/spotify";
import CredentialsProvider from "next-auth/providers/credentials";
import { getOrCreateUser } from "@/lib/db";
import { refreshSpotifyToken } from "@/lib/spotify-api";

const scopes = [
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-currently-playing",
  "user-read-playback-state",
].join(" ");

export const authOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID || "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: scopes,
          show_dialog: true,
        },
      },
    }),
    CredentialsProvider({
      name: "Demo Mode",
      credentials: {
        email: { label: "Email", type: "text" },
        name: { label: "Name", type: "text" },
        image: { label: "Image", type: "text" },
        isDemo: { label: "Is Demo", type: "boolean" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.name) {
          return null;
        }

        try {
          const demoUser = await getOrCreateUser({
            email: credentials.email,
            name: credentials.name,
            image: credentials.image || "/placeholder.svg",
            isDemo: true,
          });

          return {
            id: String(demoUser.id),
            email: demoUser.email,
            name: demoUser.name,
            image: demoUser.image,
            isDemo: true,
          };
        } catch (error) {
          console.error("Error creating demo user:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }: { token: any; account: any; profile?: any; user: any }) {
      if (user?.isDemo) {
        token.isDemo = true;
        return token;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = Date.now() + account.expires_at * 1000;

        if (profile) {
          token.spotifyId = profile.id;
        }
      }

      if (token.expiresAt && Date.now() >= token.expiresAt * 1000) {
        try {
          const newTokens = await refreshSpotifyToken(token.refreshToken);
          token.accessToken = newTokens.accessToken;
          token.refreshToken = newTokens.refreshToken;
          token.expiresAt = newTokens.expiresAt;
        } catch (error) {
          console.error("Error refreshing access token", error);
          return { ...token, error: "RefreshAccessTokenError" };
        }
      }

      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token.isDemo) {
        session.isDemo = true;
      } else {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.error = token.error;
        session.spotifyId = token.spotifyId;
        session.expiresAt = token.expiresAt;
      }

      return session;
    },
    async signIn({ user, account, profile }: { user: any; account: any; profile?: any }) {
      try {
        if (user.isDemo) {
          return true;
        }

        if (user.email) {
          await getOrCreateUser({
            email: user.email,
            name: user.name,
            image: user.image,
            spotifyId: profile?.id,
          });
        }
        return true;
      } catch (error) {
        console.error("Error saving user to database:", error);
        return true;
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
};
