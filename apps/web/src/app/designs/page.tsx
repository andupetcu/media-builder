'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuthStore } from '@/stores/auth-store'
import { useTeamStore } from '@/stores/team-store'
import { apiClient } from '@/lib/api-client'

interface Design {
  id: string
  name: string
  slug: string
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED'
  thumbnail: string | null
  width: number
  height: number
  createdAt: string
  updatedAt: string
}

export default function DesignsPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const {
    currentTeamId,
    teams,
    initialize: initializeTeams,
    isLoading: teamsLoading,
  } = useTeamStore()

  const [designs, setDesigns] = useState<Design[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    initializeTeams()
  }, [initializeTeams])

  useEffect(() => {
    if (currentTeamId) {
      fetchDesigns()
    }
  }, [currentTeamId])

  const fetchDesigns = async () => {
    if (!currentTeamId) return

    setIsLoading(true)
    setError('')

    try {
      const { data } = await apiClient.get(`/teams/${currentTeamId}/designs`)
      setDesigns(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch designs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const createDesign = async () => {
    if (!currentTeamId) {
      setError('Please select a team first')
      return
    }

    setError('')

    try {
      const { data } = await apiClient.post(`/teams/${currentTeamId}/designs`, {
        name: `New Design ${Date.now()}`,
        width: 1920,
        height: 1080,
      })

      router.push(`/editor/${data.id}`)
    } catch (err: any) {
      console.error('Failed to create design:', err)
      setError(err.response?.data?.message || 'Failed to create design')
    }
  }

  const getStatusColor = (status: Design['status']) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'IN_REVIEW':
        return 'bg-yellow-100 text-yellow-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'ARCHIVED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex items-center space-x-8">
                <h1
                  className="text-xl font-bold text-gray-900 cursor-pointer"
                  onClick={() => router.push('/dashboard')}
                >
                  Media Builder
                </h1>
                <div className="flex space-x-4">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => router.push('/designs')}
                    className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md"
                  >
                    Designs
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {teams.length > 0 && (
                  <span className="text-sm text-gray-600">
                    Team:{' '}
                    <span className="font-medium">
                      {teams.find(t => t.id === currentTeamId)?.name}
                    </span>
                  </span>
                )}
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

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Designs</h2>
              <p className="mt-2 text-gray-600">Create and manage your design projects</p>
            </div>
            <button
              onClick={createDesign}
              disabled={!currentTeamId || teamsLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              title={
                !currentTeamId
                  ? 'No team selected'
                  : teamsLoading
                    ? 'Loading teams...'
                    : 'Create a new design'
              }
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>{teamsLoading ? 'Loading...' : 'New Design'}</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {(isLoading || teamsLoading) && (
            <div className="flex justify-center items-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <span className="ml-3 text-gray-600">Loading designs...</span>
            </div>
          )}

          {/* Designs Grid */}
          {!isLoading && !teamsLoading && designs.length === 0 && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No designs yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new design.</p>
              <div className="mt-6">
                <button
                  onClick={createDesign}
                  disabled={!currentTeamId}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New Design
                </button>
              </div>
            </div>
          )}

          {!isLoading && !teamsLoading && designs.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {designs.map(design => (
                <div
                  key={design.id}
                  onClick={() => router.push(`/editor/${design.id}`)}
                  className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gray-200 flex items-center justify-center">
                    {design.thumbnail ? (
                      <img
                        src={design.thumbnail}
                        alt={design.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900 truncate">{design.name}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(design.status)}`}
                      >
                        {design.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {design.width} × {design.height}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Updated {new Date(design.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
