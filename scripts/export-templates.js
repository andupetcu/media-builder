#!/usr/bin/env node

/**
 * CLI Script to Export Design Templates (Node.js version)
 *
 * Usage:
 *   node scripts/export-templates.js --team-id=<teamId> [--output-dir=./templates] [--format=json|individual]
 *
 * Examples:
 *   node scripts/export-templates.js --team-id=team_123 --output-dir=./my-templates
 *   node scripts/export-templates.js --team-id=team_123 --format=individual
 */

const { PrismaClient } = require('@prisma/client')
const { writeFileSync, mkdirSync, existsSync } = require('fs')
const { join } = require('path')

const prisma = new PrismaClient()

async function exportTemplates(teamId, outputDir, format) {
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
    const templates = designs.map(design => ({
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

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    teamId: null,
    outputDir: './templates',
    format: 'json',
  }

  args.forEach(arg => {
    if (arg.startsWith('--team-id=')) {
      options.teamId = arg.split('=')[1]
    } else if (arg.startsWith('--output-dir=')) {
      options.outputDir = arg.split('=')[1]
    } else if (arg.startsWith('--format=')) {
      options.format = arg.split('=')[1]
    }
  })

  return options
}

// Main execution
async function main() {
  const options = parseArgs()

  if (!options.teamId) {
    console.error('❌ --team-id is required')
    console.log(
      'Usage: node scripts/export-templates.js --team-id=<teamId> [--output-dir=./templates] [--format=json|individual]'
    )
    process.exit(1)
  }

  if (!['json', 'individual'].includes(options.format)) {
    console.error('❌ Invalid format. Use "json" or "individual"')
    process.exit(1)
  }

  await exportTemplates(options.teamId, options.outputDir, options.format)
}

main().catch(console.error)
