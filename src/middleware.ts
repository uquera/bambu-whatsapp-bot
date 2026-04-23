import { NextRequest, NextResponse } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Solo proteger /dashboard
  if (!pathname.startsWith("/dashboard")) return NextResponse.next()

  // Sin DASHBOARD_SECRET configurado → acceso libre (dev)
  const secret = process.env.DASHBOARD_SECRET
  if (!secret) return NextResponse.next()

  const token = req.cookies.get("crm_auth")?.value
  if (token === secret) return NextResponse.next()

  const loginUrl = new URL("/login", req.url)
  loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
