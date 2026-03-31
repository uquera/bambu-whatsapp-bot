const BASE_URL = "https://graph.facebook.com/v21.0"

async function sendToMeta(payload: unknown): Promise<void> {
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
    throw new Error(`WhatsApp API error ${res.status}: ${error}`)
  }
}

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  return sendToMeta({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  })
}

export async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<void> {
  return sendToMeta({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  })
}
