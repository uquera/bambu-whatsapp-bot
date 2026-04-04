"use client"

import { useState, useEffect, useCallback } from "react"
import ConversationList, {
  type ConversationSummary,
} from "@/components/inbox/ConversationList"
import MessageThread, {
  type ConversationDetail,
} from "@/components/inbox/MessageThread"

type ChannelFilter = "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM"

interface Stats {
  totalConversations: number
  byChannel: Record<string, number>
  byUserType: Record<string, number>
  pausedCount: number
  totalUnread: number
  messagesToday: number
}

export default function DashboardPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("ALL")
  const [stats, setStats] = useState<Stats | null>(null)

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/stats")
    if (!res.ok) return
    setStats(await res.json())
  }, [])

  const fetchConversations = useCallback(async () => {
    const qs = channelFilter !== "ALL" ? `?channel=${channelFilter}` : ""
    const res = await fetch(`/api/conversations${qs}`)
    if (!res.ok) return
    const data = await res.json()
    setConversations(data)
  }, [channelFilter])

  const fetchDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`)
    if (!res.ok) return
    const data = await res.json()
    setDetail(data)
  }, [])

  // Carga inicial
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Carga inicial y al cambiar filtro
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Cargar detalle al seleccionar conversación
  useEffect(() => {
    if (selectedId) fetchDetail(selectedId)
  }, [selectedId, fetchDetail])

  // Suscripción SSE para actualizaciones en tiempo real
  useEffect(() => {
    const es = new EventSource("/api/stream")

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string; conversationId: string }
        fetchConversations()
        fetchStats()
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

  function handleSelect(id: string) {
    setSelectedId(id)
    // Marcar como leído visualmente (el unreadCount se actualiza via SSE/refetch)
  }

  const unreadCount = conversations.filter((c) => c.unreadCount > 0).length

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-5 bg-green-800 flex-shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🌿</span>
          <span className="text-lg font-bold text-white tracking-tight">Bambú CRM</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-200 text-sm">
            {conversations.length} conversación{conversations.length !== 1 ? "es" : ""}
          </span>
          {unreadCount > 0 && (
            <span className="bg-white text-green-800 text-xs font-bold rounded-full px-2 py-0.5">
              {unreadCount} sin leer
            </span>
          )}
        </div>
      </header>

      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-4 px-5 py-2 bg-green-50 border-b border-green-100 text-xs text-green-900 flex-shrink-0 flex-wrap">
          <span className="font-semibold">{stats.totalConversations} conversaciones</span>
          <span className="text-green-400">|</span>
          {stats.byChannel.WHATSAPP != null && (
            <span>🟢 WA: <b>{stats.byChannel.WHATSAPP}</b></span>
          )}
          {stats.byChannel.FACEBOOK != null && (
            <span>🔵 FB: <b>{stats.byChannel.FACEBOOK}</b></span>
          )}
          {stats.byChannel.INSTAGRAM != null && (
            <span>🟣 IG: <b>{stats.byChannel.INSTAGRAM}</b></span>
          )}
          <span className="text-green-400">|</span>
          <span>Pacientes: <b>{stats.byUserType.PACIENTE ?? 0}</b></span>
          <span>Profesionales: <b>{stats.byUserType.PROFESIONAL ?? 0}</b></span>
          <span className="text-green-400">|</span>
          {stats.pausedCount > 0 && (
            <span className="text-amber-700">⏸ Pausadas: <b>{stats.pausedCount}</b></span>
          )}
          <span>Mensajes hoy: <b>{stats.messagesToday}</b></span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel izquierdo — lista */}
        <aside className="w-72 flex-shrink-0 flex flex-col border-r bg-white overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelect}
            channelFilter={channelFilter}
            onFilterChange={setChannelFilter}
          />
        </aside>

        {/* Panel derecho — thread */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <MessageThread
            conversation={detail}
            onPause={handlePause}
            onResume={handleResume}
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
