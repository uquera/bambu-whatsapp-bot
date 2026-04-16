"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

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
  stage: string
  messages: MessageItem[]
}

interface Props {
  conversation: ConversationDetail | null
  onReplySent: () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function MessageThread({ conversation, onReplySent }: Props) {
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation?.messages])

  if (!conversation) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400"
        style={{ background: "linear-gradient(160deg, #f5f1ec 0%, #ede8e2 40%, #e8e2db 100%)" }}
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.90)",
            boxShadow: "0 8px 32px rgba(26,74,139,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <span className="text-4xl">🌿</span>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-500">Selecciona una conversación</p>
          <p className="text-xs text-gray-400 mt-1">Los mensajes aparecerán aquí</p>
        </div>
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
      {/* ── Área de mensajes ── */}
      <ScrollArea className="flex-1" style={{ background: "linear-gradient(160deg, #f5f1ec 0%, #ede8e2 40%, #e8e2db 100%)" }}>
        <div className="px-4 py-4 space-y-3">
          {conversation.messages.length === 0 && (
            <p className="text-center text-sm text-gray-400 mt-12">Sin mensajes aún</p>
          )}
          {conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${msg.role === "USER" ? "justify-start" : "justify-end"}`}
            >
              {/* Burbuja */}
              <div
                className={cn(
                  "max-w-[90%] sm:max-w-[72%] rounded-2xl px-4 py-2.5",
                  msg.role === "USER" && "rounded-bl-sm text-gray-800",
                  msg.role === "BOT" && "rounded-br-sm text-white",
                  msg.role === "OPERATOR" && "rounded-br-sm text-white"
                )}
                style={
                  msg.role === "USER"
                    ? {
                        background: "rgba(255,255,255,0.95)",
                        border: "1px solid rgba(0,0,0,0.06)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                      }
                    : msg.role === "BOT"
                    ? {
                        background: "linear-gradient(135deg, #22a95c 0%, #178048 100%)",
                        boxShadow: "0 2px 8px rgba(23,128,72,0.25)",
                      }
                    : {
                        background: "linear-gradient(135deg, #2260c4 0%, #1A4A8B 100%)",
                        boxShadow: "0 2px 8px rgba(26,74,139,0.25)",
                      }
                }
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
      <div
        className="flex-shrink-0 border-t px-3 py-3"
        style={{
          background: "linear-gradient(to bottom, #ffffff 0%, #f5f0eb 100%)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.07)",
          borderColor: "rgba(0,0,0,0.07)",
        }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--brand)" }} />
          <span className="text-xs text-gray-400 font-medium">Respuesta de operador</span>
          <span className="ml-auto hidden md:inline text-[10px] text-gray-300 font-mono">Ctrl+Enter para enviar</span>
        </div>
        <div className="flex gap-2 items-end">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu respuesta..."
            rows={2}
            className="flex-1 resize-none text-sm rounded-xl border-gray-200 focus-visible:ring-green-500 focus-visible:ring-2 focus-visible:border-green-400 placeholder:text-gray-400 min-h-[50px] sm:min-h-[60px] max-h-[120px]"
          />
          <Button
            onClick={handleReply}
            disabled={!replyText.trim() || sending}
            title="Enviar (Ctrl+Enter)"
            className="text-white rounded-xl h-[60px] w-11 p-0 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #2260c4 0%, #1A4A8B 100%)",
              boxShadow: "0 2px 8px rgba(26,74,139,0.3)",
            }}
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
