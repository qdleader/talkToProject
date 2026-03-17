// lib/db.ts
import { PrismaClient } from "@prisma/client"
import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from 'ws'

// 在 Node.js 环境中，Neon 默认尝试寻找 WebSocket
// Node 22+ 已经有全局 WebSocket，不需要额外的 ws 包
if (typeof window === 'undefined' && !global.WebSocket) {
  neonConfig.webSocketConstructor = ws
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = (function() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma

  const connectionString = process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error("Prisma Runtime Error: DATABASE_URL is missing in process.env")
  } else {
    // 仅在开发环境下打印，且隐藏敏感部分
    if (process.env.NODE_ENV === "development") {
      const masked = connectionString.replace(/:[^@]*@/, ":****@")
      console.log("Prisma Runtime: Connecting to", masked)
    }
  }

  const adapter = new PrismaNeon({ connectionString: connectionString || '' })
  
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client
  return client
})()
