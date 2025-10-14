'use client'

import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { SectionTab } from 'polotno/side-panel'
import { getImageSize } from 'polotno/utils/image'
import MdPermMedia from '@meronex/icons/md/MdPermMedia'
import { useTeamStore } from '@/stores/team-store'
import { apiClient } from '@/lib/api-client'

interface Asset {
  id: string
  name: string
  kind: string
  publicUrl: string
  thumbnailUrl?: string
  sizeBytes: number
  createdAt: string
}

export const TeamAssetsPanel = observer(({ store }: { store: any }) => {
  const { currentTeamId } = useTeamStore()
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (currentTeamId) {
      loadAssets()
    }
  }, [currentTeamId])

  const loadAssets = async () => {
    if (!currentTeamId) return

    setIsLoading(true)
    setError('')

    try {
      const { data } = await apiClient.get(`/teams/${currentTeamId}/assets?kind=IMAGE`)
      setAssets(data)
    } catch (err: any) {
      console.error('Failed to load assets:', err)
      setError('Failed to load assets')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageClick = async (asset: Asset) => {
    // Get image dimensions
    const { width, height } = await getImageSize(asset.publicUrl)

    // Add image to canvas
    store.activePage?.addElement({
      type: 'image',
      src: asset.publicUrl,
      width,
      height,
      // Center the image on the page
      x: store.width / 2 - width / 2,
      y: store.height / 2 - height / 2,
    })
  }

  const handleDeleteAsset = async (assetId: string, event: React.MouseEvent) => {
    event.stopPropagation()

    if (!currentTeamId) return

    if (!confirm('Are you sure you want to delete this asset?')) return

    try {
      await apiClient.delete(`/teams/${currentTeamId}/assets/${assetId}`)
      // Reload assets
      await loadAssets()
    } catch (err: any) {
      alert('Failed to delete asset: ' + (err.response?.data?.message || err.message))
    }
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#e74c3c', marginBottom: '10px' }}>{error}</p>
        <button
          onClick={loadAssets}
          style={{
            padding: '8px 16px',
            background: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading assets...</p>
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#999', marginBottom: '10px' }}>No assets found</p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Upload images using the Upload tab or from the Assets page
        </p>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {assets.map(asset => (
          <div
            key={asset.id}
            style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: '8px',
              overflow: 'hidden',
              cursor: 'pointer',
              border: '1px solid #e0e0e0',
            }}
            onClick={() => handleImageClick(asset)}
          >
            <img
              src={asset.publicUrl}
              alt={asset.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            <button
              onClick={e => handleDeleteAsset(asset.id, e)}
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'rgba(239, 68, 68, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
              title="Delete asset"
            >
              ×
            </button>
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '4px 8px',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {asset.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

export const TeamAssetsSection = {
  name: 'team-assets',
  Tab: (props: any) => (
    <SectionTab name="Assets" {...props}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MdPermMedia size={20} />
      </div>
    </SectionTab>
  ),
  Panel: TeamAssetsPanel,
}
