import { Badge } from "@/components/ui/badge"

export type Channel = "WHATSAPP" | "FACEBOOK" | "INSTAGRAM"

function IconWA() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.112 1.52 5.843L.057 23.882l6.204-1.629A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.802 9.802 0 01-5.028-1.38l-.36-.214-3.732.979 1.004-3.652-.234-.374A9.78 9.78 0 012.182 12c0-5.418 4.4-9.818 9.818-9.818 5.418 0 9.818 4.4 9.818 9.818 0 5.418-4.4 9.818-9.818 9.818z" />
    </svg>
  )
}

function IconFB() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function IconIG() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

const CHANNEL_CONFIG: Record<Channel, { icon: React.ReactNode; label: string; className: string }> = {
  WHATSAPP: {
    icon: <IconWA />,
    label: "WhatsApp",
    className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  },
  FACEBOOK: {
    icon: <IconFB />,
    label: "Facebook",
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  INSTAGRAM: {
    icon: <IconIG />,
    label: "Instagram",
    className: "bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100",
  },
}

const SHORT: Record<Channel, string> = {
  WHATSAPP: "WA",
  FACEBOOK: "FB",
  INSTAGRAM: "IG",
}

interface Props {
  channel: Channel
  showLabel?: boolean
}

export default function ChannelBadge({ channel, showLabel = false }: Props) {
  const config = CHANNEL_CONFIG[channel]
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-semibold ${config.className}`}
    >
      {config.icon}
      <span>{showLabel ? config.label : SHORT[channel]}</span>
    </Badge>
  )
}
