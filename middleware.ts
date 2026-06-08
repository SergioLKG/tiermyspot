export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tierlist/:path*",
    "/group-tierlist/:path*",
    "/import-playlist/:path*",
  ],
}

