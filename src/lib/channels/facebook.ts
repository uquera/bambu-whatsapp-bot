// Facebook Messenger usa el mismo endpoint que Instagram pero con PAGE_ACCESS_TOKEN de la página FB
const BASE_URL = "https://graph.facebook.com/v21.0"

async function sendToMessenger(recipientId: string, payload: Record<string, unknown>): Promise<void> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN

  if (!token) {
    throw new Error("Missing FACEBOOK_PAGE_ACCESS_TOKEN env var")
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
    throw new Error(`Facebook Messenger API error ${res.status}: ${error}`)
  }
}

export async function sendFacebookText(to: string, body: string): Promise<void> {
  return sendToMessenger(to, {
    message: { text: body },
  })
}

export async function sendFacebookButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<void> {
  return sendToMessenger(to, {
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: bodyText,
          buttons: buttons.map((b) => ({
            type: "postback",
            title: b.title,
            payload: b.id,
          })),
        },
      },
    },
  })
}
