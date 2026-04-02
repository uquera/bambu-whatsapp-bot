"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getContactInitials } from "@/lib/utils"
import ChannelBadge from "./ChannelBadge"

export interface ConversationSummary {
  id: string
  channel: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM"
  channelId: string
  userType: "PACIENTE" | "PROFESIONAL" | "UNKNOWN" | null
  contactName: string | null
  botPaused: boolean
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
}

type ChannelFilter = "ALL" | "WHATSAPP" | "FACEBOOK" | "INSTAGRAM"

interface Props {
  conversations: ConversationSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  channelFilter: ChannelFilter
  onFilterChange: (f: ChannelFilter) => void
}

function formatRelative(iso: string | null): string {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

const FILTERS: { label: string; value: ChannelFilter }[] = [
  { label: "Todos", value: "ALL" },
  { label: "WA", value: "WHATSAPP" },
  { label: "FB", value: "FACEBOOK" },
  { label: "IG", value: "INSTAGRAM" },
]

const AVATAR_COLORS: Record<string, string> = {
  WHATSAPP: "bg-green-100 text-green-700",
  FACEBOOK: "bg-blue-100 text-blue-700",
  INSTAGRAM: "bg-pink-100 text-pink-700",
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  channelFilter,
  onFilterChange,
}: Props) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Filtros */}
      <div className="flex gap-1.5 p-3 border-b bg-gray-50/80 flex-shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
              ${channelFilter === f.value
                ? "bg-green-700 text-white shadow-sm"
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700"
              }
            `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-3xl">💬</span>
            <p className="text-sm text-gray-400 font-medium">Sin conversaciones</p>
          </div>
        )}

        <div className="py-1">
          {conversations.map((c) => {
            const isSelected = selectedId === c.id
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`
                  w-full text-left px-3 py-3 transition-all duration-150
                  border-l-4 hover:bg-gray-50
                  ${isSelected
                    ? "border-l-green-600 bg-green-50/60"
                    : "border-l-transparent"
                  }
                `}
              >
                <div className="flex items-start gap-2.5">
                  {/* Avatar con iniciales */}
                  <Avatar className={`h-9 w-9 flex-shrink-0 ${AVATAR_COLORS[c.channel]}`}>
                    <AvatarFallback className={`text-xs font-bold ${AVATAR_COLORS[c.channel]}`}>
                      {getContactInitials(c.contactName, c.channelId)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    {/* Fila nombre + indicadores */}
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate max-w-[120px] ${
                        c.unreadCount > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-700"
                      }`}>
                        {c.contactName ?? c.channelId}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        {c.botPaused && (
                          <span title="Bot pausado" className="text-amber-500 text-xs leading-none">⏸</span>
                        )}
                        {c.unreadCount > 0 && (
                          <span className="bg-green-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fila preview + canal + tiempo */}
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs truncate ${
                        c.unreadCount > 0 ? "text-gray-700 font-medium" : "text-gray-400"
                      }`}>
                        {c.lastMessage ?? "—"}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <ChannelBadge channel={c.channel} />
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {formatRelative(c.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
