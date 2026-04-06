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

const STAGE_CONFIG: Record<Stage, {
  label: string
  headerGradient: string
  headerText: string
  dot: string
  colGradient: string
  borderColor: string
}> = {
  NUEVO: {
    label: "Nuevo",
    headerGradient: "linear-gradient(135deg, #dce8f8 0%, #e8f0fb 100%)",
    headerText: "#1A4A8B",
    dot: "#4a7fc1",
    colGradient: "linear-gradient(170deg, #f0f5ff 0%, #f7faff 60%, #f9fbff 100%)",
    borderColor: "rgba(26,74,139,0.12)",
  },
  PENDIENTE: {
    label: "Pendiente",
    headerGradient: "linear-gradient(135deg, #fde8c4 0%, #fef3e2 100%)",
    headerText: "#7c4d00",
    dot: "#e09b40",
    colGradient: "linear-gradient(170deg, #fffaf2 0%, #fffcf5 60%, #fefefe 100%)",
    borderColor: "rgba(224,155,64,0.18)",
  },
  AGENDADO: {
    label: "Agendado",
    headerGradient: "linear-gradient(135deg, #b8f0dd 0%, #dcfaed 100%)",
    headerText: "#0a4d35",
    dot: "#2dba80",
    colGradient: "linear-gradient(170deg, #f0fdf7 0%, #f6fefb 60%, #fafffe 100%)",
    borderColor: "rgba(45,186,128,0.18)",
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
            style={{ background: cfg.colGradient }}
          >
            {/* Column header */}
            <div
              className="flex items-center justify-between px-3 py-2.5 flex-shrink-0 border-b"
              style={{
                background: cfg.headerGradient,
                borderColor: cfg.borderColor,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: cfg.dot,
                    boxShadow: `0 0 0 3px ${cfg.dot}22`,
                  }}
                />
                <span
                  className="text-[11px] font-bold uppercase tracking-widest truncate"
                  style={{ color: cfg.headerText }}
                >
                  {cfg.label}
                </span>
              </div>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0"
                style={{
                  backgroundColor: "rgba(255,255,255,0.75)",
                  color: cfg.headerText,
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
                }}
              >
                {cols.length}
              </span>
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1.5">
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
                      className="w-full text-left rounded-xl p-2.5 transition-all duration-200"
                      style={
                        isSelected
                          ? {
                              background: "rgba(255,255,255,0.97)",
                              border: "1px solid rgba(26,74,139,0.25)",
                              boxShadow: "0 4px 14px rgba(26,74,139,0.13), 0 1px 3px rgba(0,0,0,0.06)",
                            }
                          : {
                              background: "rgba(255,255,255,0.6)",
                              border: "1px solid rgba(255,255,255,0.9)",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                            }
                      }
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
