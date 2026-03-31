import { Channel } from "@prisma/client"
import { sendWhatsAppText, sendWhatsAppButtons } from "./whatsapp"
import { sendFacebookText, sendFacebookButtons } from "./facebook"
import { sendInstagramText, sendInstagramButtons } from "./instagram"

export interface Button {
  id: string
  title: string
}

export async function sendMessage(channel: Channel, to: string, text: string): Promise<void> {
  switch (channel) {
    case Channel.WHATSAPP:
      return sendWhatsAppText(to, text)
    case Channel.FACEBOOK:
      return sendFacebookText(to, text)
    case Channel.INSTAGRAM:
      return sendInstagramText(to, text)
  }
}

export async function sendButtons(
  channel: Channel,
  to: string,
  bodyText: string,
  buttons: Button[]
): Promise<void> {
  switch (channel) {
    case Channel.WHATSAPP:
      return sendWhatsAppButtons(to, bodyText, buttons)
    case Channel.FACEBOOK:
      return sendFacebookButtons(to, bodyText, buttons)
    case Channel.INSTAGRAM:
      return sendInstagramButtons(to, bodyText, buttons)
  }
}

export const WELCOME_BODY =
  "¡Hola! Soy *Bambu* 🌿, el asistente virtual del Centro Clínico Bambú.\n\n¿Cómo puedo ayudarte hoy?"

export const WELCOME_BUTTONS: Button[] = [
  { id: "TIPO_PACIENTE", title: "Soy paciente" },
  { id: "TIPO_PROFESIONAL", title: "Soy profesional" },
]
