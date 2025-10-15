'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuthStore } from '@/stores/auth-store'
import { useTeamStore } from '@/stores/team-store'
import { apiClient } from '@/lib/api-client'

interface Asset {
  id: string
  name: string
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FONT' | 'TEMPLATE'
  size: number
  url: string
  thumbnailUrl?: string
  createdAt: string
}

export default function AssetsPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const {
    currentTeamId,
    teams,
    initialize: initializeTeams,
    isLoading: teamsLoading,
  } = useTeamStore()

  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  const [editedName, setEditedName] = useState('')
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    initializeTeams()
  }, [initializeTeams])

  useEffect(() => {
    if (currentTeamId) {
      fetchAssets()
    }
  }, [currentTeamId])

  const fetchAssets = async () => {
    if (!currentTeamId) return

    setIsLoading(true)
    setError('')

    try {
      const { data } = await apiClient.get(`/teams/${currentTeamId}/assets`)
      // Map backend response to frontend interface
      const mappedAssets = data.map((asset: any) => ({
        id: asset.id,
        name: asset.name,
        kind: asset.kind,
        size: asset.sizeBytes,
        url: asset.publicUrl,
        thumbnailUrl: asset.thumbnailUrl,
        createdAt: asset.createdAt,
      }))
      setAssets(mappedAssets)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch assets')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const handleStartEditName = (asset: Asset) => {
    setEditingAssetId(asset.id)
    setEditedName(asset.name)
  }

  const handleSaveEditName = async (assetId: string) => {
    if (!currentTeamId || !editedName.trim()) return

    try {
      await apiClient.put(`/teams/${currentTeamId}/assets/${assetId}`, {
        name: editedName.trim(),
      })
      setAssets(prev => prev.map(a => (a.id === assetId ? { ...a, name: editedName.trim() } : a)))
      setEditingAssetId(null)
      setEditedName('')
    } catch (err: any) {
      alert('Failed to update asset name: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleCancelEditName = () => {
    setEditingAssetId(null)
    setEditedName('')
  }

  const handleDeleteAsset = async (assetId: string) => {
    if (!currentTeamId) return

    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      await apiClient.delete(`/teams/${currentTeamId}/assets/${assetId}`)
      setAssets(prev => prev.filter(a => a.id !== assetId))
      setSelectedAssets(prev => {
        const newSet = new Set(prev)
        newSet.delete(assetId)
        return newSet
      })
    } catch (err: any) {
      alert('Failed to delete asset: ' + (err.response?.data?.message || err.message))
    }
  }

  const toggleSelectAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(assetId)) {
        newSet.delete(assetId)
      } else {
        newSet.add(assetId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedAssets.size === assets.length) {
      setSelectedAssets(new Set())
    } else {
      setSelectedAssets(new Set(assets.map(a => a.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (!currentTeamId || selectedAssets.size === 0) return

    if (
      !confirm(
        `Are you sure you want to delete ${selectedAssets.size} asset${selectedAssets.size > 1 ? 's' : ''}?`
      )
    )
      return

    setIsDeleting(true)

    try {
      const { data } = await apiClient.post(`/teams/${currentTeamId}/assets/bulk-delete`, {
        assetIds: Array.from(selectedAssets),
      })

      // Remove deleted assets from the list
      setAssets(prev => prev.filter(a => !data.deleted.includes(a.id)))
      setSelectedAssets(new Set())

      if (data.failed.length > 0) {
        alert(
          `Deleted ${data.totalDeleted} asset(s). Failed to delete ${data.totalFailed} asset(s).`
        )
      }
    } catch (err: any) {
      alert('Failed to delete assets: ' + (err.response?.data?.message || err.message))
    } finally {
      setIsDeleting(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getKindColor = (kind: Asset['kind']) => {
    switch (kind) {
      case 'IMAGE':
        return 'bg-blue-100 text-blue-800'
      case 'VIDEO':
        return 'bg-purple-100 text-purple-800'
      case 'AUDIO':
        return 'bg-green-100 text-green-800'
      case 'FONT':
        return 'bg-yellow-100 text-yellow-800'
      case 'TEMPLATE':
        return 'bg-pink-100 text-pink-800'
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
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                  >
                    Designs
                  </button>
                  <button
                    onClick={() => router.push('/assets')}
                    className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md"
                  >
                    Assets
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
              <h2 className="text-3xl font-bold text-gray-900">Asset Library</h2>
              <p className="mt-2 text-gray-600">Upload and manage your media assets</p>
            </div>
            <button
              disabled={!currentTeamId || teamsLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              title={
                !currentTeamId
                  ? 'No team selected'
                  : teamsLoading
                    ? 'Loading teams...'
                    : 'Upload a new asset'
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
              <span>{teamsLoading ? 'Loading...' : 'Upload Asset'}</span>
            </button>
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedAssets.size > 0 && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedAssets.size} asset{selectedAssets.size > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedAssets(new Set())}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear selection
                </button>
              </div>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>{isDeleting ? 'Deleting...' : 'Delete Selected'}</span>
              </button>
            </div>
          )}

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
              <span className="ml-3 text-gray-600">Loading assets...</span>
            </div>
          )}

          {/* Assets Grid */}
          {!isLoading && !teamsLoading && assets.length === 0 && (
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">No assets yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by uploading your first asset.
              </p>
            </div>
          )}

          {!isLoading && !teamsLoading && assets.length > 0 && (
            <>
              {/* Select All Checkbox */}
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedAssets.size === assets.length && assets.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label className="ml-2 text-sm text-gray-700 cursor-pointer" onClick={toggleSelectAll}>
                  Select All ({assets.length})
                </label>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {assets.map(asset => (
                  <div
                    key={asset.id}
                    className={`bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow relative ${
                      selectedAssets.has(asset.id) ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-gray-200 flex items-center justify-center relative">
                    {/* Selection Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedAssets.has(asset.id)}
                        onChange={() => toggleSelectAsset(asset.id)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer bg-white"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>

                    {asset.kind === 'IMAGE' && asset.url ? (
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        onError={e => {
                          // Hide broken image icon
                          e.currentTarget.style.display = 'none'
                        }}
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
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    {editingAssetId === asset.id ? (
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={editedName}
                          onChange={e => setEditedName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEditName(asset.id)
                            if (e.key === 'Escape') handleCancelEditName()
                          }}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEditName(asset.id)}
                          className="p-1 text-green-600 hover:text-green-700"
                          title="Save"
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={handleCancelEditName}
                          className="p-1 text-red-600 hover:text-red-700"
                          title="Cancel"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-2">
                        <h3
                          className="text-sm font-medium text-gray-900 truncate"
                          title={asset.name}
                        >
                          {asset.name}
                        </h3>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleStartEditName(asset)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Rename"
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
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Delete"
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
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getKindColor(asset.kind)}`}
                      >
                        {asset.kind}
                      </span>
                      <span className="text-xs text-gray-500">{formatFileSize(asset.size)}</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Added {new Date(asset.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
