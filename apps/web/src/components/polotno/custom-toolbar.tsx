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
    const downloadMenu = (
      <Menu>
        <MenuItem
          text={isExporting ? 'Exporting...' : 'Export PNG'}
          onClick={onExportPNG}
          disabled={isExporting || isExportingVideo}
          icon="media"
        />
        <MenuItem
          text={isExporting ? 'Exporting...' : 'Export JPEG'}
          onClick={onExportJPEG}
          disabled={isExporting || isExportingVideo}
          icon="media"
        />
        <MenuItem
          text={isExporting ? 'Exporting...' : 'Export GIF'}
          onClick={onExportGIF}
          disabled={isExporting || isExportingVideo}
          icon="film"
        />
        <MenuItem
          text={
            isExportingVideo ? `Exporting Video ${videoExportProgress}%` : 'Export Video (MP4)'
          }
          onClick={onExportVideo}
          disabled={isExporting || isExportingVideo}
          icon="video"
        />
      </Menu>
    )

    return (
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {/* Default Polotno Toolbar */}
        <Toolbar store={store} downloadButtonEnabled={false} />

        {/* Custom Download Menu */}
        <Popover content={downloadMenu} position={Position.BOTTOM_RIGHT}>
          <Button
            icon="download"
            text="Download"
            minimal
            disabled={isExporting || isExportingVideo}
            loading={isExporting || isExportingVideo}
          />
        </Popover>
      </div>
    )
  }
)
