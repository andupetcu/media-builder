#!/usr/bin/env tsx

/**
 * CLI Script to Export Design Templates
 *
 * Usage:
 *   npm run export-templates -- --team-id=<teamId> [--output-dir=./templates] [--format=json|individual]
 *
 * Examples:
 *   npm run export-templates -- --team-id=team_123 --output-dir=./my-templates
 *   npm run export-templates -- --team-id=team_123 --format=individual
 */

import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { program } from 'commander'

const prisma = new PrismaClient()

interface TemplateExport {
  name: string
  description: string
  width: number
  height: number
  unit: string
  doc: any
  metadata: {
    originalDesignId: string
    createdAt: Date
    updatedAt: Date
    createdBy: string
    version: string
    tags: string[]
  }
}

async function exportTemplates(teamId: string, outputDir: string, format: 'json' | 'individual') {
  console.log(`🚀 Exporting templates for team: ${teamId}`)
  console.log(`📁 Output directory: ${outputDir}`)
  console.log(`📄 Format: ${format}`)

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
    console.log(`✅ Created output directory: ${outputDir}`)
  }

  try {
    // Fetch all designs for the team
    const designs = await prisma.design.findMany({
      where: { teamId },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (designs.length === 0) {
      console.log(`⚠️  No designs found for team: ${teamId}`)
      return
    }

    console.log(`📋 Found ${designs.length} designs to export`)

    // Convert designs to templates
    const templates: TemplateExport[] = designs.map(design => ({
      name: design.name,
      description: `Template created from design: ${design.name}`,
      width: design.width,
      height: design.height,
      unit: design.unit,
      doc: design.doc,
      metadata: {
        originalDesignId: design.id,
        createdAt: design.createdAt,
        updatedAt: design.updatedAt,
        createdBy: design.createdByUser.name,
        version: '1.0.0',
        tags: [],
      },
    }))

    if (format === 'individual') {
      // Export each template as a separate file
      templates.forEach((template, index) => {
        const filename = `${template.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.json`
        const filepath = join(outputDir, filename)

        writeFileSync(filepath, JSON.stringify(template, null, 2))
        console.log(`✅ Exported: ${filename}`)
      })

      // Also create an index file
      const indexData = {
        count: templates.length,
        exportedAt: new Date().toISOString(),
        teamId,
        templates: templates.map(t => ({
          name: t.name,
          filename: `${t.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.json`,
          originalDesignId: t.metadata.originalDesignId,
          createdAt: t.metadata.createdAt,
          updatedAt: t.metadata.updatedAt,
        })),
      }

      writeFileSync(join(outputDir, 'index.json'), JSON.stringify(indexData, null, 2))
      console.log(`✅ Created index.json`)
    } else {
      // Export all templates in a single file
      const exportData = {
        templates,
        count: templates.length,
        exportedAt: new Date().toISOString(),
        teamId,
      }

      const filename = `templates_${teamId}_${new Date().toISOString().split('T')[0]}.json`
      const filepath = join(outputDir, filename)

      writeFileSync(filepath, JSON.stringify(exportData, null, 2))
      console.log(`✅ Exported all templates to: ${filename}`)
    }

    console.log(`🎉 Successfully exported ${templates.length} templates!`)
  } catch (error) {
    console.error('❌ Export failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// CLI setup
program
  .name('export-templates')
  .description('Export design templates from the database')
  .requiredOption('-t, --team-id <teamId>', 'Team ID to export templates from')
  .option('-o, --output-dir <dir>', 'Output directory for templates', './templates')
  .option(
    '-f, --format <format>',
    'Export format: json (single file) or individual (separate files)',
    'json'
  )
  .action(async options => {
    const { teamId, outputDir, format } = options

    if (!['json', 'individual'].includes(format)) {
      console.error('❌ Invalid format. Use "json" or "individual"')
      process.exit(1)
    }

    await exportTemplates(teamId, outputDir, format)
  })

program.parse()
