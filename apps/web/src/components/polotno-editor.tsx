'use client'

import { useEffect, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno'
import { Toolbar } from 'polotno/toolbar/toolbar'
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons'
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel'
import { Workspace } from 'polotno/canvas/workspace'
import { PagesTimeline } from 'polotno/pages-timeline'
import { createStore } from 'polotno/model/store'
import { unstable_setAnimationsEnabled, setUploadFunc } from 'polotno/config'
import { storeToVideo } from '@polotno/video-export'
import { QrSection } from './polotno/qr-code-panel'
import { UnsplashSection } from './polotno/unsplash-panel'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'
import '@blueprintjs/core/lib/css/blueprint.css'

// Enable animations support
unstable_setAnimationsEnabled(true)

// Configure upload function to use our backend API
setUploadFunc(async (localFile: File) => {
  // Get current team ID from the store
  const teamId = useTeamStore.getState().currentTeamId
  if (!teamId) {
    throw new Error('No team selected')
  }

  const formData = new FormData()
  formData.append('file', localFile)

  try {
    const { data } = await apiClient.post(`/teams/${teamId}/uploads`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    // Return the public URL of the uploaded asset
    return data.publicUrl
  } catch (error) {
    console.error('Upload failed:', error)
    throw new Error('Failed to upload file')
  }
})

interface PolotnoEditorProps {
  initialDoc?: any
  polotnoKey: string
  onSave?: (json: any, thumbnail?: string) => void
  autoSaveInterval?: number
}

// Wrap with observer for reactive state
export const PolotnoEditor = observer(function PolotnoEditor({
  initialDoc,
  polotnoKey,
  onSave,
  autoSaveInterval = 20000, // 20 seconds default
}: PolotnoEditorProps) {
  const [store] = useState(() => {
    const s = createStore({
      key: polotnoKey,
      showCredit: false,
    })

    // Set initial dimensions if provided
    const width = initialDoc?.width || 1920
    const height = initialDoc?.height || 1080

    s.setSize(width, height)

    return s
  })

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoExportProgress, setVideoExportProgress] = useState(0)
  const [isExportingVideo, setIsExportingVideo] = useState(false)

  useEffect(() => {
    // Load initial document if provided
    if (initialDoc && initialDoc.pages) {
      try {
        store.loadJSON(initialDoc)
      } catch (error) {
        console.error('Failed to load initial document:', error)
      }
    }

    // Set up auto-save
    if (onSave && autoSaveInterval > 0) {
      const handleChange = () => {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }

        // Set new timeout for auto-save
        saveTimeoutRef.current = setTimeout(async () => {
          setIsSaving(true)
          try {
            // Wait for all resources to load
            await store.waitLoading()

            // Generate thumbnail (small preview at 0.3x scale)
            const thumbnailDataUrl = await store.toDataURL({
              pixelRatio: 0.3,
              mimeType: 'image/jpeg',
              quality: 0.8,
            })

            const json = store.toJSON()
            await onSave(json, thumbnailDataUrl)
            setLastSaved(new Date())
          } catch (error) {
            console.error('Auto-save failed:', error)
          } finally {
            setIsSaving(false)
          }
        }, autoSaveInterval)
      }

      // Listen to store changes
      const unsubscribe = store.on('change', handleChange)

      return () => {
        // Polotno's on() returns an unsubscribe function
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        }
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
      }
    }
    return undefined
  }, [store, initialDoc, onSave, autoSaveInterval])

  // Manual save function
  const handleManualSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      // Wait for all resources to load
      await store.waitLoading()

      // Generate thumbnail
      const thumbnailDataUrl = await store.toDataURL({
        pixelRatio: 0.3,
        mimeType: 'image/jpeg',
        quality: 0.8,
      })

      const json = store.toJSON()
      await onSave(json, thumbnailDataUrl)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Manual save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Export as PNG with high quality
  const handleExportPNG = async () => {
    setIsExporting(true)
    try {
      // Wait for all resources to load
      await store.waitLoading()

      // Export as PNG with 2x quality
      await store.saveAsImage({
        fileName: 'design.png',
        pixelRatio: 2, // 2x quality for high-res
        mimeType: 'image/png',
      })
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export design')
    } finally {
      setIsExporting(false)
    }
  }

  // Export as JPEG with high quality
  const handleExportJPEG = async () => {
    setIsExporting(true)
    try {
      await store.waitLoading()

      await store.saveAsImage({
        fileName: 'design.jpg',
        pixelRatio: 2,
        mimeType: 'image/jpeg',
      })
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export design')
    } finally {
      setIsExporting(false)
    }
  }

  // Export as animated GIF
  const handleExportGIF = async () => {
    setIsExporting(true)
    try {
      await store.waitLoading()
      await store.saveAsGIF()
    } catch (error) {
      console.error('GIF export failed:', error)
      alert('Failed to export as GIF')
    } finally {
      setIsExporting(false)
    }
  }

  // Export as MP4 video
  const handleExportVideo = async () => {
    setIsExportingVideo(true)
    setVideoExportProgress(0)
    try {
      await store.waitLoading()

      const videoBlob = await storeToVideo({
        store,
        fps: 30,
        pixelRatio: 2,
        onProgress: progress => {
          setVideoExportProgress(Math.round(progress * 100))
        },
      })

      // Download the video
      const url = URL.createObjectURL(videoBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'design-animation.mp4'
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Video export failed:', error)
      alert('Failed to export video. Make sure your design has animations enabled.')
    } finally {
      setIsExportingVideo(false)
      setVideoExportProgress(0)
    }
  }

  // Animation playback controls
  const handlePlay = () => {
    store.play()
    setIsPlaying(true)
  }

  const handleStop = () => {
    store.stop()
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handlePause = () => {
    store.stop()
    setIsPlaying(false)
  }

  // Update current time while playing
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentTime(store.currentTime || 0)
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, store])

  // Define custom sections: QR Code and Unsplash
  // Filter out the default 'photos' section to use our custom Unsplash panel with API key
  const sections = [
    UnsplashSection,
    QrSection,
    ...DEFAULT_SECTIONS.filter(section => section.name !== 'photos'),
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Save Status Bar */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-sm"
          >
            {isSaving ? 'Saving...' : 'Save Now'}
          </button>
          {lastSaved && (
            <span className="text-sm text-gray-600">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* Animation Playback Controls */}
          <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-2">
            {!isPlaying ? (
              <button
                onClick={handlePlay}
                className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                title="Play animations"
              >
                ▶ Play
              </button>
            ) : (
              <>
                <button
                  onClick={handlePause}
                  className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                  title="Pause"
                >
                  ⏸ Pause
                </button>
                <button
                  onClick={handleStop}
                  className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                  title="Stop"
                >
                  ⏹ Stop
                </button>
              </>
            )}
            {isPlaying && (
              <span className="text-xs text-gray-600 ml-2">{currentTime.toFixed(1)}s</span>
            )}
          </div>

          {/* Export Controls */}
          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-sm"
          >
            {isExporting ? 'Exporting...' : 'Export PNG'}
          </button>
          <button
            onClick={handleExportJPEG}
            disabled={isExporting}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-sm"
          >
            {isExporting ? 'Exporting...' : 'Export JPEG'}
          </button>
          <button
            onClick={handleExportGIF}
            disabled={isExporting}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed text-sm"
          >
            {isExporting ? 'Exporting...' : 'Export GIF'}
          </button>
          <button
            onClick={handleExportVideo}
            disabled={isExportingVideo}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-sm"
          >
            {isExportingVideo ? `Exporting Video ${videoExportProgress}%` : 'Export Video (MP4)'}
          </button>
          {(isSaving || isExporting || isExportingVideo) && (
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
          )}
        </div>
      </div>

      {/* Canvas Controls Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center space-x-4">
        {/* Rulers Toggle */}
        <button
          onClick={() => store.toggleRulers()}
          className={`px-3 py-1 text-sm rounded-md ${
            store.rulesVisible
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {store.rulesVisible ? 'Hide Rulers' : 'Show Rulers'}
        </button>

        {/* Bleed Toggle */}
        <button
          onClick={() => store.toggleBleed()}
          className={`px-3 py-1 text-sm rounded-md ${
            store.bleedVisible
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {store.bleedVisible ? 'Hide Bleed' : 'Show Bleed'}
        </button>

        {/* Unit System Selector */}
        <div className="flex items-center space-x-2">
          <label htmlFor="unit-selector" className="text-sm text-gray-700">
            Units:
          </label>
          <select
            id="unit-selector"
            className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white"
            value={store.unit || 'px'}
            onChange={e => {
              const unit = e.target.value as 'px' | 'mm' | 'cm' | 'in' | 'pt'
              store.setUnit({ unit, dpi: 300 })
            }}
          >
            <option value="px">Pixels (px)</option>
            <option value="mm">Millimeters (mm)</option>
            <option value="cm">Centimeters (cm)</option>
            <option value="in">Inches (in)</option>
            <option value="pt">Points (pt)</option>
          </select>
        </div>

        {/* Info about Magic Resize */}
        <div className="ml-auto text-xs text-gray-600">
          💡 Tip: Magic Resize is enabled - resize canvas with proportional scaling using
          store.setSize(w, h, true)
        </div>
      </div>

      {/* Polotno Editor */}
      <div className="flex-1 overflow-hidden">
        <PolotnoContainer className="h-full">
          <SidePanelWrap>
            <SidePanel store={store} sections={sections} />
          </SidePanelWrap>
          <WorkspaceWrap>
            <Toolbar store={store} downloadButtonEnabled />
            <Workspace store={store} />
            <ZoomButtons store={store} />
            <PagesTimeline store={store} />
          </WorkspaceWrap>
        </PolotnoContainer>
      </div>
    </div>
  )
})
