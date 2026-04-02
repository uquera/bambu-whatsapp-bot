type Channel = "WHATSAPP" | "FACEBOOK" | "INSTAGRAM"

const STYLES: Record<Channel, string> = {
  WHATSAPP: "bg-green-100 text-green-800",
  FACEBOOK: "bg-blue-100 text-blue-800",
  INSTAGRAM: "bg-pink-100 text-pink-800",
}

const LABELS: Record<Channel, string> = {
  WHATSAPP: "WA",
  FACEBOOK: "FB",
  INSTAGRAM: "IG",
}

export default function ChannelBadge({ channel }: { channel: Channel }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ${STYLES[channel]}`}
    >
      {LABELS[channel]}
    </span>
  )
}
