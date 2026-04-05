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
  stage: string
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
}

interface Props {
  conversations: ConversationSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function formatRelative(iso: string | null): string {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

const STAGES = ["NUEVO", "PENDIENTE", "AGENDADO"] as const
type Stage = (typeof STAGES)[number]

const STAGE_CONFIG: Record<Stage, { label: string; headerClass: string; dotClass: string }> = {
  NUEVO: {
    label: "Nuevo",
    headerClass: "bg-gray-100 text-gray-600 border-b border-gray-200",
    dotClass: "bg-gray-400",
  },
  PENDIENTE: {
    label: "Pendiente",
    headerClass: "bg-amber-50 text-amber-700 border-b border-amber-200",
    dotClass: "bg-amber-400",
  },
  AGENDADO: {
    label: "Agendado",
    headerClass: "bg-emerald-50 text-emerald-700 border-b border-emerald-200",
    dotClass: "bg-emerald-500",
  },
}

const AVATAR_COLORS: Record<string, string> = {
  WHATSAPP: "bg-green-100 text-green-700",
  FACEBOOK: "bg-blue-100 text-blue-700",
  INSTAGRAM: "bg-pink-100 text-pink-700",
}

export default function ConversationList({ conversations, selectedId, onSelect }: Props) {
  return (
    <div className="flex h-full">
      {STAGES.map((stage) => {
        const cols = conversations.filter((c) => (c.stage ?? "NUEVO") === stage)
        const cfg = STAGE_CONFIG[stage]

        return (
          <div key={stage} className="flex-1 flex flex-col border-r last:border-r-0 min-w-0">
            {/* Column header */}
            <div className={`flex items-center justify-between px-2.5 py-2 flex-shrink-0 ${cfg.headerClass}`}>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
                <span className="text-xs font-bold uppercase tracking-wide truncate">
                  {cfg.label}
                </span>
              </div>
              <span className="text-[11px] font-semibold bg-white/70 px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0">
                {cols.length}
              </span>
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1 bg-white">
              <div className="p-1.5 space-y-1.5">
                {cols.length === 0 && (
                  <p className="text-center text-[11px] text-gray-300 py-6">Sin contactos</p>
                )}
                {cols.map((c) => {
                  const isSelected = selectedId === c.id
                  const avatarColor = AVATAR_COLORS[c.channel] ?? "bg-gray-100 text-gray-600"
                  return (
                    <button
                      key={c.id}
                      onClick={() => onSelect(c.id)}
                      className={`
                        w-full text-left rounded-lg p-2 transition-all duration-150 border
                        ${isSelected
                          ? "bg-green-50 border-green-300 shadow-sm"
                          : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                        }
                      `}
                    >
                      {/* Avatar + nombre + badges */}
                      <div className="flex items-start gap-1.5">
                        <Avatar className={`h-7 w-7 flex-shrink-0 ${avatarColor}`}>
                          <AvatarFallback className={`text-[9px] font-bold ${avatarColor}`}>
                            {getContactInitials(c.contactName, c.channelId)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs truncate ${c.unreadCount > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                              {c.contactName ?? c.channelId}
                            </span>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {c.botPaused && (
                                <span title="Bot pausado" className="text-amber-400 text-[10px] leading-none">⏸</span>
                              )}
                              {c.unreadCount > 0 && (
                                <span className="bg-green-600 text-white text-[9px] font-bold rounded-full px-1 py-0.5 min-w-[15px] text-center leading-none">
                                  {c.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Preview + tiempo */}
                          <p className={`text-[10px] truncate mt-0.5 ${c.unreadCount > 0 ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                            {c.lastMessage ?? "—"}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <ChannelBadge channel={c.channel} />
                            <span className="text-[9px] text-gray-400">{formatRelative(c.lastMessageAt)}</span>
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
      })}
    </div>
  )
}
