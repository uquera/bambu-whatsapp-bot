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

const STAGE_CONFIG: Record<Stage, { label: string; headerBg: string; headerText: string; dot: string; colBg: string }> = {
  NUEVO: {
    label: "Nuevo",
    headerBg: "#e8edf5",
    headerText: "#1A4A8B",
    dot: "#1A4A8B",
    colBg: "#f7f9fc",
  },
  PENDIENTE: {
    label: "Pendiente",
    headerBg: "#fef3c7",
    headerText: "#92400e",
    dot: "#f59e0b",
    colBg: "#fffbeb",
  },
  AGENDADO: {
    label: "Agendado",
    headerBg: "#d1fae5",
    headerText: "#065f46",
    dot: "#10b981",
    colBg: "#f0fdf4",
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
          <div
            key={stage}
            className="flex-1 flex flex-col border-r last:border-r-0 min-w-0"
            style={{ backgroundColor: cfg.colBg }}
          >
            {/* Column header */}
            <div
              className="flex items-center justify-between px-2.5 py-2.5 flex-shrink-0 border-b"
              style={{ backgroundColor: cfg.headerBg, borderColor: `${cfg.dot}33` }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: cfg.dot }}
                />
                <span
                  className="text-xs font-bold uppercase tracking-wider truncate"
                  style={{ color: cfg.headerText }}
                >
                  {cfg.label}
                </span>
              </div>
              <span
                className="text-[11px] font-bold px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0 shadow-inner"
                style={{ backgroundColor: "rgba(255,255,255,0.8)", color: cfg.headerText }}
              >
                {cols.length}
              </span>
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {cols.length === 0 && (
                  <p className="text-center text-[11px] text-gray-300 py-8">Sin contactos</p>
                )}
                {cols.map((c) => {
                  const isSelected = selectedId === c.id
                  const avatarColor = AVATAR_COLORS[c.channel] ?? "bg-gray-100 text-gray-600"
                  return (
                    <button
                      key={c.id}
                      onClick={() => onSelect(c.id)}
                      className={`
                        w-full text-left rounded-xl p-2.5 transition-all duration-150 border
                        ${isSelected
                          ? "bg-white shadow-md"
                          : "bg-white/80 border-gray-100 hover:bg-white hover:shadow-sm"
                        }
                      `}
                      style={isSelected ? { borderColor: "var(--brand)", boxShadow: "0 2px 8px rgba(26,74,139,0.15)" } : {}}
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
                                <span
                                  className="text-white text-[9px] font-bold rounded-full px-1 py-0.5 min-w-[15px] text-center leading-none"
                                  style={{ backgroundColor: "var(--brand)" }}
                                >
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
