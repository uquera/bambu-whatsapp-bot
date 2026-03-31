// Instagram DM usa el mismo endpoint que Facebook Messenger pero con el token de IG
// Si la cuenta de IG está vinculada a la página FB, el PAGE_ACCESS_TOKEN sirve para ambos
const BASE_URL = "https://graph.facebook.com/v21.0"

async function sendToInstagram(recipientId: string, payload: unknown): Promise<void> {
  // Preferir token de IG si existe, si no usar el de Facebook (mismo token si están vinculados)
  const token = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN ?? process.env.FACEBOOK_PAGE_ACCESS_TOKEN

  if (!token) {
    throw new Error("Missing INSTAGRAM_PAGE_ACCESS_TOKEN or FACEBOOK_PAGE_ACCESS_TOKEN env var")
  }

  const res = await fetch(`${BASE_URL}/me/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      ...payload,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Instagram API error ${res.status}: ${error}`)
  }
}

export async function sendInstagramText(to: string, body: string): Promise<void> {
  return sendToInstagram(to, {
    message: { text: body },
  })
}

// Instagram solo soporta respuestas de texto por API; botones se ignoran y se envía texto plano
export async function sendInstagramButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<void> {
  const options = buttons.map((b, i) => `${i + 1}. ${b.title}`).join("\n")
  return sendInstagramText(to, `${bodyText}\n\n${options}`)
}
