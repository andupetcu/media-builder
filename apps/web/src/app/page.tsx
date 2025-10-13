'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

export default function Home() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuthStore()
  const [isLoggingIn, setIsLoggingIn] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const autoLogin = async () => {
      // Check if already authenticated
      if (isAuthenticated) {
        router.push('/dashboard')
        return
      }

      // Auto-login with demo credentials
      try {
        await login('demo@mediabuilder.com', 'password123')
        router.push('/dashboard')
      } catch (err: any) {
        setError(err.message || 'Auto-login failed')
        setIsLoggingIn(false)
      }
    }

    autoLogin()
  }, [login, isAuthenticated, router])

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
          <h1 className="text-4xl font-bold mb-4 text-red-600">Login Error</h1>
          <p className="text-lg mb-8">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Media Builder</h1>
        <p className="text-lg mb-8">Logging in as demo user...</p>
        <div className="flex justify-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      </div>
    </main>
  )
}
