"use client"

import { useState, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getContactInitials } from "@/lib/utils"
import ConversationList, {
  type ConversationSummary,
} from "@/components/inbox/ConversationList"
import MessageThread, {
  type ConversationDetail,
} from "@/components/inbox/MessageThread"
import ChannelBadge from "@/components/inbox/ChannelBadge"

const STAGES = ["NUEVO", "PENDIENTE", "AGENDADO"] as const
type Stage = (typeof STAGES)[number]

const STAGE_LABELS: Record<Stage, string> = {
  NUEVO: "Nuevo",
  PENDIENTE: "Pendiente",
  AGENDADO: "Agendado",
}

const STAGE_ACTIVE: Record<Stage, string> = {
  NUEVO: "bg-gray-200 text-gray-800 border-gray-300",
  PENDIENTE: "bg-amber-200 text-amber-900 border-amber-300",
  AGENDADO: "bg-emerald-200 text-emerald-900 border-emerald-300",
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

export default function DashboardPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations")
    if (!res.ok) return
    setConversations(await res.json())
  }, [])

  const fetchDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`)
    if (!res.ok) return
    setDetail(await res.json())
  }, [])

  // Carga inicial
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Cargar detalle al seleccionar conversación
  useEffect(() => {
    if (selectedId) fetchDetail(selectedId)
    else setDetail(null)
  }, [selectedId, fetchDetail])

  // Suscripción SSE para actualizaciones en tiempo real
  useEffect(() => {
    const es = new EventSource("/api/stream")

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string; conversationId: string }
        fetchConversations()
        if (selectedId && event.conversationId === selectedId) {
          fetchDetail(selectedId)
        }
      } catch {
        // ignorar eventos malformados
      }
    }

    return () => es.close()
  }, [selectedId, fetchConversations, fetchDetail])

  async function handlePause() {
    if (!selectedId) return
    await fetch(`/api/conversations/${selectedId}/pause`, { method: "POST" })
    fetchConversations()
    fetchDetail(selectedId)
  }

  async function handleResume() {
    if (!selectedId) return
    await fetch(`/api/conversations/${selectedId}/resume`, { method: "POST" })
    fetchConversations()
    fetchDetail(selectedId)
  }

  async function handleStageChange(stage: Stage) {
    if (!selectedId) return
    await fetch(`/api/conversations/${selectedId}/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    })
    fetchConversations()
    fetchDetail(selectedId)
  }

  function handleSelect(id: string) {
    setSelectedId(id)
  }

  const unreadCount = conversations.filter((c) => c.unreadCount > 0).length
  const avatarColor = detail ? (AVATAR_COLORS[detail.channel] ?? "bg-gray-100 text-gray-600") : ""
  const currentStage = (detail?.stage ?? "NUEVO") as Stage

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* ── Header dinámico ── */}
      <header className="h-14 flex-shrink-0 bg-green-800 shadow-md flex items-center px-4 gap-3">
        {detail ? (
          <>
            {/* Botón volver */}
            <button
              onClick={() => setSelectedId(null)}
              className="text-green-300 hover:text-white text-lg font-bold mr-1 leading-none flex-shrink-0"
              title="Volver al listado"
            >
              ←
            </button>

            {/* Avatar del contacto */}
            <Avatar className={`h-8 w-8 flex-shrink-0 ${avatarColor}`}>
              <AvatarFallback className={`text-xs font-bold ${avatarColor}`}>
                {getContactInitials(detail.contactName, detail.channelId)}
              </AvatarFallback>
            </Avatar>

            {/* Nombre + tipo */}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-white text-sm truncate leading-tight">
                {detail.contactName ?? detail.channelId}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ChannelBadge channel={detail.channel} />
                {detail.userType && (
                  <span className="text-xs text-green-300">
                    {USER_TYPE_LABELS[detail.userType] ?? detail.userType}
                  </span>
                )}
              </div>
            </div>

            {/* Stage pills */}
            <div className="flex items-center gap-1 ml-4">
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStageChange(s)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-150
                    ${currentStage === s
                      ? STAGE_ACTIVE[s]
                      : "border-green-600 text-green-300 hover:text-white hover:border-green-400"
                    }`}
                >
                  {STAGE_LABELS[s]}
                </button>
              ))}
            </div>

            {/* Pausar / Reactivar */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {detail.botPaused ? (
                <>
                  <span className="hidden sm:inline text-xs text-amber-300 bg-amber-900/40 px-2 py-0.5 rounded-full border border-amber-600">
                    ⏸ Bot pausado
                  </span>
                  <Button
                    size="sm"
                    onClick={handleResume}
                    className="bg-green-600 hover:bg-green-500 text-white h-8 text-xs"
                  >
                    ▶ Reactivar bot
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePause}
                  className="border-amber-400 text-amber-300 hover:bg-green-700 hover:text-amber-200 h-8 text-xs"
                >
                  ⏸ Pausar bot
                </Button>
              )}
            </div>
          </>
        ) : (
          // Header de marca — sin conversación seleccionada
          <>
            <span className="text-xl">🌿</span>
            <span className="text-lg font-bold text-white tracking-tight">Bambú CRM</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-green-200 text-sm">
                {conversations.length} conversación{conversations.length !== 1 ? "es" : ""}
              </span>
              {unreadCount > 0 && (
                <span className="bg-white text-green-800 text-xs font-bold rounded-full px-2 py-0.5">
                  {unreadCount} sin leer
                </span>
              )}
            </div>
          </>
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Kanban */}
        <aside className="w-[540px] flex-shrink-0 border-r overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </aside>

        {/* Panel de chat */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <MessageThread
            conversation={detail}
            onReplySent={() => {
              if (selectedId) fetchDetail(selectedId)
              fetchConversations()
            }}
          />
        </main>
      </div>
    </div>
  )
}
