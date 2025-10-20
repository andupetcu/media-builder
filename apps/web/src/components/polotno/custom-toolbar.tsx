'use client'

import React from 'react'
import { observer } from 'mobx-react-lite'
import { Toolbar } from 'polotno/toolbar/toolbar'
// Removed Blueprint.js dependency - using simple dropdown instead

interface CustomToolbarProps {
  store: any
  onExportPNG: () => void
  onExportJPEG: () => void
  onExportGIF: () => void
  onExportVideo: () => void
  isExporting: boolean
  isExportingVideo: boolean
  videoExportProgress: number
}

export const CustomToolbar = observer(
  ({
    store,
    onExportPNG,
    onExportJPEG,
    onExportGIF,
    onExportVideo,
    isExporting,
    isExportingVideo,
    videoExportProgress,
  }: CustomToolbarProps) => {
    const [showMenu, setShowMenu] = React.useState(false)

    return (
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {/* Default Polotno Toolbar */}
        <Toolbar store={store} downloadButtonEnabled={false} />

        {/* Custom Download Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={isExporting || isExportingVideo}
            style={{
              padding: '8px 16px',
              background: isExporting || isExportingVideo ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isExporting || isExportingVideo ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isExporting || isExportingVideo ? 'Exporting...' : 'Download ▼'}
          </button>

          {showMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 1000,
                minWidth: '200px',
              }}
            >
              <button
                onClick={() => {
                  onExportPNG()
                  setShowMenu(false)
                }}
                disabled={isExporting || isExportingVideo}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: isExporting || isExportingVideo ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {isExporting ? 'Exporting...' : 'Export PNG'}
              </button>
              <button
                onClick={() => {
                  onExportJPEG()
                  setShowMenu(false)
                }}
                disabled={isExporting || isExportingVideo}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: isExporting || isExportingVideo ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {isExporting ? 'Exporting...' : 'Export JPEG'}
              </button>
              <button
                onClick={() => {
                  onExportGIF()
                  setShowMenu(false)
                }}
                disabled={isExporting || isExportingVideo}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: isExporting || isExportingVideo ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {isExporting ? 'Exporting...' : 'Export GIF'}
              </button>
              <button
                onClick={() => {
                  onExportVideo()
                  setShowMenu(false)
                }}
                disabled={isExporting || isExportingVideo}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: isExporting || isExportingVideo ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {isExportingVideo
                  ? `Exporting Video ${videoExportProgress}%`
                  : 'Export Video (MP4)'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }
)
