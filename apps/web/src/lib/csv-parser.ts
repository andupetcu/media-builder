/**
 * CSV/XLSX parsing utilities for batch generation
 */

import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export interface ParsedData {
  headers: string[]
  rows: Record<string, any>[]
  rowCount: number
  fileName: string
  fileSize: number
}

export interface ParseOptions {
  maxRows?: number
  skipEmptyRows?: boolean
}

/**
 * Parse CSV file
 */
export function parseCSV(file: File, options: ParseOptions = {}): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const { maxRows, skipEmptyRows = true } = options

    Papa.parse(file, {
      header: true,
      skipEmptyLines: skipEmptyRows,
      dynamicTyping: true, // Auto-convert numbers and booleans
      complete: (results) => {
        let rows = results.data as Record<string, any>[]

        // Limit rows if needed
        if (maxRows && rows.length > maxRows) {
          rows = rows.slice(0, maxRows)
        }

        const headers = results.meta.fields || []

        resolve({
          headers,
          rows,
          rowCount: rows.length,
          fileName: file.name,
          fileSize: file.size,
        })
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`))
      },
    })
  })
}

/**
 * Parse XLSX file
 */
export function parseXLSX(file: File, options: ParseOptions = {}): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const { maxRows, skipEmptyRows = true } = options
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          throw new Error('Failed to read file')
        }

        // Parse workbook
        const workbook = XLSX.read(data, { type: 'binary' })

        // Get first sheet
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
          throw new Error('No sheets found in workbook')
        }

        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON
        let rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: '', // Default value for empty cells
          raw: false, // Return formatted strings
        }) as Record<string, any>[]

        // Skip empty rows if requested
        if (skipEmptyRows) {
          rows = rows.filter((row) => {
            return Object.values(row).some((val) => val !== '' && val !== null)
          })
        }

        // Limit rows if needed
        if (maxRows && rows.length > maxRows) {
          rows = rows.slice(0, maxRows)
        }

        // Extract headers from first row
        const headers = rows.length > 0 ? Object.keys(rows[0]) : []

        resolve({
          headers,
          rows,
          rowCount: rows.length,
          fileName: file.name,
          fileSize: file.size,
        })
      } catch (error: any) {
        reject(new Error(`XLSX parsing failed: ${error.message}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * Parse any supported file (auto-detect CSV or XLSX)
 */
export async function parseDataFile(
  file: File,
  options: ParseOptions = {}
): Promise<ParsedData> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'csv') {
    return parseCSV(file, options)
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseXLSX(file, options)
  } else {
    throw new Error(`Unsupported file type: ${ext}. Only CSV and XLSX files are supported.`)
  }
}

/**
 * Validate parsed data
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateParsedData(data: ParsedData): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if file has rows
  if (data.rowCount === 0) {
    errors.push('File is empty - no data rows found')
  }

  // Check if file has headers
  if (data.headers.length === 0) {
    errors.push('No column headers found')
  }

  // Check for duplicate headers
  const headerSet = new Set(data.headers)
  if (headerSet.size < data.headers.length) {
    errors.push('Duplicate column headers detected')
  }

  // Check for empty headers
  const emptyHeaders = data.headers.filter((h) => !h || h.trim() === '')
  if (emptyHeaders.length > 0) {
    warnings.push(`${emptyHeaders.length} column(s) have empty headers`)
  }

  // Check row count
  if (data.rowCount > 1000) {
    warnings.push(`Large dataset: ${data.rowCount} rows. Maximum 1000 rows recommended for batch generation.`)
  }

  // Check for rows with all empty values
  const emptyRows = data.rows.filter((row) => {
    return Object.values(row).every((val) => val === '' || val === null || val === undefined)
  })
  if (emptyRows.length > 0) {
    warnings.push(`${emptyRows.length} row(s) are completely empty`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get preview of data (first N rows)
 */
export function getDataPreview(data: ParsedData, numRows: number = 5): ParsedData {
  return {
    ...data,
    rows: data.rows.slice(0, numRows),
    rowCount: Math.min(data.rowCount, numRows),
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
