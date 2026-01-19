export default defineNuxtPlugin(async () => {
  const { checkSession } = useAuth()

  // Check session on app load
  await checkSession()
})
