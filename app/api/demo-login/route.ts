import { type NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Crear usuario demo en la base de datos
    const demoUser = await getOrCreateUser({
      email: "demo@tiermyspot.com",
      name: "Usuario Demo",
      image: "/demo-avatar.png",
      isDemo: true,
    });

    if (!demoUser) {
      throw new Error("No se pudo crear el usuario demo");
    }

    return NextResponse.json({
      success: true,
      user: {
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        image: demoUser.image,
        isDemo: true,
      },
    });
  } catch (error) {
    console.error("Error en demo-login:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}