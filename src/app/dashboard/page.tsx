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
  NUEVO: "bg-white/20 text-white border-white/40 shadow-inner",
  PENDIENTE: "bg-orange-200/80 text-orange-900 border-orange-300/60",
  AGENDADO: "bg-teal-200/80 text-teal-900 border-teal-300/60",
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
    <div className="h-screen flex flex-col" style={{ background: "#EDE8E2" }}>
      {/* ── Header dinámico ── */}
      <header
        className="h-14 flex-shrink-0 flex items-center px-4 gap-3"
        style={{
          background: "linear-gradient(135deg, #1e5299 0%, #1A4A8B 60%, #153a6d 100%)",
          boxShadow: "0 2px 12px rgba(21,58,109,0.35)",
        }}
      >
        {detail ? (
          <>
            {/* Botón volver */}
            <button
              onClick={() => setSelectedId(null)}
              className="text-white/70 hover:text-white text-lg font-bold mr-1 leading-none flex-shrink-0 transition-colors p-2 -ml-2"
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
                  <span className="text-xs text-white/60">
                    {USER_TYPE_LABELS[detail.userType] ?? detail.userType}
                  </span>
                )}
              </div>
            </div>

            {/* Stage pills — ocultos en mobile, visibles desde md */}
            <div className="hidden md:flex items-center gap-1 ml-4">
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStageChange(s)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-150
                    ${currentStage === s
                      ? STAGE_ACTIVE[s]
                      : "border-white/25 text-white/60 hover:text-white hover:border-white/50"
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
                  <span className="hidden sm:inline text-xs text-white/70 bg-white/10 px-2.5 py-1 rounded-full border border-white/20 backdrop-blur-sm">
                    ⏸ Pausado
                  </span>
                  <button
                    onClick={handleResume}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/15 border border-white/30 hover:bg-white/25 transition-all h-8"
                  >
                    ▶ Reactivar
                  </button>
                </>
              ) : (
                <button
                  onClick={handlePause}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/80 bg-white/10 border border-white/20 hover:bg-white/20 hover:text-white transition-all h-8"
                >
                  ⏸ Pausar bot
                </button>
              )}
            </div>
          </>
        ) : (
          // Header de marca — sin conversación seleccionada
          <>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl border border-white/25 flex-shrink-0 shadow-inner">
                {process.env.NEXT_PUBLIC_BOT_EMOJI ?? "🌿"}
              </div>
              <div className="min-w-0">
                <span className="text-base font-bold text-white tracking-tight leading-tight block">
                  {process.env.NEXT_PUBLIC_BOT_NAME ?? "Bambú"} CRM
                </span>
                <span className="text-[11px] text-white/55 leading-none">Centro de mensajería</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden sm:inline text-white/60 text-xs bg-white/10 px-2.5 py-1 rounded-full border border-white/15">
                {conversations.length} conversación{conversations.length !== 1 ? "es" : ""}
              </span>
              {unreadCount > 0 && (
                <span className="bg-white text-blue-900 text-xs font-bold rounded-full px-2.5 py-1 shadow-sm">
                  {unreadCount} sin leer
                </span>
              )}
            </div>
          </>
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Kanban — full screen on mobile until conversation selected */}
        <aside className={`flex-shrink-0 border-r overflow-hidden shadow-md z-10 w-full md:w-80 lg:w-[540px] flex-col ${selectedId ? "hidden md:flex" : "flex"}`}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </aside>

        {/* Panel de chat — full screen on mobile when conversation selected */}
        <main className={`flex-1 overflow-hidden min-w-0 flex-col ${selectedId ? "flex" : "hidden md:flex"}`}>
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
