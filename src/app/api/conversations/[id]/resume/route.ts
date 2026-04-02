import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { botEvents } from "@/lib/events"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const conversation = await prisma.conversation.update({
    where: { id },
    data: { botPaused: false },
  })

  botEvents.emit("update", {
    type: "conversation_updated",
    conversationId: id,
    payload: { botPaused: false },
  })

  return Response.json({ success: true, botPaused: conversation.botPaused })
}
