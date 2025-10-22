'use client'

import React, { useState, useEffect } from 'react'
import { Button, InputGroup, HTMLSelect, Spinner } from '@blueprintjs/core'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'
import { ToastContainer } from '@/components/ui/toast'
import { useToast } from '@/hooks/use-toast'

interface SaveTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (templateId?: string, name?: string) => Promise<void>
  isSaving: boolean
}

interface Template {
  id: string
  name: string
  thumbnail: string
  width: number
  height: number
}

export const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving,
}) => {
  const [mode, setMode] = useState<'new' | 'update'>('new')
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const teamId = useTeamStore(state => state.currentTeamId)
  const { toasts, removeToast, warning } = useToast()

  // Load templates when dialog opens and update mode is selected
  useEffect(() => {
    if (isOpen && mode === 'update' && teamId) {
      loadTemplates()
    }
  }, [isOpen, mode, teamId])

  const loadTemplates = async () => {
    if (!teamId) return

    setLoadingTemplates(true)
    try {
      const { data } = await apiClient.get(`/teams/${teamId}/templates`, {
        params: {
          per_page: 100,
        },
      })
      setTemplates(data.items || [])
      if (data.items?.length > 0) {
        setSelectedTemplateId(data.items[0].id)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleSave = async () => {
    if (mode === 'new') {
      if (!templateName.trim()) {
        warning('Please enter a template name')
        return
      }
      await onSave(undefined, templateName)
    } else {
      if (!selectedTemplateId) {
        warning('Please select a template to update')
        return
      }
      await onSave(selectedTemplateId)
    }
  }

  const handleClose = () => {
    setMode('new')
    setTemplateName('')
    setSelectedTemplateId('')
    onClose()
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

  if (!isOpen) return null

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
          width: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
          Save as Template
        </h3>
        <div>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}
          >
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="mode"
                value="new"
                checked={mode === 'new'}
                onChange={e => setMode(e.target.value as 'new' | 'update')}
                style={{ marginRight: '8px' }}
              />
              Save as new template
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="mode"
                value="update"
                checked={mode === 'update'}
                onChange={e => setMode(e.target.value as 'new' | 'update')}
                style={{ marginRight: '8px' }}
              />
              Update existing template
            </label>
          </div>

          {mode === 'new' ? (
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>
                Template Name <span style={{ color: '#999' }}>(required)</span>
              </label>
              <InputGroup
                value={templateName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTemplateName(e.target.value)
                }
                placeholder="Enter template name..."
                autoFocus
              />
            </div>
          ) : (
            <div style={{ marginTop: '20px' }}>
              {loadingTemplates ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Spinner size={30} />
                  <p style={{ marginTop: '10px', color: '#666' }}>Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  <p>No templates found. Create a new template first.</p>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>
                    Select Template to Update
                  </label>
                  <HTMLSelect
                    value={selectedTemplateId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setSelectedTemplateId(e.target.value)
                    }
                    fill
                    style={{ marginBottom: '10px' }}
                  >
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.width}×{template.height}px)
                      </option>
                    ))}
                  </HTMLSelect>

                  {selectedTemplate && (
                    <div
                      style={{
                        marginTop: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '10px',
                        textAlign: 'center',
                      }}
                    >
                      <p style={{ marginBottom: '10px', fontWeight: 500 }}>
                        Current template preview:
                      </p>
                      <img
                        src={selectedTemplate.thumbnail}
                        alt={selectedTemplate.name}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          borderRadius: '4px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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
          <Button onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            intent="primary"
            onClick={handleSave}
            loading={isSaving}
            disabled={
              isSaving ||
              (mode === 'new' && !templateName.trim()) ||
              (mode === 'update' && (!selectedTemplateId || templates.length === 0))
            }
          >
            {mode === 'new' ? 'Save as New Template' : 'Update Template'}
          </Button>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
