export default defineNuxtRouteMiddleware(async () => {
  const { isAdmin, loading, checkSession } = useAuth()

  // Check session if not yet loaded
  if (loading.value) {
    await checkSession()
  }

  // Redirect non-admins to home
  if (!isAdmin.value) {
    return navigateTo('/')
  }
})
