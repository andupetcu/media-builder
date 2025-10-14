import { Injectable } from '@nestjs/common'

export interface TransformResult {
  json: any
  warnings: string[]
}

@Injectable()
export class TemplateEngineService {
  /**
   * Deep traverse JSON tree and apply callback to each child
   */
  private forEveryChild(node: any, callback: (node: any) => void): void {
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child: any) => {
        callback(child)
        this.forEveryChild(child, callback)
      })
    }
  }

  /**
   * Replace all {variableName} patterns in text with actual data
   */
  private replaceTextVariables(
    text: string,
    rowData: Record<string, any>,
    mapping: Record<string, string>,
    warnings: string[]
  ): string {
    const variablePattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g

    console.log(`Processing text: "${text}"`)
    console.log('Available row data keys:', Object.keys(rowData))

    return text.replace(variablePattern, (match, varName) => {
      console.log(`Found variable: ${varName}`)
      const column = mapping[varName]

      if (!column) {
        console.log(`Variable ${varName} not found in mapping`)
        warnings.push(`Variable ${varName} not mapped to any column`)
        return match
      }

      const value = rowData[column]
      console.log(`Mapped ${varName} -> ${column} -> ${value}`)

      if (value === undefined || value === null || value === '') {
        warnings.push(`No data for variable ${varName} in column ${column}`)
        return ''
      }

      return String(value)
    })
  }

  /**
   * Transform a design JSON by replacing variables with row data
   */
  transformDesign(
    designJson: any,
    rowData: Record<string, any>,
    mapping: Record<string, string>
  ): TransformResult {
    // Deep clone to avoid mutating original
    const json = JSON.parse(JSON.stringify(designJson))
    const warnings: string[] = []

    // Process each page
    if (json.pages && Array.isArray(json.pages)) {
      json.pages.forEach((page: any, pageIndex: number) => {
        console.log(`Processing page ${pageIndex}, has ${page.children?.length || 0} children`)

        this.forEveryChild(page, element => {
          console.log(
            `Checking element: type=${element.type}, hasText=${!!element.text}, text="${element.text?.substring(0, 50)}"`
          )

          // Handle text variables
          if (element.type === 'text' && element.text) {
            const originalText = element.text
            const replacedText = this.replaceTextVariables(element.text, rowData, mapping, warnings)
            element.text = replacedText
            console.log(`Text replacement: "${originalText}" -> "${replacedText}"`)
          }

          // Handle image variables
          if (element.type === 'image' && element.custom?.variable) {
            const varName = element.custom.variable
            const column = mapping[varName]

            if (column && rowData[column]) {
              const imageUrl = rowData[column]

              // Validate it looks like a URL
              if (
                typeof imageUrl === 'string' &&
                (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
              ) {
                element.src = imageUrl
              } else {
                warnings.push(`Invalid image URL for variable ${varName}: ${imageUrl}`)
              }
            } else {
              warnings.push(`No image URL provided for variable ${varName}`)
            }
          }
        })
      })
    }

    return { json, warnings }
  }

  /**
   * Transform multiple rows of data
   */
  transformBatch(
    designJson: any,
    rows: Record<string, any>[],
    mapping: Record<string, string>
  ): Array<TransformResult & { rowIndex: number; rowData: Record<string, any> }> {
    return rows.map((rowData, rowIndex) => {
      const result = this.transformDesign(designJson, rowData, mapping)
      return {
        ...result,
        rowIndex,
        rowData,
      }
    })
  }
}
