import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)

  return {
    user: {
      id: auth.id,
      displayName: auth.displayName,
      isAdmin: auth.isAdmin,
    },
    ingressPath: event.context.ingressPath,
  }
})
