import { NextRequest, NextResponse } from "next/server"
import { Channel } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { sendMessage, sendButtons, WELCOME_BODY, WELCOME_BUTTONS } from "@/lib/channels"
import { buildMessages, runAgent, classifyUserIntent } from "@/lib/agent"
import { botEvents } from "@/lib/events"

// ─── GET: Verificación del webhook de Meta (todos los canales usan el mismo token) ──
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("[webhook/meta] Verificación exitosa")
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ status: "Webhook activo", message: "Bambú CRM webhook endpoint" }, { status: 200 })
}

// ─── POST: Mensajes entrantes de WA / FB / IG ────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Responder 200 inmediatamente — Meta reintenta si no recibe respuesta en 20s
  processWebhook(body).catch((err) => {
    console.error("[webhook/meta] Error procesando mensaje:", err)
  })

  return NextResponse.json({ status: "ok" }, { status: 200 })
}

// ─── Tipo unificado para mensajes de cualquier canal ─────────────────────────
interface IncomingMessage {
  channel: Channel
  channelId: string    // ID del remitente en la plataforma
  text: string | null
  buttonId: string | null
  waMessageId: string  // ID único de Meta para deduplicación
  contactName?: string
}

// ─── Parsers por canal ───────────────────────────────────────────────────────

function parseWhatsApp(body: WAPayload): IncomingMessage | null {
  const value = body?.entry?.[0]?.changes?.[0]?.value
  if (!value?.messages?.length) return null

  const msg = value.messages[0]
  const contactName = value.contacts?.[0]?.profile?.name

  let text: string | null = null
  let buttonId: string | null = null

  if (msg.type === "text") {
    text = msg.text?.body?.trim() ?? null
  } else if (msg.type === "interactive") {
    buttonId = msg.interactive?.button_reply?.id ?? null
    text = msg.interactive?.button_reply?.title ?? null
  }

  if (!text && !buttonId) return null

  return {
    channel: Channel.WHATSAPP,
    channelId: msg.from,
    text,
    buttonId,
    waMessageId: msg.id,
    contactName,
  }
}

function parseFacebook(body: FBPayload): IncomingMessage | null {
  const messaging = body?.entry?.[0]?.messaging?.[0]
  if (!messaging?.message) return null

  // Ignorar mensajes del propio bot (echo)
  if (messaging.message.is_echo) return null

  const text = messaging.message.text?.trim() ?? null
  const postback = (body?.entry?.[0] as FBEntryWithPostback)?.messaging?.[0]?.postback

  return {
    channel: Channel.FACEBOOK,
    channelId: messaging.sender.id,
    text: postback?.payload ?? text,
    buttonId: postback?.payload ?? null,
    waMessageId: messaging.message.mid,
  }
}

function parseInstagram(body: FBPayload): IncomingMessage | null {
  const messaging = body?.entry?.[0]?.messaging?.[0]
  if (!messaging?.message) return null
  if (messaging.message.is_echo) return null

  return {
    channel: Channel.INSTAGRAM,
    channelId: messaging.sender.id,
    text: messaging.message.text?.trim() ?? null,
    buttonId: null,
    waMessageId: messaging.message.mid,
  }
}

function detectChannel(body: unknown): IncomingMessage | null {
  const b = body as WAPayload & FBPayload

  // WhatsApp: tiene entry[].changes[].value
  if (b?.entry?.[0]?.changes) {
    return parseWhatsApp(b as WAPayload)
  }

  // Facebook / Instagram: tienen entry[].messaging[]
  if (b?.entry?.[0]?.messaging) {
    // Instagram: sender.id tiene formato numérico largo y entry tiene 'id' que empieza con número
    // La distinción más fiable es el campo object del payload raíz
    const obj = (b as { object?: string }).object
    if (obj === "instagram") return parseInstagram(b as FBPayload)
    return parseFacebook(b as FBPayload)
  }

  return null
}

