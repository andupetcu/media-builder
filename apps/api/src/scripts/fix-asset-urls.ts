import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting asset URL migration...')

  const assets = await prisma.asset.findMany({
    select: {
      id: true,
      publicUrl: true,
    },
  })

  console.log(`Found ${assets.length} assets`)

  let updated = 0
  let skipped = 0

  for (const asset of assets) {
    if (!asset.publicUrl) {
      skipped++
      continue
    }

    // Check if URL already has /api/assets
    if (asset.publicUrl.includes('/api/assets/')) {
      skipped++
      continue
    }

    // Extract path and create new URL
    const urlObj = new URL(asset.publicUrl)
    const path = urlObj.pathname.replace(/^\//, '')
    const newUrl = `${urlObj.protocol}//${urlObj.host}/api/assets/${path}`

    console.log(`Updating ${asset.id}: ${asset.publicUrl} -> ${newUrl}`)

    await prisma.asset.update({
      where: { id: asset.id },
      data: { publicUrl: newUrl },
    })

    updated++
  }

  console.log(`\nMigration complete!`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Total: ${assets.length}`)
}

main()
  .catch(error => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
