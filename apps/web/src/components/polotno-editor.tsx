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
import { TeamImagesSection } from './polotno/team-images-panel'
import { TeamUploadSection } from './polotno/team-upload-panel'
import { QrSection } from './polotno/qr-code-panel'
import '@blueprintjs/core/lib/css/blueprint.css'

interface PolotnoEditorProps {
  initialDoc?: any
  polotnoKey: string
  onSave?: (json: any) => void
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
            const json = store.toJSON()
            await onSave(json)
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
      const json = store.toJSON()
      await onSave(json)
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

  // Define custom sections including Team Images, Upload, and QR Code
  const sections = [TeamUploadSection, TeamImagesSection, QrSection, ...DEFAULT_SECTIONS]

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
          {(isSaving || isExporting) && (
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
            store.rulersVisible
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {store.rulersVisible ? 'Hide Rulers' : 'Show Rulers'}
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
              if (unit === 'px') {
                store.setUnit({ unit: 'px' })
              } else {
                store.setUnit({ unit, dpi: 300 })
              }
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
          💡 Tip: Magic Resize is enabled - resize canvas with proportional scaling using store.setSize(w, h,
          true)
        </div>
      </div>

      {/* Polotno Editor */}
      <div className="flex-1 overflow-hidden">
        <PolotnoContainer className="h-full">
          <SidePanelWrap>
            <SidePanel store={store} sections={sections} defaultSection="team-upload" />
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
