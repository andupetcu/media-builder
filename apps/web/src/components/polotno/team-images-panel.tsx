'use client'

import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { InputGroup } from '@blueprintjs/core'
import { SectionTab } from 'polotno/side-panel'
import { ImagesGrid } from 'polotno/side-panel/images-grid'
import { getImageSize } from 'polotno/utils/image'
import MdPhotoLibrary from '@meronex/icons/md/MdPhotoLibrary'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'

interface TeamAsset {
  id: string
  name: string
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FONT' | 'TEMPLATE'
  url: string
  thumbnailUrl?: string
}

const TeamImagesPanel = observer(({ store }: { store: any }) => {
  const { currentTeamId } = useTeamStore()
  const [images, setImages] = useState<TeamAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadImages = async () => {
    if (!currentTeamId) return

    setIsLoading(true)

    try {
      const { data } = await apiClient.get(`/teams/${currentTeamId}/assets`, {
        params: {
          kind: 'IMAGE', // Only load images
        },
      })
      setImages(data)
    } catch (error) {
      console.error('Failed to load team images:', error)
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadImages()
  }, [currentTeamId])

  // Filter images by search query
  const filteredImages = images.filter(image =>
    image.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <InputGroup
        leftIcon="search"
        placeholder="Search team images..."
        value={searchQuery}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setSearchQuery(e.target.value)
        }}
        style={{ marginBottom: 20 }}
      />

      {!currentTeamId ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
          <p>No team selected</p>
        </div>
      ) : (
        <ImagesGrid
          images={filteredImages}
          getPreview={image => image.thumbnailUrl || image.url}
          onSelect={async (image, pos, element) => {
            try {
              // Get image dimensions
              const { width, height } = await getImageSize(image.url)

              if (element && element.type === 'image') {
                // Replace existing image
                element.set({ src: image.url })
              } else {
                // Add new image element
                store.activePage?.addElement({
                  type: 'image',
                  src: image.url,
                  width,
                  height,
                  x: pos?.x || 50,
                  y: pos?.y || 50,
                })
              }
            } catch (error) {
              console.error('Failed to add image:', error)
            }
          }}
          rowsNumber={2}
          isLoading={isLoading}
          loadMore={false}
        />
      )}

      {!isLoading && filteredImages.length === 0 && currentTeamId && (
        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
          <p>
            {searchQuery ? 'No images match your search' : 'No images in your team library yet'}
          </p>
          <p style={{ fontSize: '0.9em', marginTop: 10 }}>
            Upload images to your team library to see them here
          </p>
        </div>
      )}
    </div>
  )
})

// Define the custom section for the side panel
export const TeamImagesSection = {
  name: 'team-images',
  Tab: (props: any) => (
    <SectionTab name="Team Images" {...props}>
      <MdPhotoLibrary />
    </SectionTab>
  ),
  Panel: TeamImagesPanel,
}
