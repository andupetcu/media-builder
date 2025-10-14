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
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')

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

  const handleStartEditName = () => {
    if (design) {
      setEditedName(design.name)
      setIsEditingName(true)
    }
  }

  const handleSaveName = async () => {
    if (!currentTeamId || !designId || !editedName.trim()) return

    try {
      await apiClient.put(`/teams/${currentTeamId}/designs/${designId}`, {
        name: editedName.trim(),
      })
      setDesign(prev => (prev ? { ...prev, name: editedName.trim() } : null))
      setIsEditingName(false)
    } catch (err: any) {
      alert('Failed to update design name: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleCancelEditName = () => {
    setIsEditingName(false)
    setEditedName('')
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
                {isEditingName ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={e => setEditedName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveName()
                        if (e.key === 'Escape') handleCancelEditName()
                      }}
                      className="px-2 py-1 border border-gray-300 rounded-md text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md"
                      title="Save"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={handleCancelEditName}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                      title="Cancel"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <h1 className="text-lg font-semibold text-gray-900">{design.name}</h1>
                    <button
                      onClick={handleStartEditName}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                      title="Edit name"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  </div>
                )}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {design.status}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/designs')}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  Designs
                </button>
                <button
                  onClick={() => router.push('/assets')}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  Assets
                </button>
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
