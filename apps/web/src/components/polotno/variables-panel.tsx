'use client'

import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { SectionTab } from 'polotno/side-panel'
import { MdCode } from '@meronex/icons/md/MdCode'
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

interface VariablesPanelProps {
  store: any
}

export const VariablesPanel = observer(({ store }: VariablesPanelProps) => {
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

  // Load variables from design JSON
  useEffect(() => {
    const loadVariables = () => {
      const designJson = store.toJSON()
      const registry = getVariableRegistry(designJson)
      setVariables(registry.variables)
    }

    loadVariables()

    // Listen to store changes
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
    const existingNames = new Set(variables.map((v) => v.name))

    const newVariables: DesignVariable[] = []

    // Add text variables
    textVariables.forEach((varName) => {
      if (!existingNames.has(varName)) {
        newVariables.push(createVariable(varName, 'text'))
      }
    })

    // Add image variables
    imageVariables.forEach((varName) => {
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

    // Update store (this will trigger re-render)
    store.loadJSON(updatedJson)
    setVariables(updatedVariables)
  }

  // Handle add/edit variable
  const handleSaveVariable = () => {
    setFormError('')

    // Validate name
    if (!formName.trim()) {
      setFormError('Variable name is required')
      return
    }

    if (!isValidVariableName(formName)) {
      setFormError('Variable name must be alphanumeric with underscores only')
      return
    }

    // Check for duplicates (except when editing)
    if (
      !editingVariable &&
      variables.some((v) => v.name === formName)
    ) {
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
      // Update existing variable
      updatedVariables = variables.map((v) =>
        v.name === editingVariable ? newVariable : v
      )
    } else {
      // Add new variable
      updatedVariables = [...variables, newVariable]
    }

    saveVariables(updatedVariables)
    resetForm()
  }

  // Handle delete variable
  const handleDeleteVariable = (varName: string) => {
    if (confirm(`Are you sure you want to delete variable "${varName}"?`)) {
      const updatedVariables = variables.filter((v) => v.name !== varName)
      saveVariables(updatedVariables)
    }
  }

  // Handle edit variable
  const handleEditVariable = (variable: DesignVariable) => {
    setEditingVariable(variable.name)
    setFormName(variable.name)
    setFormType(variable.type)
    setFormLabel(variable.label)
    setFormSampleValue(variable.sampleValue || '')
    setFormDefaultValue(variable.defaultValue || '')
    setShowAddForm(true)
  }

  // Reset form
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

  // Insert variable into selected text element
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

    // Insert at end of text for now (cursor position not available in Polotno API)
    const currentText = textElement.text || ''
    textElement.set({ text: `${currentText}{${varName}}` })
  }

  // Mark selected image as variable
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

    // Check if variable already exists
    if (variables.some((v) => v.name === varName)) {
      alert('Variable name already exists')
      return
    }

    // Set custom.variable on the image element
    selectedImageElement.set({
      custom: {
        ...(selectedImageElement.custom || {}),
        variable: varName,
      },
    })

    // Add to variable registry
    const newVariable = createVariable(varName, 'image', varName)
    const updatedVariables = [...variables, newVariable]
    saveVariables(updatedVariables)
  }

  // Unmark image as variable
  const handleUnmarkImageAsVariable = () => {
    if (!selectedImageElement) return

    const varName = selectedImageElement.custom?.variable
    if (!varName) return

    if (confirm(`Remove variable "${varName}" from this image?`)) {
      // Remove custom.variable from the image element
      const customCopy = { ...(selectedImageElement.custom || {}) }
      delete customCopy.variable
      selectedImageElement.set({ custom: customCopy })

      // Optionally remove from registry if not used elsewhere
      const designJson = store.toJSON()
      const { imageVariables } = extractVariablesFromDesign(designJson)
      if (!imageVariables.includes(varName)) {
        const updatedVariables = variables.filter((v) => v.name !== varName)
        saveVariables(updatedVariables)
      }
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '15px', borderBottom: '1px solid #e0e0e0' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
          Template Variables
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
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
          <div style={{ fontSize: '13px', color: '#1976D2', fontWeight: '600', marginBottom: '8px' }}>
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
              onChange={(e) => setFormName(e.target.value)}
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
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Type
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as VariableType)}
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
              onChange={(e) => setFormLabel(e.target.value)}
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
              onChange={(e) => setFormSampleValue(e.target.value)}
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
              onChange={(e) => setFormDefaultValue(e.target.value)}
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
            {variables.map((variable) => (
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
                        <div style={{ fontSize: '11px', color: '#757575' }}>
                          {variable.label}
                        </div>
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
        <p style={{ margin: 0 }}>
          Select a text element and click "Insert" to add a variable.
        </p>
      </div>
    </div>
  )
})

// Section configuration for Polotno sidebar
export const VariablesSection = {
  name: 'variables',
  Tab: (props: any) => (
    <SectionTab name="Variables" {...props}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MdCode size={20} />
      </div>
    </SectionTab>
  ),
  Panel: VariablesPanel,
}
