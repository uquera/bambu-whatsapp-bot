import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { Channel, UserType } from "@prisma/client"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const channel = sp.get("channel") as Channel | null
  const userType = sp.get("userType") as UserType | null
  const botPaused = sp.get("botPaused")

  const conversations = await prisma.conversation.findMany({
    where: {
      ...(channel ? { channel } : {}),
      ...(userType ? { userType } : {}),
      ...(botPaused !== null ? { botPaused: botPaused === "true" } : {}),
    },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    select: {
      id: true,
      channel: true,
      channelId: true,
      userType: true,
      contactName: true,
      botPaused: true,
      lastMessage: true,
      lastMessageAt: true,
      unreadCount: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return Response.json(conversations)
}
