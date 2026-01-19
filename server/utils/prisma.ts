import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | undefined

export function usePrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:/data/storage.db',
        },
      },
    })
  }
  return prisma
}
