import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMessage } from "@/lib/channels"
import { botEvents } from "@/lib/events"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { text } = (await req.json()) as { text: string }

  if (!text?.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 })
  }

  const conversation = await prisma.conversation.findUnique({ where: { id } })
  if (!conversation) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Guardar con rol OPERATOR
  const message = await prisma.message.create({
    data: {
      conversationId: id,
      role: "OPERATOR",
      content: text.trim(),
    },
  })

  // Actualizar metadatos de conversación
  await prisma.conversation.update({
    where: { id },
    data: {
      lastMessage: text.trim(),
      lastMessageAt: new Date(),
      unreadCount: 0,
    },
  })

  // Enviar por el canal correspondiente
  await sendMessage(conversation.channel, conversation.channelId, text.trim())

  // Notificar SSE
  botEvents.emit("update", { type: "new_message", conversationId: id })

  return Response.json(message)
}
