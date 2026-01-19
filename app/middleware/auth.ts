export default defineNuxtRouteMiddleware(async (to) => {
  // Skip for auth-required page to avoid redirect loops
  if (to.path === '/auth-required') {
    return
  }

  const { isAuthenticated, loading, checkSession } = useAuth()

  // Check session if not yet loaded
  if (loading.value) {
    try {
      await checkSession()
    } catch (error) {
      // Ignore errors during session check
    }
  }

  // Redirect to error page if not authenticated
  if (!isAuthenticated.value) {
    return navigateTo('/auth-required?redirect=' + encodeURIComponent(to.fullPath))
  }
})
