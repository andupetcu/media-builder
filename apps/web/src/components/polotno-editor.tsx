'use client'

import { useEffect, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno'
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
import { TeamTemplatesSection } from './polotno/team-templates-panel'
import { BatchCreateSection } from './polotno/batch-create-panel'
import { CustomToolbar } from './polotno/custom-toolbar'
import { SaveTemplateDialog } from './polotno/save-template-dialog'
import { ImportTemplateDialog } from './polotno/import-template-dialog'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'
import { ToastContainer } from './ui/toast'
import { useToast } from '@/hooks/use-toast'
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

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoExportProgress, setVideoExportProgress] = useState(0)
  const [isExportingVideo, setIsExportingVideo] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState(false)
  const [isImportTemplateDialogOpen, setIsImportTemplateDialogOpen] = useState(false)
  const { toasts, removeToast, success, error, warning } = useToast()

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

  // Save as Template - opens dialog
  const handleSaveAsTemplate = () => {
    setIsSaveTemplateDialogOpen(true)
  }

  // Handle actual template save/update
  const handleTemplateDialogSave = async (templateId?: string, name?: string) => {
    const teamId = useTeamStore.getState().currentTeamId
    if (!teamId) {
      warning('No team selected')
      return
    }

    setIsSaving(true)
    try {
      // Wait for all resources to load
      await store.waitLoading()

      // Generate thumbnail
      const thumbnailDataUrl = await store.toDataURL({
        pixelRatio: 0.5,
        mimeType: 'image/jpeg',
        quality: 0.8,
      })

      const json = store.toJSON()

      if (templateId) {
        // Update existing template
        await apiClient.patch(`/teams/${teamId}/templates/${templateId}`, {
          doc: json,
          thumbnail: thumbnailDataUrl,
          width: store.width,
          height: store.height,
        })
        success('Template updated successfully!')
      } else {
        // Create new template
        await apiClient.post(`/teams/${teamId}/templates`, {
          name: name,
          doc: json,
          thumbnail: thumbnailDataUrl,
          width: store.width,
          height: store.height,
        })
        success('Template saved successfully!')
      }

      setIsSaveTemplateDialogOpen(false)
    } catch (err) {
      console.error('Save template failed:', err)
      error('Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle import template completion
  const handleImportComplete = (template: any) => {
    // Load the imported template into the editor
    if (template.doc) {
      store.loadJSON(template.doc)
      success(`Template "${template.name}" loaded into editor!`)
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
    } catch (err) {
      console.error('Export failed:', err)
      error('Failed to export design')
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
    } catch (err) {
      console.error('Export failed:', err)
      error('Failed to export design')
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
    } catch (err) {
      console.error('GIF export failed:', err)
      error('Failed to export as GIF')
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
    } catch (err) {
      console.error('Video export failed:', err)
      error('Failed to export video. Make sure your design has animations enabled.')
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
  // Try both 'uploads' and 'upload' as Polotno might use either
  const uploadsSection =
    defaultSections.find(s => s.name === 'uploads') ||
    defaultSections.find(s => s.name === 'upload')
  const videosSection = defaultSections.find(s => s.name === 'videos')
  const backgroundSection = defaultSections.find(s => s.name === 'background')
  const layersSection = defaultSections.find(s => s.name === 'layers')
  const sizeSection = defaultSections.find(s => s.name === 'size')

  // Build sections array in the requested order, filtering out any undefined sections
  const sections = [
    TeamTemplatesSection, // Custom team templates - first!
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
  ].filter(Boolean) as any[]

  return (
    <div className="flex flex-col h-full">
      {/* Canvas Controls Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 pr-[10px] flex items-center space-x-4">
        {/* Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="px-3 py-1 text-sm rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center space-x-1"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span>Menu</span>
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
              {onBack && (
                <button
                  onClick={() => {
                    onBack()
                    setIsMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span>Back</span>
                </button>
              )}
              {onDashboard && (
                <button
                  onClick={() => {
                    onDashboard()
                    setIsMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Dashboard
                </button>
              )}
              {onDesigns && (
                <button
                  onClick={() => {
                    onDesigns()
                    setIsMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Designs
                </button>
              )}
              {onAssets && (
                <button
                  onClick={() => {
                    onAssets()
                    setIsMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Assets
                </button>
              )}
              {onSaveVersion && (
                <button
                  onClick={() => {
                    onSaveVersion()
                    setIsMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Save Version
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
                <button
                  onClick={onCancelEditName}
                  className="p-1 text-red-600 hover:text-red-700"
                  title="Cancel"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
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

        {/* Save as Template Button */}
        <button
          onClick={handleSaveAsTemplate}
          disabled={isSaving}
          className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-sm flex items-center gap-1"
          title="Save current design as a reusable template"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          Save as Template
        </button>

        {/* Import Template Button */}
        <button
          onClick={() => setIsImportTemplateDialogOpen(true)}
          className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm flex items-center gap-1"
          title="Import a PSD file as a template"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Import Template
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
            <SidePanel store={store} sections={sections} defaultSection="team-templates" />
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

      <SaveTemplateDialog
        isOpen={isSaveTemplateDialogOpen}
        onClose={() => setIsSaveTemplateDialogOpen(false)}
        onSave={handleTemplateDialogSave}
        isSaving={isSaving}
      />

      <ImportTemplateDialog
        isOpen={isImportTemplateDialogOpen}
        onClose={() => setIsImportTemplateDialogOpen(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
})
