'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

export default function RegisterPage() {
  const router = useRouter()
  const login = useAuthStore(state => state.login)
  const [error, setError] = useState('')

  // Redirect to login (which auto-logs in with demo user)
  useEffect(() => {
    const autoLogin = async () => {
      try {
        await login('demo@mediabuilder.com', 'password123')
        router.push('/dashboard')
      } catch (err: any) {
        setError(err.message || 'Auto-login failed. Please contact support.')
      }
    }

    autoLogin()
  }, [login, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Media Builder</h2>
          <p className="mt-4 text-sm text-gray-600">
            {error ? (
              <span className="text-red-600">{error}</span>
            ) : (
              <span>Logging in...</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
