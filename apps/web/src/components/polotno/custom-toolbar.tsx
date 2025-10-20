'use client'

import React from 'react'
import { observer } from 'mobx-react-lite'
import { Toolbar } from 'polotno/toolbar/toolbar'
import { Button, Menu, MenuItem, Popover, Position } from '@blueprintjs/core'

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

// Download icon SVG component
const DownloadIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentColor"
    style={{ marginRight: '4px' }}
  >
    <path d="M8.5 11.5a.5.5 0 0 1-1 0V6.707L6.354 7.854a.5.5 0 1 1-.708-.708l2-2a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 6.707V11.5z" />
    <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z" />
  </svg>
)

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
    // Define ActionControls component to be injected into the toolbar
    const ActionControls = observer(() => {
      const menuContent = (
        <Menu>
          <MenuItem
            text={isExporting ? 'Exporting...' : 'Export PNG'}
            icon="media"
            onClick={() => onExportPNG()}
            disabled={isExporting || isExportingVideo}
          />
          <MenuItem
            text={isExporting ? 'Exporting...' : 'Export JPEG'}
            icon="media"
            onClick={() => onExportJPEG()}
            disabled={isExporting || isExportingVideo}
          />
          <MenuItem
            text={isExporting ? 'Exporting...' : 'Export GIF'}
            icon="film"
            onClick={() => onExportGIF()}
            disabled={isExporting || isExportingVideo}
          />
          <MenuItem
            text={
              isExportingVideo ? `Exporting Video ${videoExportProgress}%` : 'Export Video (MP4)'
            }
            icon="video"
            onClick={() => onExportVideo()}
            disabled={isExporting || isExportingVideo}
          />
        </Menu>
      )

      return (
        <Popover content={menuContent} position={Position.BOTTOM_RIGHT}>
          <Button
            icon={<DownloadIcon />}
            intent="primary"
            disabled={isExporting || isExportingVideo}
            minimal={false}
          >
            {isExporting || isExportingVideo ? 'Exporting...' : ''}
          </Button>
        </Popover>
      )
    })

    return (
      <div style={{ paddingRight: '10px' }}>
        <Toolbar
          store={store}
          downloadButtonEnabled={false}
          components={{
            ActionControls,
          }}
        />
      </div>
    )
  }
)
