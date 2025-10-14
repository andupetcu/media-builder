/**
 * Utilities for working with design template variables
 */

export type VariableType = 'text' | 'number' | 'date' | 'currency' | 'image' | 'url'

export interface DesignVariable {
  name: string
  type: VariableType
  label: string
  sampleValue?: string
  defaultValue?: string
  constraints?: {
    maxLength?: number
    minLength?: number
    pattern?: string
    required?: boolean
  }
}

export interface VariableRegistry {
  variables: DesignVariable[]
}

/**
 * Validate variable name (alphanumeric and underscores only)
 */
export function isValidVariableName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

/**
 * Extract all variables from text using {variableName} pattern
 */
export function extractVariablesFromText(text: string): string[] {
  const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g
  const matches = text.matchAll(pattern)
  const variables = new Set<string>()

  for (const match of matches) {
    variables.add(match[1])
  }

  return Array.from(variables)
}

/**
 * Extract all variables from a design JSON
 */
export function extractVariablesFromDesign(designJson: any): {
  textVariables: string[]
  imageVariables: string[]
} {
  const textVariables = new Set<string>()
  const imageVariables = new Set<string>()

  const forEveryChild = (node: any, callback: (node: any) => void) => {
    if (node.children) {
      node.children.forEach((child: any) => {
        callback(child)
        forEveryChild(child, callback)
      })
    }
  }

  if (designJson.pages) {
    designJson.pages.forEach((page: any) => {
      forEveryChild(page, element => {
        // Extract text variables
        if (element.type === 'text' && element.text) {
          const vars = extractVariablesFromText(element.text)
          vars.forEach(v => textVariables.add(v))
        }

        // Extract image variables
        if (element.type === 'image' && element.custom?.variable) {
          imageVariables.add(element.custom.variable)
        }
      })
    })
  }

  return {
    textVariables: Array.from(textVariables),
    imageVariables: Array.from(imageVariables),
  }
}

/**
 * Validate that all used variables are defined in the registry
 */
export function validateVariables(
  designJson: any,
  registry: VariableRegistry
): {
  valid: boolean
  undefinedVariables: string[]
  unusedVariables: string[]
} {
  const { textVariables, imageVariables } = extractVariablesFromDesign(designJson)
  const usedVariables = new Set([...textVariables, ...imageVariables])
  const definedVariables = new Set(registry.variables.map(v => v.name))

  const undefinedVariables = Array.from(usedVariables).filter(v => !definedVariables.has(v))
  const unusedVariables = Array.from(definedVariables).filter(v => !usedVariables.has(v))

  return {
    valid: undefinedVariables.length === 0,
    undefinedVariables,
    unusedVariables,
  }
}

/**
 * Get default variable registry from design JSON
 */
export function getVariableRegistry(designJson: any): VariableRegistry {
  // Check top-level variables first
  if (designJson.variables && Array.isArray(designJson.variables)) {
    return { variables: designJson.variables }
  }

  // Check if variables are stored in the first page's custom data (for Polotno compatibility)
  if (designJson.pages && designJson.pages.length > 0) {
    const firstPage = designJson.pages[0]
    if (firstPage.custom?.variables && Array.isArray(firstPage.custom.variables)) {
      return { variables: firstPage.custom.variables }
    }
  }

  return { variables: [] }
}

/**
 * Update variable registry in design JSON
 */
export function updateVariableRegistry(designJson: any, registry: VariableRegistry): any {
  return {
    ...designJson,
    variables: registry.variables,
  }
}

/**
 * Format variable for display in UI
 */
export function formatVariableForDisplay(variable: DesignVariable): string {
  const typeLabel = variable.type.charAt(0).toUpperCase() + variable.type.slice(1)
  return `{${variable.name}} - ${typeLabel}`
}

/**
 * Get variable type icon/emoji
 */
export function getVariableTypeIcon(type: VariableType): string {
  switch (type) {
    case 'text':
      return 'T'
    case 'number':
      return '#'
    case 'date':
      return '📅'
    case 'currency':
      return '$'
    case 'image':
      return '🖼️'
    case 'url':
      return '🔗'
    default:
      return '?'
  }
}

/**
 * Create a new variable with defaults
 */
export function createVariable(
  name: string,
  type: VariableType = 'text',
  label?: string
): DesignVariable {
  return {
    name,
    type,
    label: label || name,
    sampleValue: '',
    defaultValue: '',
    constraints: {},
  }
}
