const BASE_URL = "https://graph.facebook.com/v21.0"

interface TextPayload {
  messaging_product: "whatsapp"
  to: string
  type: "text"
  text: { body: string; preview_url?: boolean }
}

interface InteractiveButtonsPayload {
  messaging_product: "whatsapp"
  to: string
  type: "interactive"
  interactive: {
    type: "button"
    body: { text: string }
    action: {
      buttons: Array<{
        type: "reply"
        reply: { id: string; title: string }
      }>
    }
  }
}

async function sendToMeta(payload: TextPayload | InteractiveButtonsPayload): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_TOKEN

  if (!phoneNumberId || !token) {
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_TOKEN env vars")
  }

  const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Meta API error ${res.status}: ${error}`)
  }
}

export async function sendTextMessage(to: string, body: string): Promise<void> {
  return sendToMeta({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  })
}

export async function sendWelcomeButtons(to: string): Promise<void> {
  return sendToMeta({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "¡Hola! Soy *Bambu* 🌿, el asistente virtual del Centro Clínico Bambú.\n\n¿Cómo puedo ayudarte hoy?",
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "TIPO_PACIENTE", title: "Soy paciente" } },
          { type: "reply", reply: { id: "TIPO_PROFESIONAL", title: "Soy profesional" } },
        ],
      },
    },
  })
}
