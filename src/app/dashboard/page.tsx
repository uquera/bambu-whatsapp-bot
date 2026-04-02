"use client"

import { useState, useEffect, useCallback } from "react"
import ConversationList, {
  type ConversationSummary,
} from "@/components/inbox/ConversationList"
import MessageThread, {
  type ConversationDetail,
} from "@/components/inbox/MessageThread"

type ChannelFilter = "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM"

export default function DashboardPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("ALL")

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

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-green-800">🌿 Bambú CRM</span>
        </div>
        <span className="text-sm text-gray-500">
          {conversations.length} conversación{conversations.length !== 1 ? "es" : ""}
        </span>
      </header>

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
