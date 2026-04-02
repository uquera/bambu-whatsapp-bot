"use client"

import { useEffect, useRef, useState } from "react"
import ChannelBadge from "./ChannelBadge"

export interface MessageItem {
  id: string
  role: "USER" | "BOT" | "OPERATOR"
  content: string
  createdAt: string
}

export interface ConversationDetail {
  id: string
  channel: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM"
  channelId: string
  contactName: string | null
  userType: "PACIENTE" | "PROFESIONAL" | "UNKNOWN" | null
  botPaused: boolean
  messages: MessageItem[]
}

interface Props {
  conversation: ConversationDetail | null
  onPause: () => void
  onResume: () => void
  onReplySent: () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const USER_TYPE_LABELS: Record<string, string> = {
  PACIENTE: "Paciente",
  PROFESIONAL: "Profesional",
  UNKNOWN: "Desconocido",
}

export default function MessageThread({ conversation, onPause, onResume, onReplySent }: Props) {
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation?.messages])

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Selecciona una conversación
      </div>
    )
  }

  async function handleReply() {
    if (!replyText.trim() || sending || !conversation) return
    setSending(true)
    try {
      await fetch(`/api/conversations/${conversation.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText.trim() }),
      })
      setReplyText("")
      onReplySent()
    } catch (err) {
      console.error("Error enviando respuesta:", err)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleReply()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">
            {conversation.contactName ?? conversation.channelId}
          </span>
          <ChannelBadge channel={conversation.channel} />
          {conversation.userType && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {USER_TYPE_LABELS[conversation.userType] ?? conversation.userType}
            </span>
          )}
          {conversation.botPaused && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
              Bot pausado
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {conversation.botPaused ? (
            <button
              onClick={onResume}
              className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              ▶ Reactivar bot
            </button>
          ) : (
            <button
              onClick={onPause}
              className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
            >
              ⏸ Pausar bot
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
        {conversation.messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-8">Sin mensajes aún</p>
        )}
        {conversation.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "USER" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "USER"
                  ? "bg-white text-gray-800 border border-gray-200"
                  : msg.role === "BOT"
                  ? "bg-green-100 text-green-900"
                  : "bg-blue-100 text-blue-900"
              }`}
            >
              {msg.role !== "USER" && (
                <span className="text-xs font-semibold block mb-1 opacity-70">
                  {msg.role === "BOT" ? "🤖 Bambú" : "👤 Operador"}
                </span>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <span className="text-xs opacity-50 block text-right mt-1">
                {formatTime(msg.createdAt)}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input de respuesta del operador */}
      <div className="flex-shrink-0 border-t bg-white p-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe como operador... (Ctrl+Enter para enviar)"
            rows={2}
            className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || sending}
            className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? "..." : "→"}
          </button>
        </div>
      </div>
    </div>
  )
}
