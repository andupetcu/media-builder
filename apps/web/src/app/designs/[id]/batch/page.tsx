'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'
import {
  parseDataFile,
  validateParsedData,
  formatFileSize,
  type ParsedData,
} from '@/lib/csv-parser'
import { extractVariablesFromDesign, type DesignVariable } from '@/lib/variable-utils'

export default function BatchGenerationPage() {
  const params = useParams()
  const router = useRouter()
  const { currentTeamId } = useTeamStore()
  const designId = params.id as string

  // Design state
  const [design, setDesign] = useState<any>(null)
  const [variables, setVariables] = useState<DesignVariable[]>([])
  const [isLoadingDesign, setIsLoadingDesign] = useState(true)

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})

  // Load design
  useEffect(() => {
    if (!currentTeamId || !designId) return

    const loadDesign = async () => {
      setIsLoadingDesign(true)
      try {
        const { data } = await apiClient.get(`/teams/${currentTeamId}/designs/${designId}`)
        setDesign(data)

        // Extract variables from design
        const vars = data.doc?.variables || []
        setVariables(vars)
      } catch (error: any) {
        console.error('Failed to load design:', error)
        alert('Failed to load design')
      } finally {
        setIsLoadingDesign(false)
      }
    }

    loadDesign()
  }, [currentTeamId, designId])

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
        maxRows: 1000, // Limit to 1000 rows
        skipEmptyRows: true,
      })

      setParsedData(data)

      // Validate data
      const validation = validateParsedData(data)
      setValidationErrors(validation.errors)
      setValidationWarnings(validation.warnings)

      // Auto-map columns if names match variable names
      const autoMapping: Record<string, string> = {}
      variables.forEach((variable) => {
        const matchingColumn = data.headers.find(
          (header) => header.toLowerCase() === variable.name.toLowerCase()
        )
        if (matchingColumn) {
          autoMapping[variable.name] = matchingColumn
        }
      })
      setColumnMapping(autoMapping)
    } catch (error: any) {
      console.error('File parsing error:', error)
      setParseError(error.message)
    } finally {
      setIsParsingFile(false)
    }
  }

  // Handle column mapping change
  const handleMappingChange = (variableName: string, columnName: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [variableName]: columnName,
    }))
  }

  // Check if ready to proceed
  const isReadyToGenerate = () => {
    if (!parsedData) return false
    if (validationErrors.length > 0) return false

    // Check if all variables are mapped
    const unmappedVariables = variables.filter((v) => !columnMapping[v.name])
    return unmappedVariables.length === 0
  }

  if (isLoadingDesign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading design...</p>
        </div>
      </div>
    )
  }

  if (!design) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Design not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => router.push(`/designs/${designId}`)}
                  className="text-sm text-gray-600 hover:text-gray-900 mb-2"
                >
                  ← Back to Design
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Batch Generation</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Design: <span className="font-medium">{design.name}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Variables Check */}
        {variables.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">No Variables Defined</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    This design doesn't have any variables defined. You need to add variables
                    before you can generate batch variations.
                  </p>
                  <button
                    onClick={() => router.push(`/editor/${designId}`)}
                    className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Go to Editor to Add Variables
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Step 1: Upload File */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Step 1: Upload Data File
              </h2>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={isParsingFile}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg
                    className="h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    {uploadedFile ? (
                      <span className="font-medium text-blue-600">{uploadedFile.name}</span>
                    ) : (
                      <>
                        <span className="font-medium text-blue-600">Click to upload</span> or
                        drag and drop
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">CSV or XLSX (max 1000 rows)</p>
                </label>
              </div>

              {isParsingFile && (
                <div className="mt-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Parsing file...</p>
                </div>
              )}

              {parseError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">{parseError}</p>
                </div>
              )}

              {parsedData && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-start">
                    <svg
                      className="h-5 w-5 text-blue-400 mt-0.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-blue-800">File Parsed Successfully</p>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          {parsedData.rowCount} rows • {parsedData.headers.length} columns •{' '}
                          {formatFileSize(parsedData.fileSize)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Validation Warnings */}
              {validationWarnings.length > 0 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h4>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Step 2: Map Columns (only show if file is parsed) */}
            {parsedData && validationErrors.length === 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Step 2: Map Columns to Variables
                </h2>

                <div className="space-y-4">
                  {variables.map((variable) => (
                    <div
                      key={variable.name}
                      className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">
                          {`{${variable.name}}`}
                        </label>
                        <p className="text-xs text-gray-500">{variable.label}</p>
                      </div>
                      <div className="flex-1">
                        <select
                          value={columnMapping[variable.name] || ''}
                          onChange={(e) => handleMappingChange(variable.name, e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="">-- Select Column --</option>
                          {parsedData.headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    onClick={() => router.push(`/designs/${designId}`)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!isReadyToGenerate()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Preview Batch
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
