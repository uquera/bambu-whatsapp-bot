import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendTextMessage, sendWelcomeButtons } from "@/lib/whatsapp"
import { buildMessages, runAgent, classifyUserIntent } from "@/lib/agent"

// ─── GET: Verificación del webhook de Meta ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[webhook] Verificación exitosa")
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// ─── POST: Mensajes entrantes de WhatsApp ───────────────────────────────────
export async function POST(req: NextRequest) {
  // Leer el cuerpo antes de responder (no se puede pasar stream a async)
  const body = await req.json()

  // Responder 200 inmediatamente: Meta reintenta si no recibe respuesta en 20s
  processWebhook(body).catch((err) => {
    console.error("[webhook] Error procesando mensaje:", err)
  })

  return NextResponse.json({ status: "ok" }, { status: 200 })
}

// ─── Procesamiento asíncrono del webhook ────────────────────────────────────
async function processWebhook(body: unknown) {
  const payload = body as WebhookPayload

  const value = payload?.entry?.[0]?.changes?.[0]?.value

  // Ignorar actualizaciones de estado (delivered, read, etc.)
  if (!value?.messages?.length) return

  const message = value.messages[0]
  const from = message.from      // Número E.164, ej: "56912345678"
  const waMessageId = message.id

  // Extraer texto del mensaje (texto libre o botón interactivo)
  let userText: string | null = null

  if (message.type === "text") {
    userText = message.text?.body?.trim() ?? null
  } else if (message.type === "interactive") {
    userText = message.interactive?.button_reply?.id ?? null
  }

  // Ignorar media, audio, stickers, etc.
  if (!userText) return

  // ─── Deduplicación ─────────────────────────────────────────────────────
  const existing = await prisma.message.findFirst({ where: { waMessageId } })
  if (existing) {
    console.log(`[webhook] Mensaje duplicado ignorado: ${waMessageId}`)
    return
  }

  // ─── Upsert de la conversación ─────────────────────────────────────────
  let conversation = await prisma.conversation.findUnique({
    where: { id: from },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { id: from },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })
  }

  // ─── Guardar mensaje del usuario ───────────────────────────────────────
  await prisma.message.create({
    data: {
      conversationId: from,
      role: "user",
      content: userText,
      waMessageId,
    },
  })

  console.log(`[webhook] Mensaje de ${from} (tipo: ${conversation.userType ?? "nuevo"}): ${userText}`)

  // ─── Lógica de clasificación y respuesta ───────────────────────────────
  let replyText: string | null = null

  if (!conversation.userType) {
    // Usuario nuevo o sin tipo definido

    if (userText === "TIPO_PACIENTE") {
      await prisma.conversation.update({
        where: { id: from },
        data: { userType: "PACIENTE" },
      })
      replyText =
        "¡Perfecto! 😊 Estoy aquí para ayudarte con información sobre nuestros servicios, precios y citas. ¿En qué puedo ayudarte?"

    } else if (userText === "TIPO_PROFESIONAL") {
      await prisma.conversation.update({
        where: { id: from },
        data: { userType: "PROFESIONAL" },
      })
      replyText =
        "¡Bienvenido/a! 🏥 Con gusto te cuento sobre los espacios disponibles para arrendar en el Centro Clínico Bambú. ¿Qué especialidad ejerces?"

    } else {
      // Texto libre como primer mensaje → clasificar intención
      const classified = await classifyUserIntent(userText)

      await prisma.conversation.update({
        where: { id: from },
        data: { userType: classified },
      })

      // Enviar los botones de bienvenida para que pueda corregir si fue mal clasificado
      await sendWelcomeButtons(from)

      // Y también responder directamente a su primer mensaje
      replyText = await runAgent(classified, [], userText)
    }

  } else {
    // Usuario con tipo ya conocido → continuar conversación con historial
    const userType = conversation.userType as "PACIENTE" | "PROFESIONAL"
    const history = buildMessages(conversation.messages)
    replyText = await runAgent(userType, history, userText)
  }

  // ─── Enviar respuesta y persistirla ────────────────────────────────────
  if (replyText) {
    await sendTextMessage(from, replyText)

    await prisma.message.create({
      data: {
        conversationId: from,
        role: "assistant",
        content: replyText,
      },
    })

    await prisma.conversation.update({
      where: { id: from },
      data: { updatedAt: new Date() },
    })

    console.log(`[webhook] Respuesta enviada a ${from}`)
  }
}

// ─── Tipos del payload de Meta ──────────────────────────────────────────────
interface WebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id: string
          from: string
          type: string
          text?: { body: string }
          interactive?: {
            type: string
            button_reply?: { id: string; title: string }
          }
        }>
      }
    }>
  }>
}
