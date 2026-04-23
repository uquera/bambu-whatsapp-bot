"use client"

import { useState, FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/dashboard"

  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch(`/api/auth/login?next=${encodeURIComponent(next)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      redirect: "manual",
    })

    if (res.status === 0 || res.type === "opaqueredirect") {
      router.push(next)
      return
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Error de autenticación")
      setLoading(false)
      return
    }

    router.push(next)
  }

  const emoji = process.env.NEXT_PUBLIC_BOT_EMOJI ?? "🌿"
  const name = process.env.NEXT_PUBLIC_BOT_NAME ?? "Bambú"

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#EDE8E2" }}
    >
      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg"
            style={{
              background: "linear-gradient(135deg, #1e5299 0%, #153a6d 100%)",
            }}
          >
            {emoji}
          </div>
          <h1 className="text-xl font-bold text-gray-800">{name} CRM</h1>
          <p className="text-sm text-gray-500 mt-1">Centro de mensajería</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{
                background: loading
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #1e5299 0%, #153a6d 100%)",
              }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
