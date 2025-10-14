'use client'

import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { SectionTab } from 'polotno/side-panel'
import { useParams } from 'next/navigation'
import MdCode from '@meronex/icons/md/MdCode'
import {
  DesignVariable,
  VariableType,
  isValidVariableName,
  extractVariablesFromDesign,
  getVariableRegistry,
  updateVariableRegistry,
  getVariableTypeIcon,
  createVariable,
} from '@/lib/variable-utils'
import {
  parseDataFile,
  validateParsedData,
  formatFileSize,
  type ParsedData,
} from '@/lib/csv-parser'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'

interface BatchCreatePanelProps {
  store: any
}

type PanelView = 'variables' | 'upload' | 'mapping' | 'preview'

interface PreviewResult {
  rowIndex: number
  rowData: Record<string, any>
  transformedJson: any
  warnings: string[]
}

interface PreviewResponse {
  designId: string
  designName: string
  totalRows: number
  previewCount: number
  previews: PreviewResult[]
}

export const BatchCreatePanel = observer(({ store }: BatchCreatePanelProps) => {
  // View state
  const [currentView, setCurrentView] = useState<PanelView>('variables')

  // Variables state
  const [variables, setVariables] = useState<DesignVariable[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingVariable, setEditingVariable] = useState<string | null>(null)
  const [selectedImageElement, setSelectedImageElement] = useState<any>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<VariableType>('text')
  const [formLabel, setFormLabel] = useState('')
  const [formSampleValue, setFormSampleValue] = useState('')
  const [formDefaultValue, setFormDefaultValue] = useState('')
  const [formError, setFormError] = useState('')

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Load variables from design JSON
  useEffect(() => {
    const loadVariables = () => {
      const designJson = store.toJSON()
      const registry = getVariableRegistry(designJson)
      setVariables(registry.variables)
    }

    loadVariables()

    const dispose = store.on('change', loadVariables)
    return () => dispose()
  }, [store])

  // Track selected image elements
  useEffect(() => {
    const updateSelection = () => {
      const selected = store.selectedElements
      const imageElement = selected.find((el: any) => el.type === 'image')
      setSelectedImageElement(imageElement || null)
    }

    updateSelection()

    const dispose = store.on('change', updateSelection)
    return () => dispose()
  }, [store])

  // Auto-detect variables from design
  const autoDetectVariables = () => {
    const designJson = store.toJSON()
    const { textVariables, imageVariables } = extractVariablesFromDesign(designJson)
    const existingNames = new Set(variables.map(v => v.name))

    const newVariables: DesignVariable[] = []

    textVariables.forEach(varName => {
      if (!existingNames.has(varName)) {
        newVariables.push(createVariable(varName, 'text'))
      }
    })

    imageVariables.forEach(varName => {
      if (!existingNames.has(varName)) {
        newVariables.push(createVariable(varName, 'image'))
      }
    })

    if (newVariables.length > 0) {
      const updatedVariables = [...variables, ...newVariables]
      saveVariables(updatedVariables)
    } else {
      alert('No new variables detected in the design.')
    }
  }

  // Save variables to design JSON
  const saveVariables = (updatedVariables: DesignVariable[]) => {
    const designJson = store.toJSON()
    const updatedJson = updateVariableRegistry(designJson, {
      variables: updatedVariables,
    })

    store.loadJSON(updatedJson)
    setVariables(updatedVariables)
  }

  // Handle add/edit variable
  const handleSaveVariable = () => {
    setFormError('')

    if (!formName.trim()) {
      setFormError('Variable name is required')
      return
    }

    if (!isValidVariableName(formName)) {
      setFormError('Variable name must be alphanumeric with underscores only')
      return
    }

    if (!editingVariable && variables.some(v => v.name === formName)) {
      setFormError('Variable name already exists')
      return
    }

    const newVariable: DesignVariable = {
      name: formName,
      type: formType,
      label: formLabel || formName,
      sampleValue: formSampleValue,
      defaultValue: formDefaultValue,
      constraints: {},
    }

    let updatedVariables: DesignVariable[]

    if (editingVariable) {
      updatedVariables = variables.map(v => (v.name === editingVariable ? newVariable : v))
    } else {
      updatedVariables = [...variables, newVariable]
    }

    saveVariables(updatedVariables)
    resetForm()
  }

  const handleDeleteVariable = (varName: string) => {
    if (confirm(`Are you sure you want to delete variable "${varName}"?`)) {
      const updatedVariables = variables.filter(v => v.name !== varName)
      saveVariables(updatedVariables)
    }
  }

  const handleEditVariable = (variable: DesignVariable) => {
    setEditingVariable(variable.name)
    setFormName(variable.name)
    setFormType(variable.type)
    setFormLabel(variable.label)
    setFormSampleValue(variable.sampleValue || '')
    setFormDefaultValue(variable.defaultValue || '')
    setShowAddForm(true)
  }

  const resetForm = () => {
    setFormName('')
    setFormType('text')
    setFormLabel('')
    setFormSampleValue('')
    setFormDefaultValue('')
    setFormError('')
    setShowAddForm(false)
    setEditingVariable(null)
  }

  const handleInsertVariable = (varName: string) => {
    const selectedElements = store.selectedElements
    if (selectedElements.length === 0) {
      alert('Please select a text element first')
      return
    }

    const textElement = selectedElements.find((el: any) => el.type === 'text')
    if (!textElement) {
      alert('Please select a text element to insert the variable')
      return
    }

    const currentText = textElement.text || ''
    textElement.set({ text: `${currentText}{${varName}}` })
  }

  const handleMarkImageAsVariable = () => {
    if (!selectedImageElement) {
      alert('Please select an image element first')
      return
    }

    const varName = prompt('Enter variable name for this image:')
    if (!varName) return

    if (!isValidVariableName(varName)) {
      alert('Variable name must be alphanumeric with underscores only')
      return
    }

    if (variables.some(v => v.name === varName)) {
      alert('Variable name already exists')
      return
    }

    selectedImageElement.set({
      custom: {
        ...(selectedImageElement.custom || {}),
        variable: varName,
      },
    })

    const newVariable = createVariable(varName, 'image', varName)
    const updatedVariables = [...variables, newVariable]
    saveVariables(updatedVariables)
  }

  const handleUnmarkImageAsVariable = () => {
    if (!selectedImageElement) return

    const varName = selectedImageElement.custom?.variable
    if (!varName) return

    if (confirm(`Remove variable "${varName}" from this image?`)) {
      const customCopy = { ...(selectedImageElement.custom || {}) }
      delete customCopy.variable
      selectedImageElement.set({ custom: customCopy })

      const designJson = store.toJSON()
      const { imageVariables } = extractVariablesFromDesign(designJson)
      if (!imageVariables.includes(varName)) {
        const updatedVariables = variables.filter(v => v.name !== varName)
        saveVariables(updatedVariables)
      }
    }
  }

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setParsedData(null)
    setParseError(null)
    setValidationErrors([])
    setValidationWarnings([])
    setColumnMapping({})

    setIsParsingFile(true)

    try {
      const data = await parseDataFile(file, {
        maxRows: 1000,
        skipEmptyRows: true,
      })

      setParsedData(data)

      const validation = validateParsedData(data)
      setValidationErrors(validation.errors)
      setValidationWarnings(validation.warnings)

      // Auto-map columns
      const autoMapping: Record<string, string> = {}
      variables.forEach(variable => {
        const matchingColumn = data.headers.find(
          header => header.toLowerCase() === variable.name.toLowerCase()
        )
        if (matchingColumn) {
          autoMapping[variable.name] = matchingColumn
        }
      })
      setColumnMapping(autoMapping)

      // Move to mapping view if file is valid
      if (validation.valid) {
        setCurrentView('mapping')
      }
    } catch (error: any) {
      console.error('File parsing error:', error)
      setParseError(error.message)
    } finally {
      setIsParsingFile(false)
    }
  }

  const handleMappingChange = (variableName: string, columnName: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [variableName]: columnName,
    }))
  }

  const isReadyToPreview = () => {
    if (!parsedData) return false
    if (validationErrors.length > 0) return false
    const unmappedVariables = variables.filter(v => !columnMapping[v.name])
    return unmappedVariables.length === 0
  }

  const loadPreview = async () => {
    const params = useParams()
    const designId = params.id as string
    const { currentTeamId } = useTeamStore.getState()

    if (!currentTeamId || !designId || !parsedData) {
      setPreviewError('Missing required data')
      return
    }

    setIsLoadingPreview(true)
    setPreviewError(null)

    try {
      const { data } = await apiClient.post<PreviewResponse>(
        `/teams/${currentTeamId}/designs/${designId}/bulk/preview`,
        {
          rows: parsedData.rows,
          mapping: columnMapping,
          previewCount: 5, // Preview first 5 rows
        }
      )
      setPreviewData(data)
    } catch (err: any) {
      console.error('Preview failed:', err)
      setPreviewError(err.response?.data?.message || 'Failed to load preview')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Render different views
  const renderVariablesView = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '15px', borderBottom: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
          Template Variables
        </h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            {showAddForm ? 'Cancel' : '+ Add Variable'}
          </button>
          <button
            onClick={autoDetectVariables}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            🔍 Auto-Detect
          </button>
        </div>
        {variables.length > 0 && (
          <button
            onClick={() => setCurrentView('upload')}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            📊 Upload Data & Generate →
          </button>
        )}
      </div>

      {/* Selected Image Actions */}
      {selectedImageElement && (
        <div
          style={{
            padding: '12px 15px',
            background: '#E3F2FD',
            borderBottom: '1px solid #90CAF9',
          }}
        >
          <div
            style={{ fontSize: '13px', color: '#1976D2', fontWeight: '600', marginBottom: '8px' }}
          >
            🖼️ Image Selected
          </div>
          {selectedImageElement.custom?.variable ? (
            <div>
              <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                Marked as: <strong>{`{${selectedImageElement.custom.variable}}`}</strong>
              </div>
              <button
                onClick={handleUnmarkImageAsVariable}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  background: '#EF5350',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                🗑️ Remove Variable
              </button>
            </div>
          ) : (
            <button
              onClick={handleMarkImageAsVariable}
              style={{
                width: '100%',
                padding: '6px 12px',
                background: '#1976D2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              🏷️ Mark as Variable
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div
          style={{
            padding: '15px',
            borderBottom: '1px solid #e0e0e0',
            background: '#f5f5f5',
          }}
        >
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
            {editingVariable ? 'Edit Variable' : 'New Variable'}
          </h4>

          {formError && (
            <div
              style={{
                padding: '8px',
                marginBottom: '10px',
                background: '#ffebee',
                color: '#c62828',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              {formError}
            </div>
          )}

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Variable Name *
            </label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g., customerName"
              disabled={!!editingVariable}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                background: editingVariable ? '#f0f0f0' : 'white',
              }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>Type</label>
            <select
              value={formType}
              onChange={e => setFormType(e.target.value as VariableType)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="currency">Currency</option>
              <option value="image">Image URL</option>
              <option value="url">URL</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Label (display name)
            </label>
            <input
              type="text"
              value={formLabel}
              onChange={e => setFormLabel(e.target.value)}
              placeholder="e.g., Customer Name"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Sample Value (for preview)
            </label>
            <input
              type="text"
              value={formSampleValue}
              onChange={e => setFormSampleValue(e.target.value)}
              placeholder="e.g., John Doe"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Default Value
            </label>
            <input
              type="text"
              value={formDefaultValue}
              onChange={e => setFormDefaultValue(e.target.value)}
              placeholder="e.g., [Not Provided]"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSaveVariable}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              {editingVariable ? 'Update' : 'Add'}
            </button>
            <button
              onClick={resetForm}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#9E9E9E',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Variables List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
        {variables.length === 0 ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#757575',
              fontSize: '13px',
            }}
          >
            <p style={{ margin: '0 0 10px 0' }}>No variables defined yet.</p>
            <p style={{ margin: 0, fontSize: '12px' }}>
              Click "Add Variable" or "Auto-Detect" to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {variables.map(variable => (
              <div
                key={variable.name}
                style={{
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  background: 'white',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '16px',
                          width: '20px',
                          textAlign: 'center',
                        }}
                      >
                        {getVariableTypeIcon(variable.type)}
                      </span>
                      <div>
                        <div
                          style={{
                            fontWeight: '600',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            color: '#1976D2',
                          }}
                        >
                          {`{${variable.name}}`}
                        </div>
                        <div style={{ fontSize: '11px', color: '#757575' }}>{variable.label}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleInsertVariable(variable.name)}
                      style={{
                        padding: '4px 8px',
                        background: '#E3F2FD',
                        color: '#1976D2',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}
                      title="Insert into selected text"
                    >
                      Insert
                    </button>
                    <button
                      onClick={() => handleEditVariable(variable)}
                      style={{
                        padding: '4px 8px',
                        background: '#FFF3E0',
                        color: '#F57C00',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                      title="Edit variable"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteVariable(variable.name)}
                      style={{
                        padding: '4px 8px',
                        background: '#FFEBEE',
                        color: '#D32F2F',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                      title="Delete variable"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {variable.sampleValue && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '6px 8px',
                      background: '#f5f5f5',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ color: '#757575' }}>Sample:</span>{' '}
                    <span style={{ fontWeight: '500' }}>{variable.sampleValue}</span>
                  </div>
                )}

                {variable.type !== 'text' && variable.type !== 'image' && (
                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '11px',
                      color: '#757575',
                    }}
                  >
                    Type: {variable.type}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div
        style={{
          padding: '10px 15px',
          borderTop: '1px solid #e0e0e0',
          background: '#f9f9f9',
          fontSize: '11px',
          color: '#757575',
        }}
      >
        <p style={{ margin: '0 0 5px 0' }}>
          💡 <strong>Tip:</strong> Use variables in text with {'{variableName}'} syntax.
        </p>
        <p style={{ margin: 0 }}>Select a text element and click "Insert" to add a variable.</p>
      </div>
    </div>
  )

  const renderUploadView = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '15px', borderBottom: '1px solid #e0e0e0' }}>
        <button
          onClick={() => setCurrentView('variables')}
          style={{
            marginBottom: '10px',
            padding: '4px 8px',
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ← Back to Variables
        </button>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
          Upload Data File
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          Upload CSV or XLSX to generate multiple designs
        </p>
      </div>

      {/* Upload Area */}
      <div style={{ flex: 1, padding: '15px', overflow: 'auto' }}>
        <div
          style={{
            border: '2px dashed #ccc',
            borderRadius: '8px',
            padding: '30px 20px',
            textAlign: 'center',
            background: '#fafafa',
          }}
        >
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="file-upload-panel"
            disabled={isParsingFile}
          />
          <label htmlFor="file-upload-panel" style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
            {uploadedFile ? (
              <p style={{ margin: 0, color: '#2196F3', fontWeight: '500' }}>{uploadedFile.name}</p>
            ) : (
              <>
                <p style={{ margin: '0 0 5px 0', color: '#2196F3', fontWeight: '500' }}>
                  Click to upload
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: '#999' }}>
                  CSV or XLSX (max 1000 rows)
                </p>
              </>
            )}
          </label>
        </div>

        {isParsingFile && (
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                width: '30px',
                height: '30px',
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #2196F3',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>Parsing file...</p>
          </div>
        )}

        {parseError && (
          <div
            style={{
              marginTop: '15px',
              padding: '12px',
              background: '#ffebee',
              border: '1px solid #ef5350',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#c62828',
            }}
          >
            {parseError}
          </div>
        )}

        {parsedData && (
          <div
            style={{
              marginTop: '15px',
              padding: '12px',
              background: '#e3f2fd',
              border: '1px solid #2196F3',
              borderRadius: '6px',
            }}
          >
            <div
              style={{ fontSize: '13px', fontWeight: '600', color: '#1976D2', marginBottom: '8px' }}
            >
              ✓ File Parsed Successfully
            </div>
            <div style={{ fontSize: '12px', color: '#1565C0' }}>
              <div>{parsedData.rowCount} rows</div>
              <div>{parsedData.headers.length} columns</div>
              <div>{formatFileSize(parsedData.fileSize)}</div>
            </div>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div
            style={{
              marginTop: '15px',
              padding: '12px',
              background: '#ffebee',
              border: '1px solid #ef5350',
              borderRadius: '6px',
            }}
          >
            <div
              style={{ fontSize: '12px', fontWeight: '600', color: '#c62828', marginBottom: '8px' }}
            >
              Validation Errors:
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', color: '#d32f2f' }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {validationWarnings.length > 0 && (
          <div
            style={{
              marginTop: '15px',
              padding: '12px',
              background: '#fff3e0',
              border: '1px solid #ff9800',
              borderRadius: '6px',
            }}
          >
            <div
              style={{ fontSize: '12px', fontWeight: '600', color: '#e65100', marginBottom: '8px' }}
            >
              Warnings:
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', color: '#f57c00' }}>
              {validationWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )

  const renderMappingView = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '15px', borderBottom: '1px solid #e0e0e0' }}>
        <button
          onClick={() => setCurrentView('upload')}
          style={{
            marginBottom: '10px',
            padding: '4px 8px',
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ← Back to Upload
        </button>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
          Map Columns to Variables
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          Match your CSV columns to template variables
        </p>
      </div>

      {/* Mapping List */}
      <div style={{ flex: 1, padding: '15px', overflow: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {variables.map(variable => (
            <div
              key={variable.name}
              style={{
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                background: 'white',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>
                  {`{${variable.name}}`}
                </label>
                <div style={{ fontSize: '11px', color: '#666' }}>{variable.label}</div>
              </div>
              <select
                value={columnMapping[variable.name] || ''}
                onChange={e => handleMappingChange(variable.name, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '13px',
                  background: columnMapping[variable.name] ? '#e3f2fd' : 'white',
                }}
              >
                <option value="">-- Select Column --</option>
                {parsedData?.headers.map(header => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div style={{ padding: '15px', borderTop: '1px solid #e0e0e0' }}>
        <button
          onClick={() => {
            setCurrentView('preview')
            loadPreview()
          }}
          disabled={!isReadyToPreview()}
          style={{
            width: '100%',
            padding: '12px',
            background: isReadyToPreview() ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isReadyToPreview() ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          {isReadyToPreview() ? '✓ Preview & Generate' : '⚠ Map All Variables First'}
        </button>
      </div>
    </div>
  )

  const renderPreviewView = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '15px', borderBottom: '1px solid #e0e0e0' }}>
        <button
          onClick={() => setCurrentView('mapping')}
          style={{
            marginBottom: '10px',
            padding: '4px 8px',
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ← Back to Mapping
        </button>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
          Preview & Generate
        </h3>
        <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
          {previewData
            ? `Showing ${previewData.previewCount} of ${previewData.totalRows} designs`
            : `Ready to generate ${parsedData?.rowCount || 0} designs`}
        </p>
      </div>

      {/* Preview Content */}
      <div style={{ flex: 1, padding: '15px', overflow: 'auto' }}>
        {isLoadingPreview && (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #FF9800',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ marginTop: '15px', fontSize: '13px', color: '#666' }}>Loading preview...</p>
          </div>
        )}

        {previewError && (
          <div
            style={{
              padding: '15px',
              background: '#ffebee',
              borderLeft: '4px solid #f44336',
              borderRadius: '4px',
              marginBottom: '15px',
            }}
          >
            <div
              style={{ fontSize: '14px', fontWeight: '600', color: '#c62828', marginBottom: '5px' }}
            >
              Preview Error
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>{previewError}</div>
          </div>
        )}

        {previewData && !isLoadingPreview && (
          <>
            {/* Preview Results */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600' }}>
                Preview Results:
              </h4>
              {previewData.previews.map((preview, index) => (
                <div
                  key={preview.rowIndex}
                  style={{
                    marginBottom: '15px',
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      marginBottom: '8px',
                      color: '#333',
                    }}
                  >
                    Row {preview.rowIndex + 1}
                  </div>
                  <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                    {Object.entries(preview.rowData).map(([key, value]) => (
                      <div
                        key={key}
                        style={{
                          padding: '4px 0',
                          borderBottom: '1px solid #f5f5f5',
                        }}
                      >
                        <strong>{key}:</strong> {String(value)}
                      </div>
                    ))}
                  </div>
                  {preview.warnings.length > 0 && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px',
                        background: '#fff3cd',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>Warnings:</div>
                      {preview.warnings.map((warning, i) => (
                        <div key={i}>• {warning}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mapping Summary */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600' }}>
                Mapping Summary:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {variables.map(variable => (
                  <div
                    key={variable.name}
                    style={{
                      padding: '10px',
                      background: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    <strong>{`{${variable.name}}`}</strong> → {columnMapping[variable.name]}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Button */}
      <div style={{ padding: '15px', borderTop: '1px solid #e0e0e0' }}>
        <button
          onClick={() => alert('Full batch generation will be available in Phase 4')}
          disabled={!previewData || isLoadingPreview}
          style={{
            width: '100%',
            padding: '12px',
            background: previewData && !isLoadingPreview ? '#FF9800' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: previewData && !isLoadingPreview ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          🚀 Generate {previewData?.totalRows || parsedData?.rowCount || 0} Designs
        </button>
      </div>
    </div>
  )

  // Main render
  return (
    <>
      {currentView === 'variables' && renderVariablesView()}
      {currentView === 'upload' && renderUploadView()}
      {currentView === 'mapping' && renderMappingView()}
      {currentView === 'preview' && renderPreviewView()}
    </>
  )
})

// Section configuration for Polotno sidebar
export const BatchCreateSection = {
  name: 'batch-create',
  Tab: (props: any) => (
    <SectionTab name="Batch Create" {...props}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MdCode size={20} />
      </div>
    </SectionTab>
  ),
  Panel: BatchCreatePanel,
}
