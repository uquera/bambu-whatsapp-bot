import type { NextRequest } from "next/server"
import { botEvents } from "@/lib/events"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Heartbeat inicial para establecer la conexión
      controller.enqueue(encoder.encode(": heartbeat\n\n"))

      const listener = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          botEvents.off("update", listener)
        }
      }

      botEvents.on("update", listener)

      // Keepalive cada 25s — evita timeout en Nginx/proxies
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"))
        } catch {
          clearInterval(keepalive)
          botEvents.off("update", listener)
        }
      }, 25_000)

      // Cleanup cuando el cliente cierra la conexión
      return () => {
        clearInterval(keepalive)
        botEvents.off("update", listener)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // crítico para Nginx — deshabilita proxy buffering
    },
  })
}
