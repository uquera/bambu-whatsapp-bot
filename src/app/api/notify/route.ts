import { NextRequest, NextResponse } from "next/server"
import { Channel } from "@prisma/client"
import { sendMessage } from "@/lib/channels"

export const dynamic = "force-dynamic"

// POST /api/notify
// Envía un mensaje WhatsApp/FB/IG a un usuario específico.
// Usado internamente por centro-bambu-demo para notificar al paciente.
export async function POST(req: NextRequest) {
  const key = req.headers.get("x-bot-api-key")
  if (key !== process.env.BOT_INTERNAL_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { channel, channelId, message } = body

  if (!channel || !channelId || !message) {
    return NextResponse.json(
      { error: "Faltan campos: channel, channelId, message" },
      { status: 400 }
    )
  }

  const validChannels: string[] = Object.values(Channel)
  if (!validChannels.includes(channel)) {
    return NextResponse.json({ error: `Canal inválido: ${channel}` }, { status: 400 })
  }

  await sendMessage(channel as Channel, channelId, message)

  return NextResponse.json({ ok: true })
}
