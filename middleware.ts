import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // Obtener la ruta actual
  const path = request.nextUrl.pathname;

  // Si la ruta es /import-playlist, verificar si el usuario es demo
  if (path === "/import-playlist") {
    // Verificar si el usuario es demo usando getToken
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Si el token indica que es un usuario demo, redirigir al dashboard
    if (token?.isDemo) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/import-playlist"],
};
