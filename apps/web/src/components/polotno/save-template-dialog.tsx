'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogBody,
  DialogFooter,
  Button,
  FormGroup,
  InputGroup,
  RadioGroup,
  Radio,
  HTMLSelect,
  Spinner,
} from '@blueprintjs/core'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'

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
        alert('Please enter a template name')
        return
      }
      await onSave(undefined, templateName)
    } else {
      if (!selectedTemplateId) {
        alert('Please select a template to update')
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

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Save as Template"
      style={{ width: '500px' }}
    >
      <DialogBody>
        <RadioGroup
          selectedValue={mode}
          onChange={(e) => setMode(e.currentTarget.value as 'new' | 'update')}
        >
          <Radio label="Save as new template" value="new" />
          <Radio label="Update existing template" value="update" />
        </RadioGroup>

        {mode === 'new' ? (
          <FormGroup label="Template Name" labelInfo="(required)" style={{ marginTop: '20px' }}>
            <InputGroup
              value={templateName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTemplateName(e.target.value)
              }
              placeholder="Enter template name..."
              autoFocus
            />
          </FormGroup>
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
              <FormGroup label="Select Template to Update">
                <HTMLSelect
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
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
              </FormGroup>
            )}
          </div>
        )}
      </DialogBody>

      <DialogFooter
        actions={
          <>
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
          </>
        }
      />
    </Dialog>
  )
}
