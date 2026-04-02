"use client"

import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn, getContactInitials } from "@/lib/utils"
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

const AVATAR_COLORS: Record<string, string> = {
  WHATSAPP: "bg-green-100 text-green-700",
  FACEBOOK: "bg-blue-100 text-blue-700",
  INSTAGRAM: "bg-pink-100 text-pink-700",
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
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-gray-50 text-gray-400">
        <span className="text-5xl">🌿</span>
        <p className="text-sm font-medium">Selecciona una conversación</p>
        <p className="text-xs text-gray-300">Los mensajes aparecerán aquí</p>
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

  const avatarColor = AVATAR_COLORS[conversation.channel] ?? "bg-gray-100 text-gray-700"

  return (
    <div className="flex flex-col h-full">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar className={`h-9 w-9 flex-shrink-0 ${avatarColor}`}>
              <AvatarFallback className={`text-xs font-bold ${avatarColor}`}>
                {getContactInitials(conversation.contactName, conversation.channelId)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-[15px]">
                  {conversation.contactName ?? conversation.channelId}
                </span>
                <ChannelBadge channel={conversation.channel} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {conversation.userType && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                    {USER_TYPE_LABELS[conversation.userType] ?? conversation.userType}
                  </span>
                )}
                {conversation.botPaused && (
                  <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                    ⏸ Bot pausado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botón pausar / reactivar */}
          {conversation.botPaused ? (
            <Button
              size="sm"
              onClick={onResume}
              className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
            >
              ▶ Reactivar bot
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onPause}
              className="border-amber-300 text-amber-600 hover:bg-amber-50 text-xs h-8"
            >
              ⏸ Pausar bot
            </Button>
          )}
        </div>

        {/* ── Área de mensajes ── */}
        <ScrollArea className="flex-1 bg-gray-50">
          <div className="px-4 py-4 space-y-3">
            {conversation.messages.length === 0 && (
              <p className="text-center text-sm text-gray-400 mt-12">Sin mensajes aún</p>
            )}
            {conversation.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.role === "USER" ? "justify-start" : "justify-end"}`}
              >
                {/* Avatar solo para mensajes del usuario */}
                {msg.role === "USER" && (
                  <Avatar className={`h-6 w-6 flex-shrink-0 mb-1 ${avatarColor}`}>
                    <AvatarFallback className={`text-[9px] font-bold ${avatarColor}`}>
                      {getContactInitials(conversation.contactName, conversation.channelId)}
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* Burbuja */}
                <div
                  className={cn(
                    "max-w-[72%] rounded-2xl px-4 py-2.5 shadow-sm",
                    msg.role === "USER" && "rounded-bl-sm bg-white text-gray-800 border border-gray-100",
                    msg.role === "BOT" && "rounded-br-sm bg-green-600 text-white",
                    msg.role === "OPERATOR" && "rounded-br-sm bg-blue-600 text-white"
                  )}
                >
                  {msg.role !== "USER" && (
                    <span className={`text-[11px] font-semibold block mb-1 ${
                      msg.role === "BOT" ? "text-green-100" : "text-blue-100"
                    }`}>
                      {msg.role === "BOT" ? "🤖 Bambú" : "👤 Operador"}
                    </span>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <span className={`text-[10px] block text-right mt-1 ${
                    msg.role === "USER" ? "text-gray-400" : "opacity-60"
                  }`}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* ── Input del operador ── */}
        <div className="flex-shrink-0 border-t bg-white px-3 py-3 shadow-md">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-xs text-gray-400 font-medium">Respuesta de operador</span>
            <span className="ml-auto text-[10px] text-gray-300 font-mono">Ctrl+Enter para enviar</span>
          </div>
          <div className="flex gap-2 items-end">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu respuesta..."
              rows={2}
              className="flex-1 resize-none text-sm rounded-xl border-gray-200 focus-visible:ring-green-500 focus-visible:ring-2 focus-visible:border-green-400 placeholder:text-gray-400 min-h-[60px] max-h-[120px]"
            />
            <Button
              onClick={handleReply}
              disabled={!replyText.trim() || sending}
              title="Enviar (Ctrl+Enter)"
              className="bg-green-700 hover:bg-green-800 text-white rounded-xl h-[60px] w-11 p-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {sending ? (
                <span className="text-xs">...</span>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </Button>
          </div>
        </div>

    </div>
  )
}
