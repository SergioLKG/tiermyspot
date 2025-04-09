import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import CredentialsProvider from "next-auth/providers/credentials";

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
    // Proveedor de credenciales ultra simplificado para el modo demo
    CredentialsProvider({
      id: "demo-login",
      name: "Demo Mode",
      credentials: {},
      async authorize() {
        // Devolver un usuario demo simple
        return {
          id: "demo-user",
          name: "Usuario Demo",
          email: "demo@tiermyspot.com",
          image: "/demo-avatar.png",
          isDemo: true,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Si es un usuario demo, simplemente marcar el token
      if (user?.isDemo) {
        token.isDemo = true;
        return token;
      }

      // Lógica normal para usuarios de Spotify
      return token;
    },
    async session({ session, token }) {
      // Si el token tiene isDemo, marcar la sesión
      if (token.isDemo) {
        session.isDemo = true;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
