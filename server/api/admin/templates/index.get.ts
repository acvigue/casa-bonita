import { requireAdmin } from '../../../utils/auth'
import { usePrisma } from '../../../utils/prisma'



export default defineEventHandler(async (event) => {
  const prisma = usePrisma()
  requireAdmin(event)

  const templates = await prisma.configurationTemplate.findMany({
    include: {
      roomTemplates: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  return templates
})