// ─── Procesamiento principal ─────────────────────────────────────────────────
async function processWebhook(body: unknown) {
  const incoming = detectChannel(body)
  if (!incoming) return

  const { channel, channelId, text, buttonId, waMessageId, contactName } = incoming

  // Texto efectivo: botón seleccionado o texto libre
  const userText = buttonId ?? text
  if (!userText) return

  // ─── Deduplicación ─────────────────────────────────────────────────────
  const existing = await prisma.message.findFirst({ where: { waMessageId } })
  if (existing) {
    console.log(`[webhook/meta] Mensaje duplicado ignorado: ${waMessageId}`)
    return
  }

  // ─── Obtener o crear conversación ──────────────────────────────────────
  let conversation = await prisma.conversation.findUnique({
    where: { channel_channelId: { channel, channelId } },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { channel, channelId, contactName },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    })
  } else if (contactName && !conversation.contactName) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { contactName },
    })
  }

  // ─── Si el bot está pausado, no responder ──────────────────────────────
  if (conversation.botPaused) {
    // Guardar el mensaje igual para que el operador lo vea
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: userText,
        waMessageId,
      },
    })
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: userText,
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
    })
    botEvents.emit("update", { type: "new_message", conversationId: conversation.id })
    console.log(`[webhook/meta] Bot pausado para ${channel}:${channelId}, mensaje guardado`)
    return
  }

  // ─── Guardar mensaje del usuario ───────────────────────────────────────
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "USER",
      content: userText,
      waMessageId,
    },
  })
  botEvents.emit("update", { type: "new_message", conversationId: conversation.id })

  console.log(`[webhook/meta] ${channel}:${channelId} (tipo: ${conversation.userType ?? "nuevo"}): ${userText}`)

  // ─── Lógica de clasificación y respuesta ───────────────────────────────
  let replyText: string | null = null

  if (!conversation.userType) {
    if (userText === "TIPO_PACIENTE") {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { userType: "PACIENTE" },
      })
      replyText =
        "¡Perfecto! 😊 Estoy aquí para ayudarte con información sobre nuestros servicios, precios y citas. ¿En qué puedo ayudarte?"

    } else if (userText === "TIPO_PROFESIONAL") {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { userType: "PROFESIONAL" },
      })
      replyText =
        "¡Bienvenido/a! 🏥 Con gusto te cuento sobre los espacios disponibles para arrendar en el Centro Clínico Bambú. ¿Qué especialidad ejerces?"

    } else {
      // Texto libre como primer mensaje → clasificar y enviar botones de bienvenida
      const classified = await classifyUserIntent(userText)
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { userType: classified },
      })

      await sendButtons(channel, channelId, WELCOME_BODY, WELCOME_BUTTONS)
      replyText = await runAgent(classified, [], userText)
    }

  } else {
    const userType = conversation.userType as "PACIENTE" | "PROFESIONAL"
    const history = buildMessages(conversation.messages)
    replyText = await runAgent(userType, history, userText)
  }

  // ─── Enviar respuesta y persistirla ────────────────────────────────────
  if (replyText) {
    await sendMessage(channel, channelId, replyText)

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "BOT",
        content: replyText,
      },
    })

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: replyText,
        lastMessageAt: new Date(),
        unreadCount: 0,
        updatedAt: new Date(),
      },
    })
    botEvents.emit("update", { type: "conversation_updated", conversationId: conversation.id })

    console.log(`[webhook/meta] Respuesta enviada a ${channel}:${channelId}`)
  }
}

// ─── Tipos de payloads de Meta ───────────────────────────────────────────────

interface WAPayload {
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
        contacts?: Array<{
          profile?: { name?: string }
        }>
      }
    }>
  }>
}

interface FBMessaging {
  sender: { id: string }
  message: {
    mid: string
    text?: string
    is_echo?: boolean
  }
}

interface FBEntryWithPostback {
  messaging?: Array<FBMessaging & { postback?: { payload: string; title: string } }>
}

interface FBPayload {
  object?: string
  entry?: Array<{
    messaging?: FBMessaging[]
  }>
}
