import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string }
  const secret = process.env.DASHBOARD_SECRET

  if (!secret || password !== secret) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })
  }

  const next = req.nextUrl.searchParams.get("next") ?? "/dashboard"
  const res = NextResponse.redirect(new URL(next, req.url))

  res.cookies.set("crm_auth", secret, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
    secure: process.env.NODE_ENV === "production",
  })

  return res
}
