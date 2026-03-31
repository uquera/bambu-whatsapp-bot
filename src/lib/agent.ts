import Anthropic from "@anthropic-ai/sdk"
import type { Message } from "@prisma/client"
import { SYSTEM_PROMPT_PACIENTE, SYSTEM_PROMPT_PROFESIONAL, CLASSIFICATION_PROMPT } from "./prompts"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = "claude-haiku-4-5-20251001"
const MAX_HISTORY_MESSAGES = 20

export function buildMessages(dbMessages: Message[]): Anthropic.MessageParam[] {
  return dbMessages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }))
}

export async function runAgent(
  userType: "PACIENTE" | "PROFESIONAL",
  history: Anthropic.MessageParam[],
  newUserMessage: string
): Promise<string> {
  const systemPrompt = userType === "PACIENTE" ? SYSTEM_PROMPT_PACIENTE : SYSTEM_PROMPT_PROFESIONAL

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: newUserMessage },
  ]

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const block = response.content[0]
  if (block.type !== "text") throw new Error("Unexpected response type from Claude")
  return block.text
}

export async function classifyUserIntent(message: string): Promise<"PACIENTE" | "PROFESIONAL"> {
  const prompt = CLASSIFICATION_PROMPT.replace("{MESSAGE}", message)

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 10,
    messages: [{ role: "user", content: prompt }],
  })

  const block = response.content[0]
  if (block.type !== "text") return "PACIENTE"

  const result = block.text.trim().toUpperCase()
  return result === "PROFESIONAL" ? "PROFESIONAL" : "PACIENTE"
}
