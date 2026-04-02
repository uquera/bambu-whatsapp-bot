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
  if (mins < 60) return `hace ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

const FILTERS: { label: string; value: ChannelFilter }[] = [
  { label: "Todos", value: "ALL" },
  { label: "WA", value: "WHATSAPP" },
  { label: "FB", value: "FACEBOOK" },
  { label: "IG", value: "INSTAGRAM" },
]

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  channelFilter,
  onFilterChange,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Filtros */}
      <div className="flex gap-1 p-3 border-b bg-gray-50 flex-shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              channelFilter === f.value
                ? "bg-green-700 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="p-4 text-sm text-gray-400 text-center">Sin conversaciones</p>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
              selectedId === c.id ? "bg-green-50 border-l-4 border-l-green-600" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-semibold text-gray-800 truncate max-w-[140px]">
                {c.contactName ?? c.channelId}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {c.botPaused && (
                  <span className="text-amber-500 text-xs" title="Bot pausado">⏸</span>
                )}
                {c.unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 truncate max-w-[150px]">
                {c.lastMessage ?? "—"}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                <ChannelBadge channel={c.channel} />
                <span className="text-xs text-gray-400">
                  {formatRelative(c.lastMessageAt)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
