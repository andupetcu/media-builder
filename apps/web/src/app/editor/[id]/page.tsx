'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuthStore } from '@/stores/auth-store'
import { useTeamStore } from '@/stores/team-store'
import { apiClient } from '@/lib/api-client'

// Dynamically import Polotno to avoid SSR issues
const PolotnoEditor = dynamic(
  () => import('@/components/polotno-editor').then(mod => mod.PolotnoEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading editor...</p>
        </div>
      </div>
    ),
  }
)

interface Design {
  id: string
  name: string
  teamId: string
  doc: any
  width: number
  height: number
  status: string
}

export default function EditorPage() {
  const router = useRouter()
  const params = useParams()
  const designId = params.id as string

  const { user, logout } = useAuthStore()
  const { currentTeamId, initialize: initializeTeams } = useTeamStore()

  const [design, setDesign] = useState<Design | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [polotnoKey, setPolotnoKey] = useState('')

  useEffect(() => {
    initializeTeams()

    // Get Polotno key from env
    const key = process.env.NEXT_PUBLIC_POLOTNO_KEY
    if (key) {
      setPolotnoKey(key)
    }
  }, [initializeTeams])

  useEffect(() => {
    if (currentTeamId && designId) {
      fetchDesign()
    }
  }, [currentTeamId, designId])

  const fetchDesign = async () => {
    if (!currentTeamId) return

    setIsLoading(true)
    setError('')

    try {
      const { data } = await apiClient.get(`/teams/${currentTeamId}/designs/${designId}`)
      setDesign(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch design')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (json: any, thumbnail?: string) => {
    if (!currentTeamId || !designId) return

    try {
      await apiClient.put(`/teams/${currentTeamId}/designs/${designId}`, {
        doc: json,
        thumbnail: thumbnail,
      })
    } catch (err: any) {
      console.error('Failed to save design:', err)
      throw err
    }
  }

  const handleSaveVersion = async () => {
    if (!currentTeamId || !designId) return

    const label = prompt('Enter a label for this version (optional):')

    try {
      await apiClient.post(`/teams/${currentTeamId}/designs/${designId}/versions`, {
        label: label || undefined,
      })
      alert('Version saved successfully!')
    } catch (err: any) {
      alert('Failed to save version: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleBack = () => {
    router.push('/designs')
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Error</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <button
              onClick={handleBack}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Designs
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (isLoading || !design || !polotnoKey) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading design...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <nav className="bg-white shadow-sm border-b border-gray-200 z-10">
          <div className="mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBack}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  title="Back to designs"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h1 className="text-lg font-semibold text-gray-900">{design.name}</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {design.status}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSaveVersion}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  Save Version
                </button>
                <span className="text-sm text-gray-700">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <PolotnoEditor
            initialDoc={design.doc}
            polotnoKey={polotnoKey}
            onSave={handleSave}
            autoSaveInterval={20000}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}
