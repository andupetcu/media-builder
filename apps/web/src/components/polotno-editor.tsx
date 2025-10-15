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
import { TeamAssetsSection } from './polotno/team-assets-panel'
import { BatchCreateSection } from './polotno/batch-create-panel'
import { CustomToolbar } from './polotno/custom-toolbar'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'
import { initializePolotnoBrandingRemoval } from '@/lib/remove-polotno-branding'
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
  designName?: string
  designStatus?: string
  isEditingName?: boolean
  editedName?: string
  onStartEditName?: () => void
  onSaveName?: () => void
  onCancelEditName?: () => void
  onEditNameChange?: (name: string) => void
  onBack?: () => void
  onSaveVersion?: () => void
  onDashboard?: () => void
  onDesigns?: () => void
  onAssets?: () => void
  onLogout?: () => void
  userName?: string
}

// Wrap with observer for reactive state
export const PolotnoEditor = observer(function PolotnoEditor({
  initialDoc,
  polotnoKey,
  onSave,
  autoSaveInterval = 20000, // 20 seconds default
  designName,
  designStatus,
  isEditingName,
  editedName,
  onStartEditName,
  onSaveName,
  onCancelEditName,
  onEditNameChange,
  onBack,
  onSaveVersion,
  onDashboard,
  onDesigns,
  onAssets,
  onLogout,
  userName,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Remove Polotno branding
  useEffect(() => {
    const cleanup = initializePolotnoBrandingRemoval()
    return cleanup
  }, [])

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

  // Define custom sections in the order requested by user
  // Order: Templates, Assets, Elements, Text, Brand, Uploads, Photos, Videos, Background, QR Code, Layers, Resize
  // Filter out the default 'photos' section to use our custom Unsplash panel with API key
  const defaultSections = DEFAULT_SECTIONS.filter(section => section.name !== 'photos')

  // Extract specific sections from DEFAULT_SECTIONS by name
  const templatesSection = defaultSections.find(s => s.name === 'templates')
  const elementsSection = defaultSections.find(s => s.name === 'elements')
  const textSection = defaultSections.find(s => s.name === 'text')
  const uploadsSection = defaultSections.find(s => s.name === 'uploads')
  const videosSection = defaultSections.find(s => s.name === 'videos')
  const backgroundSection = defaultSections.find(s => s.name === 'background')
  const layersSection = defaultSections.find(s => s.name === 'layers')
  const sizeSection = defaultSections.find(s => s.name === 'size')

  // Build sections array in the requested order, filtering out any undefined sections
  const sections = [
    templatesSection,
    TeamAssetsSection,
    elementsSection,
    textSection,
    // Brand section would go here when implemented
    uploadsSection,
    UnsplashSection, // Photos
    videosSection,
    backgroundSection,
    QrSection,
    layersSection,
    sizeSection,
    BatchCreateSection, // Add batch create at the end
  ].filter(Boolean)

  return (
    <div className="flex flex-col h-full">
      {/* Canvas Controls Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center space-x-4">
        {/* Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="px-3 py-1 text-sm rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center space-x-1"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Menu</span>
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
              {onBack && (
                <button
                  onClick={() => { onBack(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back</span>
                </button>
              )}
              {onDashboard && (
                <button
                  onClick={() => { onDashboard(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Dashboard
                </button>
              )}
              {onDesigns && (
                <button
                  onClick={() => { onDesigns(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Designs
                </button>
              )}
              {onAssets && (
                <button
                  onClick={() => { onAssets(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Assets
                </button>
              )}
              {onSaveVersion && (
                <button
                  onClick={() => { onSaveVersion(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Save Version
                </button>
              )}
              {userName && (
                <div className="px-4 py-2 text-sm text-gray-500 border-t border-gray-200">
                  {userName}
                </div>
              )}
              {onLogout && (
                <button
                  onClick={() => { onLogout(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-t border-gray-200"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>

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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Design Name and Status */}
        {designName && (
          <div className="flex items-center space-x-2">
            {isEditingName ? (
              <>
                <input
                  type="text"
                  value={editedName}
                  onChange={e => onEditNameChange?.(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onSaveName?.()
                    if (e.key === 'Escape') onCancelEditName?.()
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={onSaveName}
                  className="p-1 text-green-600 hover:text-green-700"
                  title="Save"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={onCancelEditName}
                  className="p-1 text-red-600 hover:text-red-700"
                  title="Cancel"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-gray-900">{designName}</span>
                {onStartEditName && (
                  <button
                    onClick={onStartEditName}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit name"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                )}
                {designStatus && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {designStatus}
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Save Now Button with Last Saved Tooltip */}
        <button
          onClick={handleManualSave}
          disabled={isSaving}
          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-sm"
          title={lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Save your design'}
        >
          {isSaving ? 'Saving...' : 'Save Now'}
        </button>

        {/* Animation Playback Controls */}
        {!isPlaying ? (
          <button
            onClick={handlePlay}
            className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
            title="Play animations"
          >
            ▶ Play
          </button>
        ) : (
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePause}
              className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
              title="Pause"
            >
              ⏸ Pause
            </button>
            <button
              onClick={handleStop}
              className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
              title="Stop"
            >
              ⏹ Stop
            </button>
            <span className="text-xs text-gray-600 ml-2">{currentTime.toFixed(1)}s</span>
          </div>
        )}
      </div>

      {/* Polotno Editor */}
      <div className="flex-1 overflow-hidden">
        <PolotnoContainer className="h-full">
          <SidePanelWrap>
            <SidePanel store={store} sections={sections} defaultSection="templates" />
          </SidePanelWrap>
          <WorkspaceWrap>
            <CustomToolbar
              store={store}
              onExportPNG={handleExportPNG}
              onExportJPEG={handleExportJPEG}
              onExportGIF={handleExportGIF}
              onExportVideo={handleExportVideo}
              isExporting={isExporting}
              isExportingVideo={isExportingVideo}
              videoExportProgress={videoExportProgress}
            />
            <Workspace store={store} />
            <ZoomButtons store={store} />
            <PagesTimeline store={store} />
          </WorkspaceWrap>
        </PolotnoContainer>
      </div>
    </div>
  )
})
