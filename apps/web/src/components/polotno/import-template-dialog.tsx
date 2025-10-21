'use client'

import React, { useState, useRef } from 'react'
import { Button, InputGroup, ProgressBar, Intent } from '@blueprintjs/core'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'

interface ImportTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (template: any) => void
}

const CHUNK_SIZE = 50 * 1024 * 1024 // 50MB chunks (under Cloudflare's 100MB limit)

export const ImportTemplateDialog: React.FC<ImportTemplateDialogProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [templateName, setTemplateName] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const teamId = useTeamStore(state => state.currentTeamId)

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.psd')) {
      alert('Please select a PSD file')
      return
    }

    setFile(selectedFile)
    // Auto-fill template name from filename
    const nameWithoutExt = selectedFile.name.replace(/\.psd$/i, '')
    setTemplateName(nameWithoutExt)
    setUploadProgress(0)
    setUploadStatus('')
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const uploadChunked = async () => {
    if (!file || !teamId) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus('Starting upload...')

    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

      // Step 1: Start chunked upload
      setUploadStatus(`Preparing to upload ${totalChunks} chunks...`)
      const { data: startData } = await apiClient.post(
        `/teams/${teamId}/templates/import-psd/start`,
        {
          filename: file.name,
          totalSize: file.size,
          totalChunks,
          name: templateName,
          description,
        }
      )

      const uploadId = startData.uploadId

      // Step 2: Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)

        setUploadStatus(`Uploading chunk ${i + 1} of ${totalChunks}...`)

        const chunkFormData = new FormData()
        chunkFormData.append('chunk', chunk, `chunk_${i}`)
        chunkFormData.append('uploadId', uploadId)
        chunkFormData.append('chunkIndex', i.toString())

        await apiClient.post(`/teams/${teamId}/templates/import-psd/chunk`, chunkFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        // Update progress
        const progress = Math.round(((i + 1) / totalChunks) * 90) // Reserve 10% for processing
        setUploadProgress(progress)
      }

      // Step 3: Finish upload and trigger conversion
      setUploadStatus('Processing PSD and converting to template...')
      setUploadProgress(95)

      const { data: template } = await apiClient.post(
        `/teams/${teamId}/templates/import-psd/finish`,
        {
          uploadId,
          name: templateName,
          description,
        }
      )

      setUploadProgress(100)
      setUploadStatus('Import complete!')

      // Wait a moment to show success
      await new Promise(resolve => setTimeout(resolve, 500))

      // Call completion callback
      onImportComplete(template)

      // Reset and close
      handleClose()
      alert('Template imported successfully!')
    } catch (error: any) {
      console.error('Import failed:', error)
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to import PSD file'
      alert(`Import failed: ${errorMessage}`)
      setUploadStatus('Import failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setTemplateName('')
    setDescription('')
    setUploadProgress(0)
    setUploadStatus('')
    setIsUploading(false)
    onClose()
  }

  if (!isOpen) return null

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(2) : 0
  const canImport = file && templateName.trim() && !isUploading

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          width: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
          Import PSD Template
        </h3>

        {/* File Selection Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: `2px dashed ${isDragging ? '#2196F3' : '#ddd'}`,
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            marginBottom: '20px',
            backgroundColor: isDragging ? '#f0f8ff' : '#fafafa',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".psd"
            style={{ display: 'none' }}
            onChange={e => {
              const selectedFile = e.target.files?.[0]
              if (selectedFile) handleFileSelect(selectedFile)
            }}
          />

          {file ? (
            <div>
              <svg
                style={{ width: '48px', height: '48px', margin: '0 auto 10px', color: '#4CAF50' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p style={{ margin: '8px 0', fontWeight: 600 }}>{file.name}</p>
              <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>{fileSizeMB} MB</p>
              <Button
                small
                minimal
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  setFile(null)
                  setTemplateName('')
                }}
              >
                Remove file
              </Button>
            </div>
          ) : (
            <div>
              <svg
                style={{ width: '48px', height: '48px', margin: '0 auto 10px', color: '#999' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p style={{ margin: '8px 0', color: '#666' }}>
                Drag & drop a PSD file here, or click to browse
              </p>
              <p style={{ margin: '4px 0', color: '#999', fontSize: '12px' }}>
                Supports files up to 1GB
              </p>
            </div>
          )}
        </div>

        {/* Template Metadata */}
        {file && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>
                Template Name <span style={{ color: '#f44336' }}>*</span>
              </label>
              <InputGroup
                value={templateName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTemplateName(e.target.value)
                }
                placeholder="Enter template name..."
                disabled={isUploading}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>
                Description (optional)
              </label>
              <InputGroup
                value={description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDescription(e.target.value)
                }
                placeholder="Enter template description..."
                disabled={isUploading}
              />
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '14px', color: '#666' }}>{uploadStatus}</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{uploadProgress}%</span>
            </div>
            <ProgressBar
              value={uploadProgress / 100}
              intent={uploadProgress === 100 ? Intent.SUCCESS : Intent.PRIMARY}
              stripes={uploadProgress < 100}
              animate={uploadProgress < 100}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '15px',
            borderTop: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <Button onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            intent="primary"
            onClick={uploadChunked}
            loading={isUploading}
            disabled={!canImport}
          >
            {isUploading ? 'Importing...' : 'Import Template'}
          </Button>
        </div>
      </div>
    </div>
  )
}
