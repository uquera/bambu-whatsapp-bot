import { EventEmitter } from "events"

export interface BotEvent {
  type: "new_message" | "conversation_updated"
  conversationId: string
  payload?: Record<string, unknown>
}

const g = globalThis as unknown as { botEvents?: EventEmitter }

export const botEvents: EventEmitter = g.botEvents ?? new EventEmitter()

if (process.env.NODE_ENV !== "production") {
  g.botEvents = botEvents
}

botEvents.setMaxListeners(100)
