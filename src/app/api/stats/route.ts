import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    totalConversations,
    byChannel,
    byUserType,
    pausedCount,
    totalUnreadAgg,
    messagesToday,
  ] = await Promise.all([
    prisma.conversation.count(),
    prisma.conversation.groupBy({ by: ["channel"], _count: { _all: true } }),
    prisma.conversation.groupBy({ by: ["userType"], _count: { _all: true } }),
    prisma.conversation.count({ where: { botPaused: true } }),
    prisma.conversation.aggregate({ _sum: { unreadCount: true } }),
    prisma.message.count({ where: { createdAt: { gte: todayStart } } }),
  ])

  return Response.json({
    totalConversations,
    byChannel: Object.fromEntries(byChannel.map((r) => [r.channel, r._count._all])),
    byUserType: Object.fromEntries(
      byUserType.map((r) => [r.userType ?? "SIN_CLASIFICAR", r._count._all])
    ),
    pausedCount,
    totalUnread: totalUnreadAgg._sum.unreadCount ?? 0,
    messagesToday,
  })
}
