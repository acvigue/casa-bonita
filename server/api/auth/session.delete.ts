export default defineEventHandler(async (event) => {
  deleteCookie(event, 'casa_auth', {
    path: '/',
  })

  return { success: true }
})
