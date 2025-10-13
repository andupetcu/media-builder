'use client'

import React, { useState, useRef, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { SectionTab } from 'polotno/side-panel'
import { ImagesGrid } from 'polotno/side-panel/images-grid'
import { getImageSize } from 'polotno/utils/image'
import { Button, ProgressBar, Callout } from '@blueprintjs/core'
import MdFileUpload from '@meronex/icons/md/MdFileUpload'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'

interface UploadedAsset {
  id: string
  name: string
  url: string
  thumbnailUrl?: string
}

const TeamUploadPanel = observer(({ store }: { store: any }) => {
  const { currentTeamId } = useTeamStore()
  const [uploads, setUploads] = useState<UploadedAsset[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load recent uploads
  const loadUploads = async () => {
    if (!currentTeamId) return

    try {
      const { data } = await apiClient.get(`/teams/${currentTeamId}/assets`, {
        params: {
          kind: 'IMAGE',
        },
      })
      setUploads(data.slice(0, 20)) // Show last 20 uploads
    } catch (error) {
      console.error('Failed to load uploads:', error)
    }
  }

  useEffect(() => {
    loadUploads()
  }, [currentTeamId])

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    if (!currentTeamId) {
      setError('No team selected')
      return
    }

    const file = files[0]

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported in this panel')
      return
    }

    // Validate file size (100MB limit for client upload)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      setError('File size must be less than 100MB')
      return
    }

    setIsUploading(true)
    setError('')
    setUploadProgress(0)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('kind', 'IMAGE')

      // Upload with progress tracking
      const { data } = await apiClient.post(`/teams/${currentTeamId}/uploads`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: progressEvent => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setUploadProgress(progress)
          }
        },
      })

      // Add to uploads list
      setUploads([data, ...uploads])

      // Automatically add to canvas
      try {
        const { width, height } = await getImageSize(data.url)
        store.activePage?.addElement({
          type: 'image',
          src: data.url,
          width,
          height,
          x: 50,
          y: 50,
        })
      } catch (err) {
        console.error('Failed to add image to canvas:', err)
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      console.error('Upload failed:', err)
      setError(err.response?.data?.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '10px' }}>
      <h3 style={{ marginBottom: 10 }}>Upload Images</h3>

      {/* Upload Button */}
      <Button
        icon={<MdFileUpload />}
        onClick={handleFileSelect}
        disabled={isUploading || !currentTeamId}
        intent="primary"
        large
        fill
        style={{ marginBottom: 10 }}
      >
        {isUploading ? 'Uploading...' : 'Select Image to Upload'}
      </Button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Upload Progress */}
      {isUploading && (
        <div style={{ marginBottom: 10 }}>
          <ProgressBar
            value={uploadProgress / 100}
            intent="primary"
            stripes={uploadProgress < 100}
            animate={uploadProgress < 100}
          />
          <p style={{ fontSize: '0.9em', textAlign: 'center', marginTop: 5 }}>
            {uploadProgress}% uploaded
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Callout intent="danger" style={{ marginBottom: 10 }}>
          {error}
        </Callout>
      )}

      {/* Info */}
      {!currentTeamId ? (
        <Callout intent="warning" style={{ marginBottom: 10 }}>
          No team selected. Please select a team to upload files.
        </Callout>
      ) : (
        <Callout intent="none" style={{ marginBottom: 10, fontSize: '0.9em' }}>
          Upload images to your team library. They'll be accessible from the "Team Images" panel.
        </Callout>
      )}

      {/* Recent Uploads */}
      {uploads.length > 0 && (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <h4 style={{ marginTop: 10, marginBottom: 10 }}>Recent Uploads</h4>
          <ImagesGrid
            images={uploads}
            getPreview={upload => upload.thumbnailUrl || upload.url}
            onSelect={async (upload, pos, element) => {
              try {
                const { width, height } = await getImageSize(upload.url)

                if (element && element.type === 'image') {
                  element.set({ src: upload.url })
                } else {
                  store.activePage?.addElement({
                    type: 'image',
                    src: upload.url,
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
            isLoading={false}
            loadMore={false}
          />
        </div>
      )}
    </div>
  )
})

// Define the custom section for the side panel
export const TeamUploadSection = {
  name: 'team-upload',
  Tab: (props: any) => (
    <SectionTab name="Upload" {...props}>
      <MdFileUpload />
    </SectionTab>
  ),
  Panel: TeamUploadPanel,
}
