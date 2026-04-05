import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { botEvents } from "@/lib/events"

const VALID_STAGES = ["NUEVO", "PENDIENTE", "AGENDADO"] as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { stage } = await req.json()

  if (!VALID_STAGES.includes(stage)) {
    return Response.json({ error: "Etapa inválida" }, { status: 400 })
  }

  const conversation = await prisma.conversation.update({
    where: { id },
    data: { stage },
  })

  botEvents.emit("update", {
    type: "stage_changed",
    conversationId: id,
    payload: { stage },
  })

  return Response.json({ ok: true, stage: conversation.stage })
}
