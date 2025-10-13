'use client'

import { useEffect, useRef, useState } from 'react'
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno'
import { Toolbar } from 'polotno/toolbar/toolbar'
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons'
import { SidePanel } from 'polotno/side-panel'
import { Workspace } from 'polotno/canvas/workspace'
import { createStore } from 'polotno/model/store'
import '@blueprintjs/core/lib/css/blueprint.css'

interface PolotnoEditorProps {
  initialDoc?: any
  polotnoKey: string
  onSave?: (json: any) => void
  autoSaveInterval?: number
}

export function PolotnoEditor({
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
          {isSaving && (
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
          )}
        </div>
      </div>

      {/* Polotno Editor */}
      <div className="flex-1 overflow-hidden">
        <PolotnoContainer className="h-full">
          <SidePanelWrap>
            <SidePanel store={store} />
          </SidePanelWrap>
          <WorkspaceWrap>
            <Toolbar store={store} />
            <Workspace store={store} />
            <ZoomButtons store={store} />
          </WorkspaceWrap>
        </PolotnoContainer>
      </div>
    </div>
  )
}
